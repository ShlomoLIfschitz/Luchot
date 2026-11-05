// src/services/DeviceSyncPlan.ts
// Pure mapping from a Luchot event (master + its exception/tombstone rows) to the
// device-calendar events that should exist for it (Phase 3, device calendar sync).
// DeviceSyncService diffs this plan against the device_sync_map table.
//
// Runs under plain Node (`node --experimental-strip-types`) so it can be tested
// without a device: the ONLY value import is `@hebcal/core`; the schema import is
// type-only. Do not add react-native / expo / relative value imports here.
//
// Shape of the plan (occKey = device_sync_map.occ_key):
//   ''              one device event: a one-off event, or a Gregorian recurring
//                   series written once with a recurrence rule. Tombstoned and
//                   overridden dates go in `cancelDates` (written as cancelled
//                   occurrences on the device).
//   'YYYY-MM-DD'    one device event per occurrence of a Hebrew-date series
//                   (yearly / monthly), from `from` to `to` (10 years ahead).
//                   Tombstoned dates are skipped; overridden dates carry the
//                   override's content.
//   'x:YYYY-MM-DD'  the replacement event for an overridden occurrence of a
//                   Gregorian series.

import { HDate } from '@hebcal/core';
import type { CalendarEvent } from '../schemas/EventSchema';
import type { ParsedIcsEvent } from './IcsParser';

export const HEBREW_SYNC_YEARS = 10;

export type DeviceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DevicePayload {
  title: string;
  notes?: string;
  location?: string;
  allDay: boolean;
  /** ISO instant. All-day: UTC midnight of the first day. */
  startDate: string;
  /** ISO instant. All-day: UTC midnight of the day AFTER the last day (exclusive). */
  endDate: string;
  timeZone: string;
  frequency?: DeviceFrequency;
  /** Gregorian series only: YYYY-MM-DD occurrences cancelled on the device. */
  cancelDates?: string[];
}

export interface DesiredDeviceEvent {
  occKey: string;
  payload: DevicePayload;
}

export interface SyncWindow {
  /** YYYY-MM-DD, inclusive. */
  from: string;
  /** YYYY-MM-DD, inclusive. */
  to: string;
}

// ── Date helpers (all YYYY-MM-DD strings are device-local calendar dates) ─────

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function ymdParts(ymd: string): [number, number, number] {
  return [Number(ymd.slice(0, 4)), Number(ymd.slice(5, 7)), Number(ymd.slice(8, 10))];
}

/** Calendar-day arithmetic in UTC (no DST drift). */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymdParts(ymd);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

/** The sync window for Hebrew-date series: today .. today + 10 years. */
export function hebrewSyncWindow(today: Date): SyncWindow {
  const from = localDateKey(today);
  const to = `${today.getFullYear() + HEBREW_SYNC_YEARS}${from.slice(4)}`;
  return { from, to };
}

// ── Classification ────────────────────────────────────────────────────────────

/**
 * Whether a stored row is a Luchot personal event that may be written to the
 * device calendar. hebcal holidays are never stored in `events`, so they can
 * never pass; the category guard is defensive. Exception/tombstone rows are
 * not synced on their own: they are folded into their master's plan.
 */
export function isSyncableMaster(e: CalendarEvent): boolean {
  if (e.status === 'cancelled') return false;
  if (e.hebrewExtensions.isException) return false;
  if (e.hebrewExtensions.category === 'holiday') return false;
  return !!e.start.date;
}

/**
 * Whether an existing event is written when sync is turned on: every
 * recurring series (Luchot series never end, so they always have occurrences
 * ahead), and one-off events whose last day is today or later.
 */
export function isUpcoming(e: CalendarEvent, todayKey: string): boolean {
  if (e.hebrewExtensions.recurrenceType !== 'none') return true;
  const start = e.start.date;
  if (!start) return false;
  const last = e.end.date && e.end.date > start ? e.end.date : start;
  return last >= todayKey;
}

