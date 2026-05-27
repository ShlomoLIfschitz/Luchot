// src/hooks/useDatesNotes.ts
//
// Phase 4.2-1 — Batch fetch of CalendarNotes for a date range.
// Used by MonthGrid and WeekGrid to render note tags without making
// N+1 queries (one per day cell).
//
// Returns a Map<dateKey, CalendarNote[]> where dateKey is "YYYY-MM-DD"
// (same format as StorageService start_date column — see formatDateKey).
//
// Both direct notes (start_date in range, recurrence_type = 'none')
// and recurring instances (expanded across years by expandRecurringNotes)
// are included in the map.
//
// Usage:
//   const notesByDate = useDatesNotes(rangeStart, rangeEnd);
//   const todayNotes  = notesByDate.get(formatDateKey(today)) ?? [];

import { useEffect, useState } from 'react';
import { StorageService } from '../services/StorageService';
import { expandRecurringNotes } from '../utils/expandRecurringNotes';
import { formatDateKey } from '../utils/dateUtils';
import type { CalendarNote } from './useNotes';
import { eventToCalendarNote } from './useNotes';

/**
 * Batch-loads all CalendarNotes whose effective date falls within
 * [rangeStart, rangeEnd] inclusive.
 *
 * @param rangeStart  First day of range (inclusive).
 * @param rangeEnd    Last day of range (inclusive).
 * @param refreshKey  Optional counter; increment to force a re-fetch
 *                    after a mutation (wired in Phase 4.2-2).
 */
export function useDatesNotes(
  rangeStart: Date,
  rangeEnd: Date,
  refreshKey?: number,
): Map<string, CalendarNote[]> {
  const [byDate, setByDate] = useState<Map<string, CalendarNote[]>>(
    () => new Map(),
  );

  // Stable string representations avoid reference-equality thrash:
  // Date objects from parent renders create new references on every
  // render even when they represent the same date.
  const startKey = formatDateKey(rangeStart);
  const endKey   = formatDateKey(rangeEnd);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [rangeEvents, recurringEvents] = await Promise.all([
          StorageService.getNotesInRange(rangeStart, rangeEnd),
          StorageService.getAllRecurringNotes(),
        ]);

        if (cancelled) return;

        // Map raw CalendarEvents to CalendarNotes
        const rangeNotes     = rangeEvents.map(eventToCalendarNote);
        const recurringNotes = recurringEvents.map(eventToCalendarNote);

        // Expand recurring notes into per-year instances within the range
        const instances = expandRecurringNotes(recurringNotes, rangeStart, rangeEnd);

        // Build the date-keyed map
        const map = new Map<string, CalendarNote[]>();

        // 1. Direct (non-recurring) notes — keyed by their stored start_date
        for (const note of rangeNotes) {
          if (!note.gregorianDateStr) continue;
          const key = note.gregorianDateStr; // already "YYYY-MM-DD"
          const bucket = map.get(key) ?? [];
          bucket.push(note);
          map.set(key, bucket);
        }

        // 2. Recurring instances — keyed by the computed Gregorian date
        for (const inst of instances) {
          const key = formatDateKey(inst.date);
          const bucket = map.get(key) ?? [];
          bucket.push(inst.note);
          map.set(key, bucket);
        }

        setByDate(map);
      } catch (err) {
        console.error('useDatesNotes load failed:', err);
        if (!cancelled) setByDate(new Map());
      }
    }

    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey, endKey, refreshKey]);

  return byDate;
}
