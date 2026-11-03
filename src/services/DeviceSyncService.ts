// src/services/DeviceSyncService.ts
// Write-through of Luchot personal events to the one Google calendar the user
// picked (Phase 3, device calendar sync). Called after every create / edit /
// delete in useNotes, and once per launch to extend Hebrew-date series to
// 10 years ahead. What to write is computed by the pure DeviceSyncPlan; this
// file only applies the diff through expo-calendar and keeps device_sync_map
// (Luchot id ↔ device event id) current.
//
// Turning sync off stops every write here (the guard in canWrite) and touches
// nothing in Luchot's own tables. hebcal holidays are never in `events`, so
// they are never written. Events imported from an .ics file are not written
// either: they came from another calendar. Event contents are never logged.

import { ExpoCalendar, ExpoCalendarEvent, Frequency } from 'expo-calendar';
import { StorageService, type DeviceSyncMapping } from './StorageService';
import { useSettingsStore } from '../providers/SettingsProvider';
import { getPermissionState } from './DeviceCalendarService';
import {
  planDeviceEvents,
  isSyncableMaster,
  isUpcoming,
  localDateKey,
  diffPlan,
  payloadHash,
  occurrenceStart,
  hebrewSyncWindow,
  type DevicePayload,
  type DesiredDeviceEvent,
} from './DeviceSyncPlan';
import type { ModifiableEventProperties } from 'expo-calendar';

const FREQUENCY: Record<NonNullable<DevicePayload['frequency']>, Frequency> = {
  daily: Frequency.DAILY,
  weekly: Frequency.WEEKLY,
  monthly: Frequency.MONTHLY,
  yearly: Frequency.YEARLY,
};

// One sync at a time: two edits of the same event in quick succession must not
// interleave their device writes. (SQLite access is serialized separately by
// StorageService.runExclusive.)
let tail: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const result = tail.then(work, work);
  tail = result.then(() => undefined, () => undefined);
  return result;
}

async function writeCalendarId(): Promise<string | null> {
  const { syncEnabled, syncWriteCalendarId } = useSettingsStore.getState();
  if (!syncEnabled || !syncWriteCalendarId) return null;
  if ((await getPermissionState()) !== 'granted') return null;
  return syncWriteCalendarId;
}

function eventFields(p: DevicePayload): Partial<ModifiableEventProperties> {
  return {
    title: p.title,
    notes: p.notes ?? '',
    location: p.location ?? null,
    allDay: p.allDay,
    startDate: new Date(p.startDate),
    endDate: new Date(p.endDate),
    timeZone: p.timeZone,
    recurrenceRule: p.frequency ? { frequency: FREQUENCY[p.frequency] } : null,
  };
}

async function createOnDevice(calendarId: string, d: DesiredDeviceEvent): Promise<string> {
  const cal = await ExpoCalendar.get(calendarId);
  const fields = eventFields(d.payload);
  const ev = await cal.createEvent({
    ...fields,
    recurrenceRule: fields.recurrenceRule ?? undefined,
    location: fields.location ?? undefined,
  });
  for (const date of d.payload.cancelDates ?? []) {
    await ev.getOccurrenceSync({ instanceStartDate: occurrenceStart(d.payload, date) }).delete();
  }
  return ev.id;
}

/**
 * The device event a mapping row points to, only if it is still in the
 * calendar Luchot wrote it to. Guards against touching a foreign event should
 * the provider ever hand the same id to another event after ours was deleted
 * in Google (security review 2026-11-03, LOW-1).
 */
async function ownDeviceEvent(deviceEventId: string, calendarId: string): Promise<ExpoCalendarEvent | null> {
  try {
    const ev = await ExpoCalendarEvent.get(deviceEventId);
    return ev.calendarId === calendarId ? ev : null;
  } catch {
    return null;
  }
}

async function deleteOnDevice(deviceEventId: string, calendarId: string): Promise<void> {
  try {
    const ev = await ownDeviceEvent(deviceEventId, calendarId);
    if (ev) await ev.delete();
  } catch {
    // Already gone (deleted in Google, or the account was removed): nothing to do.
  }
}