/** The calendar a recurring series follows (mirrors expandRecurringNotes). */
export function seriesCalendar(e: CalendarEvent): 'hebrew' | 'gregorian' | null {
  const ext = e.hebrewExtensions;
  switch (ext.recurrenceType) {
    case 'yearly':
    case 'monthly':
      return ext.recurrenceCalendar ?? ext.calendarType ?? 'gregorian';
    case 'daily':
    case 'weekly':
      return 'gregorian';
    default:
      return null;
  }
}

// ── Payload builders ─────────────────────────────────────────────────────────

function allDayPayloadDates(startYmd: string, lastYmd: string): { startDate: string; endDate: string } {
  const end = lastYmd >= startYmd ? lastYmd : startYmd;
  return {
    startDate: `${startYmd}T00:00:00.000Z`,
    endDate: `${addDaysYmd(end, 1)}T00:00:00.000Z`,
  };
}

/**
 * The start instant of a series' occurrence on `ymd` (what Android keys a
 * cancelled occurrence by): UTC midnight for all-day, the series' local clock
 * time on that date for timed.
 */
export function occurrenceStart(p: DevicePayload, ymd: string): string {
  return p.allDay ? `${ymd}T00:00:00.000Z` : shiftToDate(p.startDate, ymd);
}

/** Moves a timed event's local clock time onto another local date. */
function shiftToDate(iso: string, ymd: string): string {
  const src = new Date(iso);
  const [y, m, d] = ymdParts(ymd);
  return new Date(y, m - 1, d, src.getHours(), src.getMinutes(), src.getSeconds(), 0).toISOString();
}

/**
 * The device payload for one occurrence of `e` on `onDate` (defaults to the
 * event's own start date). Multi-day all-day spans keep their length.
 */
export function payloadFor(e: CalendarEvent, onDate?: string): DevicePayload {
  const startYmd = e.start.date as string;
  const date = onDate ?? startYmd;
  const base = {
    title: e.summary,
    notes: e.description ?? undefined,
    location: e.location ?? undefined,
  };
  if (!e.start.dateTime) {
    const spanDays = e.end.date && e.end.date > startYmd
      ? dayDiff(startYmd, e.end.date)
      : 0;
    return {
      ...base,
      allDay: true,
      ...allDayPayloadDates(date, addDaysYmd(date, spanDays)),
      timeZone: 'UTC',
    };
  }
  const startIso = onDate ? shiftToDate(e.start.dateTime, date) : e.start.dateTime;
  const rawEnd = e.end.dateTime ?? e.start.dateTime;
  const durationMs = Math.max(0, new Date(rawEnd).getTime() - new Date(e.start.dateTime).getTime());
  return {
    ...base,
    allDay: false,
    startDate: new Date(startIso).toISOString(),
    endDate: new Date(new Date(startIso).getTime() + durationMs).toISOString(),
    timeZone: e.start.timeZone ?? 'Asia/Jerusalem',
  };
}

function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = ymdParts(a);
  const [by, bm, bd] = ymdParts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

// ── Hebrew-date expansion ────────────────────────────────────────────────────

function hebrewToGregorianKey(year: number, month: number, day: number): string | null {
  try {
    return localDateKey(new HDate(day, month, year).greg());
  } catch {
    return null;
  }
}

/**
 * Gregorian dates (YYYY-MM-DD) of a Hebrew-date series inside `window`, never
 * before the series' own start date. Same conversion as DateService
 * .hebrewToGregorian (new HDate(day, month, year)), so the dates match what
 * Luchot itself displays.
 */
export function expandHebrewDates(e: CalendarEvent, window: SyncWindow): string[] {
  const hd = e.hebrewExtensions.hebrewDate;
  if (!hd) return [];
  const anchor = e.start.date as string;
  const lower = anchor > window.from ? anchor : window.from;
  const [fy, fm, fd] = ymdParts(lower);
  const [ty, tm, td] = ymdParts(window.to);
  const startH = new HDate(new Date(fy, fm - 1, fd));
  const endH = new HDate(new Date(ty, tm - 1, td));
  const out: string[] = [];

  if (e.hebrewExtensions.recurrenceType === 'yearly') {
    for (let y = startH.getFullYear(); y <= endH.getFullYear(); y++) {
      const key = hebrewToGregorianKey(y, hd.month, hd.day);
      if (key && key >= lower && key <= window.to) out.push(key);
    }
    return out;
  }

  // monthly
  let y = startH.getFullYear();
  let m = startH.getMonth();
  const endY = endH.getFullYear();
  const endM = endH.getMonth();
  // Hebrew months run Nisan(1)..Adar(12/13), the year turns at Tishrei(7):
  // walk with HDate itself so the order is always chronological.
  let guard = 0;
  while (guard++ < 400) {
    const key = hebrewToGregorianKey(y, m, hd.day);
    if (key && key >= lower && key <= window.to) out.push(key);
    if (y === endY && m === endM) break;
    const next = new HDate(1, m, y).add(1, 'month');
    y = next.getFullYear();
    m = next.getMonth();
  }
  return out;
}

