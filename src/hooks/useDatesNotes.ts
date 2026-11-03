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
import { eventToCalendarNote, overlayToCalendarNote, useOverlayKey } from './useNotes';
import { getOverlayEvents } from '../services/DeviceCalendarService';

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
  const overlayKey = useOverlayKey();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const overlayEnd = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59, 999);
        const [rangeEvents, recurringEvents, exceptionEvents, overlay] = await Promise.all([
          StorageService.getNotesInRange(rangeStart, rangeEnd),
          StorageService.getAllRecurringNotes(),
          // Fetch exception/tombstone rows for the overlay.
          // getNotesInRange and getAllRecurringNotes both filter is_exception = 0,
          // so exception rows are only reachable here — they cannot leak as
          // standalone notes through the other two queries.
          // Existing installs have zero exception rows → overlay is a no-op.
          StorageService.getExceptions(),
          // Live device-calendar overlay (Phase 3; empty while sync is off).
          // Already expanded by the device, so it joins the direct notes below.
          getOverlayEvents(rangeStart, overlayEnd),
        ]);

        if (cancelled) return;

        // Map raw CalendarEvents to CalendarNotes
        const rangeNotes     = [
          ...rangeEvents.map(eventToCalendarNote),
          ...overlay.map(overlayToCalendarNote),
        ];
        const recurringNotes = recurringEvents.map(eventToCalendarNote);
        const exceptionNotes = exceptionEvents.map(eventToCalendarNote);

        // Expand recurring notes into per-year instances within the range,
        // applying the exception/tombstone overlay.
        const instances = expandRecurringNotes(recurringNotes, rangeStart, rangeEnd, exceptionNotes);

        // Build the date-keyed map
        const map = new Map<string, CalendarNote[]>();

        // Range boundary keys for clamping multi-day spans to the visible grid.
        const rangeStartKey = startKey; // formatDateKey(rangeStart) — computed above
        const rangeEndKey   = endKey;   // formatDateKey(rangeEnd)   — computed above

        // Milliseconds per day — used for the DST-safe day iterator below.
        const MS_PER_DAY = 86400000;

        // 1. Direct (non-recurring) notes — keyed per covered day.
        //
        // Single-day: endDateStr missing or equal to gregorianDateStr → one bucket,
        //   same as before. segment is left undefined (no span styling in Slice A).
        //
        // Multi-day: endDateStr > gregorianDateStr → emit one shallow copy of the
        //   note into each day's bucket within max(start, rangeStart)..min(end, rangeEnd).
        //   Segment flags mark the true start/end days of the event regardless of
        //   clamping — the rendering layer (later slices) uses these to draw span caps.
        //
        // NOTE: recurring notes never enter this loop (getNotesInRange filters
        //   recurrence_type = 'none'). The recurring `instances` loop below is
        //   unchanged and stays single-day.
        for (const note of rangeNotes) {
          if (!note.gregorianDateStr) continue;

          const startStr = note.gregorianDateStr; // "YYYY-MM-DD" — event's own start
          const endStr   = note.endDateStr ?? startStr; // guaranteed non-null post-v6

          if (endStr <= startStr) {
            // Single-day note (or defensive: malformed end before start).
            // Bucket by gregorianDateStr — exactly the prior behavior.
            // segment left undefined to avoid churn for single-day notes.
            const bucket = map.get(startStr) ?? [];
            bucket.push(note);
            map.set(startStr, bucket);
          } else {
            // Multi-day note: clamp span to the visible grid window and iterate
            // one day at a time using millisecond arithmetic (DST-safe, same
            // pattern as expandDaily in expandRecurringNotes.ts).
            const clampedStart = startStr >= rangeStartKey ? startStr : rangeStartKey;
            const clampedEnd   = endStr   <= rangeEndKey   ? endStr   : rangeEndKey;

            // Parse clampedStart to a local-midnight Date for the iterator.
            const [sy, sm, sd] = clampedStart.split('-').map(Number);
            let cursor = new Date(sy, sm - 1, sd); // local midnight

            // Parse clampedEnd once for the loop bound.
            const [ey, em, ed] = clampedEnd.split('-').map(Number);
            const endDate = new Date(ey, em - 1, ed);

            while (cursor <= endDate) {
              const dayKey = formatDateKey(cursor);
              const copyNote: CalendarNote = {
                ...note,
                segment: {
                  isStart: dayKey === startStr, // true ONLY on the event's own start day
                  isEnd:   dayKey === endStr,   // true ONLY on the event's own end day
                },
              };
              const bucket = map.get(dayKey) ?? [];
              bucket.push(copyNote);
              map.set(dayKey, bucket);

              // Advance one day using ms arithmetic, then rebuild local parts to
              // avoid DST drift (a day may be 23 h or 25 h around clock changes).
              const next = new Date(cursor.getTime() + MS_PER_DAY);
              cursor = new Date(next.getFullYear(), next.getMonth(), next.getDate());
            }
          }
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
  }, [startKey, endKey, refreshKey, overlayKey]);

  return byDate;
}