async function record(luchotId: string, calendarId: string, d: DesiredDeviceEvent, deviceEventId: string): Promise<void> {
  const m: DeviceSyncMapping = {
    occKey: d.occKey,
    deviceEventId,
    calendarId,
    payloadHash: payloadHash(d.payload),
  };
  await StorageService.upsertSyncMapping(luchotId, m);
}

async function syncNow(id: string): Promise<void> {
  const calendarId = await writeCalendarId();
  if (!calendarId) return;

  const row = await StorageService.getEventById(id);
  // An exception/tombstone row belongs to its master's plan.
  const masterId = row?.hebrewExtensions.isException && row.hebrewExtensions.recurrenceId
    ? row.hebrewExtensions.recurrenceId
    : id;
  const master = masterId === id ? row : await StorageService.getEventById(masterId);

  const window = hebrewSyncWindow(new Date());
  let desired: DesiredDeviceEvent[] = [];
  if (master && !(await StorageService.isImportedEvent(master.id))) {
    const exceptions = await StorageService.getExceptionsForMaster(master.id);
    desired = planDeviceEvents(master, exceptions, window);
  }

  const rows = await StorageService.getSyncMappings(masterId);
  const diff = diffPlan(desired, rows, window);

  for (const r of diff.remove) {
    await deleteOnDevice(r.deviceEventId, r.calendarId);
    await StorageService.deleteSyncMapping(masterId, r.occKey);
  }
  for (const { desired: d, row: r } of diff.recreate) {
    await deleteOnDevice(r.deviceEventId, r.calendarId);
    await record(masterId, calendarId, d, await createOnDevice(calendarId, d));
  }
  for (const { desired: d, row: r } of diff.update) {
    const ev = await ownDeviceEvent(r.deviceEventId, r.calendarId);
    if (ev) {
      try {
        await ev.update(eventFields(d.payload)); // null fields are cleared
        await record(masterId, r.calendarId, d, r.deviceEventId);
        continue;
      } catch {
        // fall through: write it again
      }
    }
    // Deleted on the device side (or no longer ours): write it again.
    await record(masterId, calendarId, d, await createOnDevice(calendarId, d));
  }
  for (const d of diff.create) {
    await record(masterId, calendarId, d, await createOnDevice(calendarId, d));
  }
}

/**
 * Mirrors one Luchot event (a master, or any exception/tombstone row of one)
 * to the device calendar. Fire-and-forget safe: never throws, and a no-op
 * when sync is off, no write calendar is chosen, or the permission is missing.
 */
export function syncEvent(id: string): Promise<void> {
  return serialized(() => syncNow(id)).catch(() => {
    // A failed device write must never break the Luchot save that triggered it.
  });
}

/**
 * Turning sync on: writes every existing personal event that has not passed
 * yet (one-off events ending today or later, and every recurring series),
 * plus re-syncs what was written before. Events already on the device with
 * unchanged content are skipped by the hash compare, so turning sync off and
 * on again writes nothing twice. Runs in the background; never throws.
 */
export async function pushExisting(): Promise<void> {
  try {
    if (!(await writeCalendarId())) return;
    const today = localDateKey(new Date());
    const [events, imported, synced] = await Promise.all([
      StorageService.getAllEvents(),
      StorageService.getImportedEventIds(),
      StorageService.getSyncedLuchotIds(),
    ]);
    const ids = new Set(synced);
    for (const e of events) {
      if (isSyncableMaster(e) && isUpcoming(e, today) && !imported.has(e.id)) ids.add(e.id);
    }
    for (const id of ids) await syncEvent(id);
  } catch {
    // A failed read must not break turning sync on; the launch pass retries.
  }
}

/**
 * Launch pass: re-syncs every event that already has device events. Unchanged
 * events cost one hash compare each; Hebrew-date series gain the occurrences
 * that entered the 10-year window since the last launch.
 */
export async function resyncAll(): Promise<void> {
  if (!(await writeCalendarId())) return;
  const ids = await StorageService.getSyncedLuchotIds();
  for (const id of ids) await syncEvent(id);
}
