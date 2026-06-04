// src/utils/expandRecurringNotes.ts
//
// Phase C1 — Expands recurring CalendarNotes into virtual instances that
// fall within a given date range.
//
// Supported recurrence types:
//   yearly  — one instance per year (hebrew or gregorian calendar).
//             No lower-bound date check (preserves birthday/yahrzeit behavior).
//   monthly — one instance per month on the same day-of-month.
//             Respects anchor start date (no instances before the note existed).
//             Skips months where the day doesn't exist (e.g. day 31 in Feb,
//             or day 30 in a short Hebrew month).
//   weekly  — every 7 days from the anchor (Gregorian only).
//   daily   — every day in range on or after the anchor (Gregorian only).
//
// Calendar discriminator for monthly/yearly:
//   note.recurrenceCalendar ?? note.calendarType
//
// Composite instance ids:
//   Each emitted instance carries id = `${masterId}:${YYYY-MM-DD}` on a
//   SHALLOW COPY of the note. The shared master note object is never mutated.
//
// Exception overlay (C1):
//   An optional 4th parameter `exceptions` carries all exception/tombstone rows
//   for all masters. The overlay is keyed by `${masterId}:${YYYY-MM-DD}`.
//   - TOMBSTONE (status='cancelled'): the generated instance is skipped entirely.
//   - OVERRIDE  (status='confirmed'): the generated instance is replaced with the
//     override's content, keeping the same composite slot id so de-duplication
//     in callers remains consistent.
//   When no exceptions are passed the function behaves identically to before —
//   fully backward-compatible.
//
// Output: RecurringInstance[] = { note: CalendarNote; date: Date }[]

import { HDate } from '@hebcal/core';
import { dateService } from '../services/DateService';
import { formatDateKey } from '../utils/dateUtils';
import type { CalendarNote } from '../hooks/useNotes';

export interface RecurringInstance {
  note: CalendarNote;
  date: Date; // Gregorian date this instance falls on
}

/**
 * Expands each recurring note in `recurringNotes` into zero or more
 * virtual instances whose date falls in [rangeStart, rangeEnd] inclusive.
 *
 * Non-recurring notes (note.recurring === false) are silently skipped —
 * the caller should only pass notes from getAllRecurringNotes() which
 * guarantees recurrence_type != 'none'.
 *
 * @param exceptions  Optional array of CalendarNotes that represent
 *   exception/tombstone rows (is_exception = 1) fetched via
 *   StorageService.getExceptions(). When omitted or empty, the function
 *   behaves identically to the pre-C1 version (backward-compatible).
 *
 *   Overlay key: `${masterId}:${exceptionDate}` where masterId is the
 *   master note's real id (note.id before makeInstance stamps the composite).
 *
 *   - TOMBSTONE (status = 'cancelled'): the generated instance for that slot
 *     is dropped — it is never added to the output array.
 *   - OVERRIDE  (status = 'confirmed'): the generated instance is replaced
 *     by one built from the override note's content. The slot id is the same
 *     composite `${masterId}:${exceptionDate}` so callers' de-duplication maps
 *     remain consistent. The override's real UUID (override.id) is available on
 *     the emitted note's `recurrenceId` field — C3 can use it to target the
 *     override row for re-edit or tombstone replacement via StorageService.
 */
