// src/utils/expandRecurringNotes.ts
//
// Phase 4.2-1 — Expands recurring CalendarNotes into virtual per-year
// instances that fall within a given date range.
//
// Each input recurring note may produce 0, 1, or multiple output
// instances depending on the range span (e.g., a yearly note in a
// 14-month range can produce 1 or 2 instances).
//
// Hebrew recurring notes: anchored by hebrew day + month (no year).
// We iterate Hebrew years that overlap the range and produce one
// instance per year whose Gregorian date falls within the range.
//
// Gregorian recurring notes: anchored by gregorian month + day. We
// iterate Gregorian years and produce one instance per year whose
// date falls within the range.
//
// This also fixes a latent storage-layer bug: Gregorian recurring
// notes previously stored only the original start_date and were never
// shown in subsequent years. By expanding here we restore the correct
// yearly behaviour without any schema migration.
//
// Output instances keep the original note's id — they are virtual
// placements, not separate DB records. Deletion still removes the
// whole recurring note via StorageService.deleteEvent.

import { HDate } from '@hebcal/core';
import { dateService } from '../services/DateService';
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
 */
export function expandRecurringNotes(
  recurringNotes: CalendarNote[],
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  const instances: RecurringInstance[] = [];

  for (const note of recurringNotes) {
    if (!note.recurring) continue;

    if (note.calendarType === 'hebrew') {
      instances.push(...expandHebrewRecurring(note, rangeStart, rangeEnd));
    } else {
      instances.push(...expandGregorianRecurring(note, rangeStart, rangeEnd));
    }
  }

  return instances;
}

// ── Hebrew ────────────────────────────────────────────────────────────────────

function expandHebrewRecurring(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  if (!note.hebrewDate) return [];
  const { day, month } = note.hebrewDate;

  // Derive the Hebrew years that span the range. Using HDate directly is
  // lightweight (no month-level caching, no @hebcal/core event generation).
  const startHebYear = new HDate(rangeStart).getFullYear();
  const endHebYear   = new HDate(rangeEnd).getFullYear();

  const instances: RecurringInstance[] = [];

  for (let y = startHebYear; y <= endHebYear; y++) {
    // hebrewToGregorian returns null for invalid dates (e.g., Adar II
    // in a non-leap year). Those years simply produce no instance.
    const greg = dateService.hebrewToGregorian(y, month, day);
    if (!greg) continue;

    if (greg >= rangeStart && greg <= rangeEnd) {
      instances.push({ note, date: greg });
    }
  }

  return instances;
}

// ── Gregorian ─────────────────────────────────────────────────────────────────

function expandGregorianRecurring(
  note: CalendarNote,
  rangeStart: Date,
  rangeEnd: Date,
): RecurringInstance[] {
  if (!note.gregorianDateStr) return [];

  // gregorianDateStr is "YYYY-MM-DD"; we only care about month + day.
  const [, mStr, dStr] = note.gregorianDateStr.split('-');
  const month = parseInt(mStr, 10); // 1-12
  const day   = parseInt(dStr, 10); // 1-31

  const startYear = rangeStart.getFullYear();
  const endYear   = rangeEnd.getFullYear();

  const instances: RecurringInstance[] = [];

  for (let y = startYear; y <= endYear; y++) {
    // Construct local midnight for this year/month/day.
    const candidate = new Date(y, month - 1, day);

    // Verify the date wasn't silently normalised (e.g., "Feb 30" → "Mar 2").
    // If month or day shifted, the calendar date doesn't exist this year —
    // standard "Feb 29 birthday" handling: no display in non-leap years.
    if (
      candidate.getFullYear() === y &&
      candidate.getMonth()    === month - 1 &&
      candidate.getDate()     === day
    ) {
      if (candidate >= rangeStart && candidate <= rangeEnd) {
        instances.push({ note, date: candidate });
      }
    }
  }

  return instances;
}