// ── The plan ─────────────────────────────────────────────────────────────────

function exceptionDate(x: CalendarEvent): string | undefined {
  return x.hebrewExtensions.exceptionDate ?? undefined;
}

/**
 * Device events that should exist for `master`, given its exception/tombstone
 * rows. `window` bounds Hebrew-date expansion only. Returns [] when the master
 * must not be on the device (deleted, cancelled, not a personal event).
 */
export function planDeviceEvents(
  master: CalendarEvent,
  exceptions: CalendarEvent[],
  window: SyncWindow,
): DesiredDeviceEvent[] {
  if (!isSyncableMaster(master)) return [];

  const own = exceptions.filter(
    (x) => x.hebrewExtensions.recurrenceId === master.id && !!exceptionDate(x),
  );
  const tombstoned = new Set<string>();
  const overrides = new Map<string, CalendarEvent>();
  for (const x of own) {
    const d = exceptionDate(x) as string;
    if (x.status === 'cancelled') tombstoned.add(d);
    else overrides.set(d, x);
  }

  const cal = seriesCalendar(master);
  if (cal === null) {
    return [{ occKey: '', payload: payloadFor(master) }];
  }

  if (cal === 'hebrew') {
    const out: DesiredDeviceEvent[] = [];
    for (const d of expandHebrewDates(master, window)) {
      if (tombstoned.has(d)) continue;
      const ov = overrides.get(d);
      out.push({ occKey: d, payload: ov ? payloadFor(ov, d) : payloadFor(master, d) });
    }
    return out;
  }

  const cancelDates = [...new Set([...tombstoned, ...overrides.keys()])].sort();
  const series: DesiredDeviceEvent = {
    occKey: '',
    payload: {
      ...payloadFor(master),
      frequency: master.hebrewExtensions.recurrenceType as DeviceFrequency,
      cancelDates,
    },
  };
  const out = [series];
  for (const [d, ov] of [...overrides.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    out.push({ occKey: `x:${d}`, payload: payloadFor(ov, d) });
  }
  return out;
}

/**
 * Stable fingerprint of a payload; a mapping row whose hash matches needs no
 * device write. The key order is fixed here, not taken from the object.
 */
export function payloadHash(p: DevicePayload): string {
  return JSON.stringify([
    p.title, p.notes ?? null, p.location ?? null, p.allDay, p.startDate, p.endDate,
    p.timeZone, p.frequency ?? null, p.cancelDates ?? [],
  ]);
}

/**
 * A recurring device event must be deleted and written again (instead of
 * updated in place) when its cancelled dates change, or when its start moves
 * while it has cancelled dates: Android keys a cancelled occurrence by the
 * original instance time, which an update cannot remove or move.
 */
function needsRecreate(next: DevicePayload, prevHash: string): boolean {
  if (!next.frequency) return false;
  let prev: unknown[];
  try {
    prev = JSON.parse(prevHash) as unknown[];
  } catch {
    return true;
  }
  const prevStart = prev[4];
  const prevCancel = JSON.stringify(prev[8] ?? []);
  const nextCancel = JSON.stringify(next.cancelDates ?? []);
  if (prevCancel !== nextCancel) return true;
  return nextCancel !== '[]' && prevStart !== next.startDate;
}

const OCCURRENCE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export interface MappingRow {
  occKey: string;
  deviceEventId: string;
  payloadHash: string;
}

export interface SyncDiff<R extends MappingRow = MappingRow> {
  create: DesiredDeviceEvent[];
  /** Same device event, new content. */
  update: Array<{ desired: DesiredDeviceEvent; row: R }>;
  /** Recurring series whose cancelled dates changed: delete and write again. */
  recreate: Array<{ desired: DesiredDeviceEvent; row: R }>;
  remove: R[];
}

/**
 * Diff of the plan against the mapping rows. Rows for Hebrew-date occurrences
 * that are now in the past (before `window.from`) are left alone: history is
 * not rewritten when the window slides forward.
 */
export function diffPlan<R extends MappingRow>(
  desired: DesiredDeviceEvent[],
  rows: R[],
  window: SyncWindow,
): SyncDiff<R> {
  const byKey = new Map(rows.map((r) => [r.occKey, r]));
  const wanted = new Set(desired.map((d) => d.occKey));
  const diff: SyncDiff<R> = { create: [], update: [], recreate: [], remove: [] };

  for (const d of desired) {
    const row = byKey.get(d.occKey);
    if (!row) {
      diff.create.push(d);
      continue;
    }
    const hash = payloadHash(d.payload);
    if (hash === row.payloadHash) continue;
    if (needsRecreate(d.payload, row.payloadHash)) diff.recreate.push({ desired: d, row });
    else diff.update.push({ desired: d, row });
  }

  // Past occurrences are kept only while the event is still a Hebrew-date
  // series; a deleted event, or one changed to another kind, loses them all.
  const keepPast = desired.some((d) => OCCURRENCE_KEY.test(d.occKey));
  for (const r of rows) {
    if (wanted.has(r.occKey)) continue;
    const isPastOccurrence = OCCURRENCE_KEY.test(r.occKey) && r.occKey < window.from;
    if (keepPast && isPastOccurrence) continue;
    diff.remove.push(r);
  }
  return diff;
}

// ── Reading: device occurrence → the .ics import shape ───────────────────────
// The live overlay reuses the Phase 2 mapping: a device occurrence becomes a
// ParsedIcsEvent, then IcsParser.toCalendarEvent + eventToCalendarNote, exactly
// like an imported VEVENT (minus the RRULE: the device already expanded it).

export interface DeviceOccurrence {
  title?: string | null;
  notes?: string | null;
  location?: string | null;
  allDay?: boolean | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  timeZone?: string | null;
}

const UNTITLED = '(ללא כותרת)'; // = IcsParser.UNTITLED_SUMMARY (kept local: type-only import)
// Same caps as IcsParser: text from other apps' calendars is untrusted
// (security review 2026-11-03, INFO-3).
const MAX_TITLE = 500;
const MAX_NOTES = 20000;
const MAX_LOCATION = 500;

function capText(s: string | null | undefined, max: number): string | undefined {
  const t = s?.trim();
  if (!t) return undefined;
  return t.length > max ? t.slice(0, max) : t;
}

function utcDateKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/**
 * Android stores all-day events at UTC midnight with an exclusive end, so their
 * calendar dates are read in UTC; timed events are read in device-local time.
 */
export function deviceOccurrenceToParsed(o: DeviceOccurrence): ParsedIcsEvent | null {
  const start = new Date(o.startDate);
  if (isNaN(start.getTime())) return null;
  const rawEnd = o.endDate ? new Date(o.endDate) : start;
  const end = isNaN(rawEnd.getTime()) || rawEnd < start ? start : rawEnd;
  const summary = capText(o.title, MAX_TITLE) ?? UNTITLED;
  const description = capText(o.notes, MAX_NOTES);
  const location = capText(o.location, MAX_LOCATION);

  if (o.allDay) {
    const startDate = utcDateKey(start);
    const endExclusive = utcDateKey(end);
    const endDate = endExclusive > startDate ? addDaysYmd(endExclusive, -1) : startDate;
    return { summary, description, location, allDay: true, startDate, endDate };
  }
  // A timed event is placed on its start day only (as Luchot's own timed events are).
  const startDate = localDateKey(start);
  return {
    summary, description, location,
    allDay: false,
    startDate,
    endDate: startDate,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    timeZone: o.timeZone ?? undefined,
  };
}