export function expandRecurringNotes(
  recurringNotes: CalendarNote[],
  rangeStart: Date,
  rangeEnd: Date,
  exceptions?: CalendarNote[],
): RecurringInstance[] {
  // Build the exception lookup map once, O(n) over exceptions.
  // Key: `${recurrenceId}:${exceptionDate}` — matches the composite instance id.
  // Value: the exception CalendarNote (tombstone or override).
  const exceptionMap = new Map<string, CalendarNote>();
  if (exceptions && exceptions.length > 0) {
    for (const ex of exceptions) {
      // exceptionDate and recurrenceId are on the underlying CalendarNote via
      // the eventToCalendarNote mapping (stored in gregorianDateStr / recurrenceId
      // — see CalendarNote interface). We use the dedicated fields set during mapping.
      if (ex.exceptionDate && ex.recurrenceId) {
        exceptionMap.set(`${ex.recurrenceId}:${ex.exceptionDate}`, ex);
      }
    }
  }

  const rawInstances: RecurringInstance[] = [];

  for (const note of recurringNotes) {
    if (!note.recurring) continue;

    switch (note.recurrenceType) {
      case 'yearly':
        rawInstances.push(...expandYearly(note, rangeStart, rangeEnd));
        break;
      case 'monthly':
        rawInstances.push(...expandMonthly(note, rangeStart, rangeEnd));
        break;
      case 'weekly':
        rawInstances.push(...expandWeekly(note, rangeStart, rangeEnd));
        break;
      case 'daily':
        rawInstances.push(...expandDaily(note, rangeStart, rangeEnd));
        break;
      default:
        // 'none' or unknown — skip
        break;
    }
  }

  // Apply exception overlay.
  // If the exceptionMap is empty (no exceptions fetched or none passed),
  // this loop is a simple identity pass — no overhead beyond one Map.has call per instance.
  if (exceptionMap.size === 0) {
    return rawInstances;
  }

  const instances: RecurringInstance[] = [];
  for (const inst of rawInstances) {
    // inst.note.id is the composite `${masterId}:${YYYY-MM-DD}` produced by makeInstance.
    // The masterId part is the original note.id that makeInstance received.
    // We reconstruct the lookup key from the composite: everything before the last colon
    // is the master id; the date is the last 10 characters (YYYY-MM-DD).
    const compositeId = inst.note.id; // e.g. "abc-123:2026-06-04"
    const lastColon = compositeId.lastIndexOf(':');
    if (lastColon < 0) {
      // Malformed composite id — pass through unchanged.
      instances.push(inst);
      continue;
    }
    // masterId may itself contain colons (UUID does not, but be safe).
    // Lookup key = full composite id (already equals `${masterId}:${exceptionDate}`).
    const ex = exceptionMap.get(compositeId);
    if (!ex) {
      // No exception for this slot — emit as-is.
      instances.push(inst);
      continue;
    }
    if (ex.status === 'cancelled') {
      // TOMBSTONE: skip this occurrence entirely.
      continue;
    }
    // OVERRIDE (status = 'confirmed'): emit a note built from the override's content.
    // Keep the same composite slot id for consistent de-duplication in callers.
    // Carry the override's real UUID in recurrenceId so C3 can target it.
    const overrideNote: CalendarNote = {
      ...ex,
      id: compositeId,          // slot id — keeps dedup maps consistent
      recurrenceId: ex.id,      // override's real UUID — C3 uses this for re-edit/delete
    };
    instances.push({ note: overrideNote, date: inst.date });
  }

  return instances;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a shallow-copied note with a composite id: `${masterId}:${YYYY-MM-DD}`.
 * Never mutates the shared master note object.
 */
function makeInstance(note: CalendarNote, date: Date): RecurringInstance {
  const compositeId = `${note.id}:${formatDateKey(date)}`;
  return { note: { ...note, id: compositeId }, date };
}

/**
 * Parses gregorianDateStr ("YYYY-MM-DD") into LOCAL-midnight components.
 * Returns null if the string is missing or malformed.
 */
function parseAnchorGregorian(
  gregorianDateStr: string | undefined,
): { year: number; month: number; day: number } | null {
  if (!gregorianDateStr) return null;
  const parts = gregorianDateStr.split('-');
  if (parts.length !== 3) return null;
  const year  = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10); // 1-12
  const day   = parseInt(parts[2], 10); // 1-31
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

/**
 * Builds a LOCAL-midnight Date for the given year/month/day (month is 1-based).
 * Returns null if JS silently normalises to a different date (day doesn't exist
 * in that month — e.g. Feb 30 → Mar 2).
 */
function localMidnight(y: number, m: number, d: number): Date | null {
  const candidate = new Date(y, m - 1, d);
  if (
    candidate.getFullYear() === y &&
    candidate.getMonth()    === m - 1 &&
    candidate.getDate()     === d
  ) {
    return candidate;
  }
  return null; // day doesn't exist in this month
}

// ── Yearly ────────────────────────────────────────────────────────────────────
//
// Preserves existing behavior exactly.
// Calendar discriminator: note.recurrenceCalendar ?? note.calendarType
// No lower-bound anchor check (birthdays/yahrzeits show for all years in range).

function expandYearly(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  const cal = note.recurrenceCalendar ?? note.calendarType;
  return cal === 'hebrew'
    ? expandYearlyHebrew(note, rangeStart, rangeEnd)
    : expandYearlyGregorian(note, rangeStart, rangeEnd);
}

function expandYearlyHebrew(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  if (!note.hebrewDate) return [];
  const { day, month } = note.hebrewDate;

  const startHebYear = new HDate(rangeStart).getFullYear();
  const endHebYear   = new HDate(rangeEnd).getFullYear();

  const instances: RecurringInstance[] = [];

  for (let y = startHebYear; y <= endHebYear; y++) {
    // hebrewToGregorian returns null for invalid dates (e.g., Adar II
    // in a non-leap year). Those years simply produce no instance.
    const greg = dateService.hebrewToGregorian(y, month, day);
    if (!greg) continue;

    if (greg >= rangeStart && greg <= rangeEnd) {
      instances.push(makeInstance(note, greg));
    }
  }

  return instances;
}

function expandYearlyGregorian(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  const anchor = parseAnchorGregorian(note.gregorianDateStr);
  if (!anchor) return [];

  const { month, day } = anchor;
  const startYear = rangeStart.getFullYear();
  const endYear   = rangeEnd.getFullYear();

  const instances: RecurringInstance[] = [];

  for (let y = startYear; y <= endYear; y++) {
    const candidate = localMidnight(y, month, day);
    if (!candidate) continue; // day doesn't exist in this month/year (e.g. Feb 29)

    if (candidate >= rangeStart && candidate <= rangeEnd) {
      instances.push(makeInstance(note, candidate));
    }
  }

  return instances;
}

// ── Monthly ───────────────────────────────────────────────────────────────────
//
// Same day-of-month each month within range.
// Calendar discriminator: note.recurrenceCalendar ?? note.calendarType
// Lower bound: instances must be on or after the anchor start date.
// Skips months where the day doesn't exist.

function expandMonthly(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  const cal = note.recurrenceCalendar ?? note.calendarType;
  return cal === 'hebrew'
    ? expandMonthlyHebrew(note, rangeStart, rangeEnd)
    : expandMonthlyGregorian(note, rangeStart, rangeEnd);
}

function expandMonthlyGregorian(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  const anchor = parseAnchorGregorian(note.gregorianDateStr);
  if (!anchor) return [];

  const { year: anchorYear, month: anchorMonth, day } = anchor;
  // Anchor start as a local-midnight Date for lower-bound comparison.
  const anchorDate = localMidnight(anchorYear, anchorMonth, day);
  if (!anchorDate) return [];

  const instances: RecurringInstance[] = [];

  // Iterate every month from rangeStart through rangeEnd.
  // We step by month: start at the first month of rangeStart, end at the
  // last month of rangeEnd.
  const iterYear  = rangeStart.getFullYear();
  const iterMonth = rangeStart.getMonth() + 1; // 1-based

  // Total months to iterate
  const endYear  = rangeEnd.getFullYear();
  const endMonth = rangeEnd.getMonth() + 1; // 1-based

  let y = iterYear;
  let m = iterMonth;

  while (y < endYear || (y === endYear && m <= endMonth)) {
    const candidate = localMidnight(y, m, day);
    if (candidate) {
      // Lower bound: must be on or after anchor start date
      if (candidate >= anchorDate && candidate >= rangeStart && candidate <= rangeEnd) {
        instances.push(makeInstance(note, candidate));
      }
    }
    // Advance to next month
    m++;
    if (m > 12) { m = 1; y++; }
  }

  return instances;
}

function expandMonthlyHebrew(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  if (!note.hebrewDate) return [];
  const { day, month: anchorHebMonth, year: anchorHebYear } = note.hebrewDate;

  // Build anchor start date for lower-bound check.
  // If the stored hebrew year is undefined, we cannot enforce a lower bound,
  // so we use epoch (always allow).
  const anchorDate: Date = anchorHebYear
    ? (dateService.hebrewToGregorian(anchorHebYear, anchorHebMonth, day) ?? new Date(0))
    : new Date(0);

  // We need to iterate Hebrew months overlapping the Gregorian range.
  // Strategy: iterate from the Hebrew month of rangeStart through that of rangeEnd,
  // stepping one Hebrew month at a time using HDate.
  const startHDate = new HDate(rangeStart);
  const endHDate   = new HDate(rangeEnd);

  // Starting Hebrew year/month
  let hYear  = startHDate.getFullYear();
  let hMonth = startHDate.getMonth(); // 1-based

  const endHYear  = endHDate.getFullYear();
  const endHMonth = endHDate.getMonth(); // 1-based

  const instances: RecurringInstance[] = [];

  // We iterate Hebrew months. Month numbering: 1=Nisan…12=Adar (non-leap),
  // 13=Adar II (leap). Use HDate.monthsInYear() to know when to wrap.
  while (
    hYear < endHYear ||
    (hYear === endHYear && hMonth <= endHMonth)
  ) {
    const greg = dateService.hebrewToGregorian(hYear, hMonth, day);
    if (greg) {
      if (greg >= anchorDate && greg >= rangeStart && greg <= rangeEnd) {
        instances.push(makeInstance(note, greg));
      }
    }
    // Advance to next Hebrew month
    const monthsInYear = HDate.monthsInYear(hYear);
    hMonth++;
    if (hMonth > monthsInYear) {
      hMonth = 1;
      hYear++;
    }
  }

  return instances;
}

// ── Weekly ────────────────────────────────────────────────────────────────────
//
// Every 7 days from the anchor (Gregorian only).
// Lower bound: instances must be on or after the anchor start date.

function expandWeekly(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  const anchor = parseAnchorGregorian(note.gregorianDateStr);
  if (!anchor) return [];

  const { year, month, day } = anchor;
  const anchorDate = localMidnight(year, month, day);
  if (!anchorDate) return [];

  // Effective start: the later of rangeStart and anchorDate.
  const effectiveStart = rangeStart >= anchorDate ? rangeStart : anchorDate;

  // Find the first occurrence on or after effectiveStart.
  // Distance in whole days from anchorDate to effectiveStart.
  const MS_PER_DAY = 86400000;
  const dayOffset = Math.ceil(
    (effectiveStart.getTime() - anchorDate.getTime()) / MS_PER_DAY,
  );
  // Weeks elapsed since anchor
  const weeksElapsed = Math.ceil(dayOffset / 7);
  // First candidate = anchor + weeksElapsed * 7 days
  const firstCandidateMs = anchorDate.getTime() + weeksElapsed * 7 * MS_PER_DAY;

  const instances: RecurringInstance[] = [];
  let currentMs = firstCandidateMs;

  while (currentMs <= rangeEnd.getTime()) {
    const candidate = new Date(currentMs);
    if (candidate >= rangeStart) {
      instances.push(makeInstance(note, candidate));
    }
    currentMs += 7 * MS_PER_DAY;
  }

  return instances;
}

// ── Daily ─────────────────────────────────────────────────────────────────────
//
// Every day in range on or after the anchor (Gregorian only).

function expandDaily(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  const anchor = parseAnchorGregorian(note.gregorianDateStr);
  if (!anchor) return [];

  const { year, month, day } = anchor;
  const anchorDate = localMidnight(year, month, day);
  if (!anchorDate) return [];

  // Effective start: the later of rangeStart and anchorDate.
  const effectiveStart = rangeStart >= anchorDate ? rangeStart : anchorDate;

  const instances: RecurringInstance[] = [];
  const MS_PER_DAY = 86400000;

  // Step day by day from effectiveStart to rangeEnd (both inclusive).
  // Use local-midnight construction to avoid DST drift across the iteration.
  let y = effectiveStart.getFullYear();
  let m = effectiveStart.getMonth() + 1; // 1-based
  let d = effectiveStart.getDate();

  while (true) {
    const candidate = localMidnight(y, m, d);
    if (!candidate || candidate > rangeEnd) break;

    instances.push(makeInstance(note, candidate));

    // Advance one day using millisecond arithmetic, then re-extract local parts.
    const next = new Date(candidate.getTime() + MS_PER_DAY);
    y = next.getFullYear();
    m = next.getMonth() + 1;
    d = next.getDate();
  }

  return instances;
}
