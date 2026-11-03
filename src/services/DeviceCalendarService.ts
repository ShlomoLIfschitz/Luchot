// src/services/DeviceCalendarService.ts
// Thin wrapper over expo-calendar for the device calendar sync (Phase 3,
// DECISIONS.md 2026-11-01): Android CalendarContract, no Google API, no
// network. The Google Calendar app's own sync adapter moves changes between
// the device and Google.
//
// Reads here: the permission state, the device calendars, and the live overlay
// of events from the calendars the user chose to show (never stored in SQLite).
// Writes live in DeviceSyncService. Event contents are never logged.
//
// No function in this file ever REQUESTS the permission except
// requestPermission(), which only the sync switch in Settings calls — a fresh
// install shows no calendar prompt.

import {
  getCalendarPermissions,
  requestCalendarPermissions,
  getCalendars,
  listEvents,
  ExpoCalendarEvent,
  CalendarAccessLevel,
  EntityTypes,
  EventStatus,
} from 'expo-calendar';
import { StorageService } from './StorageService';
import { useSettingsStore } from '../providers/SettingsProvider';
import { toCalendarEvent } from './IcsParser';
import { deviceOccurrenceToParsed } from './DeviceSyncPlan';
import type { CalendarEvent } from '../schemas/EventSchema';

export type CalendarPermissionState = 'granted' | 'denied' | 'blocked' | 'undetermined';

export interface DeviceCalendarInfo {
  id: string;
  title: string;
  color?: string;
  /** The account the calendar belongs to (the Google address for Google calendars). */
  accountName: string;
  /** Synced to Google by the Google Calendar app's sync adapter. */
  isGoogle: boolean;
  /** Google's public holiday calendars ("Holidays in Israel"): Luchot already shows holidays. */
  isHoliday: boolean;
  /** Luchot may write events to it. */
  writable: boolean;
  isPrimary: boolean;
}

export interface OverlayEvent {
  /** Mapped through the Phase 2 .ics path (IcsParser.toCalendarEvent). */
  event: CalendarEvent;
  calendarName: string;
  deviceEventId: string;
  /** ISO start of this occurrence (opens the right instance in the calendar app). */
  instanceStart: string;
}

const GOOGLE_ACCOUNT_TYPE = 'com.google';
const WRITE_LEVELS = new Set<string>([
  CalendarAccessLevel.OWNER,
  CalendarAccessLevel.EDITOR,
  CalendarAccessLevel.CONTRIBUTOR,
  CalendarAccessLevel.ROOT,
]);

function toPermissionState(r: { granted: boolean; canAskAgain: boolean; status: string }): CalendarPermissionState {
  if (r.granted) return 'granted';
  if (r.status === 'undetermined') return 'undetermined';
  return r.canAskAgain ? 'denied' : 'blocked';
}

export async function getPermissionState(): Promise<CalendarPermissionState> {
  try {
    return toPermissionState(await getCalendarPermissions());
  } catch {
    return 'undetermined';
  }
}

export async function requestPermission(): Promise<CalendarPermissionState> {
  try {
    return toPermissionState(await requestCalendarPermissions());
  } catch {
    return 'denied';
  }
}

export async function listDeviceCalendars(): Promise<DeviceCalendarInfo[]> {
  const cals = await getCalendars(EntityTypes.EVENT);
  return cals
    .filter((c) => c.isVisible !== false)
    .map((c) => {
      const owner = c.ownerAccount ?? '';
      const isGoogle = c.source?.type === GOOGLE_ACCOUNT_TYPE;
      const isHoliday = owner.includes('#holiday@');
      return {
        id: c.id,
        title: c.title || c.name || owner,
        color: c.color,
        accountName: c.source?.name ?? owner,
        isGoogle,
        isHoliday,
        writable:
          c.allowsModifications && WRITE_LEVELS.has(String(c.accessLevel ?? '')) && !isHoliday,
        isPrimary: !!c.isPrimary || (isGoogle && owner !== '' && owner === c.source?.name),
      };
    });
}

/** Google calendars Luchot can write to — the "האירועים שלי נשמרים ביומן" list. */
export function writableGoogleCalendars(cals: DeviceCalendarInfo[]): DeviceCalendarInfo[] {
  return cals.filter((c) => c.isGoogle && c.writable);
}

/** First-time defaults: show the user's own Google calendars, write to the primary one. */
export function defaultSelection(cals: DeviceCalendarInfo[]): { shown: string[]; write: string | null } {
  const writable = writableGoogleCalendars(cals);
  const primary = writable.find((c) => c.isPrimary) ?? writable[0];
  return { shown: writable.map((c) => c.id), write: primary?.id ?? null };
}

/**
 * Live overlay: occurrences in [start, end] from the calendars the user chose
 * to show. Empty when sync is off, nothing is chosen, or the permission is
 * missing. Events Luchot wrote itself are skipped (they are already shown as
 * Luchot events). Never throws: a failed read shows Luchot's own data only.
 */
export async function getOverlayEvents(start: Date, end: Date): Promise<OverlayEvent[]> {
  const { syncEnabled, syncShownCalendarIds } = useSettingsStore.getState();
  if (!syncEnabled || !syncShownCalendarIds || syncShownCalendarIds.length === 0) return [];
  try {
    if ((await getPermissionState()) !== 'granted') return [];
    const cals = await getCalendars(EntityTypes.EVENT);
    const names = new Map(cals.map((c) => [c.id, c.title || c.name || '']));
    // A chosen calendar that no longer exists (account removed) is skipped,
    // so it cannot fail the read of the others.
    const ids = syncShownCalendarIds.filter((id) => names.has(id));
    if (ids.length === 0) return [];
    const [ownIds, occurrences] = await Promise.all([
      StorageService.getSyncedDeviceEventIds(),
      listEvents(ids, start, end),
    ]);
    const nowIso = new Date().toISOString();
    const out: OverlayEvent[] = [];
    for (const o of occurrences) {
      if (o.status === EventStatus.CANCELED) continue;
      if (ownIds.has(o.id) || (o.originalId && ownIds.has(o.originalId))) continue;
      const parsed = deviceOccurrenceToParsed(o);
      if (!parsed) continue;
      const instanceStart = new Date(o.startDate).toISOString();
      out.push({
        event: toCalendarEvent(parsed, `ext:${o.id}:${instanceStart}`, nowIso),
        calendarName: names.get(o.calendarId) ?? '',
        deviceEventId: o.id,
        instanceStart,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Opens a Google/device event in the calendar app (where it is edited). */
export async function openInCalendarApp(deviceEventId: string, instanceStart: string): Promise<void> {
  try {
    const ev = await ExpoCalendarEvent.get(deviceEventId);
    await ev.openInCalendar({ instanceStartDate: instanceStart });
  } catch {
    // The event is gone or no calendar app handles it: nothing to open.
  }
}
