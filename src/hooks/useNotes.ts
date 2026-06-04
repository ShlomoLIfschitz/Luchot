import { useState, useEffect, useCallback } from 'react';
import { HDate } from '@hebcal/core';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import { CalendarEvent, NoteCategory, RecurrenceType } from '../schemas/EventSchema';
import { generateUUID, formatDateKey } from '../utils/dateUtils';
import type { HebrewDateInfo } from '../services/DateService';
import { expandRecurringNotes } from '../utils/expandRecurringNotes';
import { useCalendarStore } from '../providers/CalendarProvider';

export type NoteType = 'note' | 'birthday' | 'yahrzeit' | 'anniversary';

export interface CalendarNote {
  id: string;
  summary: string;
  noteType: NoteType;
  calendarType: 'hebrew' | 'gregorian';
  recurring: boolean;
  recurrenceType: RecurrenceType;
  recurrenceCalendar?: 'hebrew' | 'gregorian';
  created: string;
  hebrewDate: { day: number; month: number; year?: number; monthName: string } | undefined;
  gregorianDateStr: string | undefined;
  reminderMinutes: number | null;
  colorId?: string | null;
  location?: string | null;
  // Time fields (C2). Set for timed events; null/absent for all-day.
  startDateTime?: string | null;  // ISO 8601 with timezone (start.dateTime)
  endDateTime?: string | null;    // ISO 8601 with timezone (end.dateTime), optional
  isAllDay: boolean;              // true when start.dateTime is null (no precise time)
  // Exception/tombstone overlay fields (C1). Present only on exception rows;
  // undefined on normal notes. status mirrors CalendarEvent.status.
  status?: 'confirmed' | 'tentative' | 'cancelled';
  recurrenceId?: string;   // for exception rows: the master series id; for override slots: the override's real UUID
  exceptionDate?: string;  // ISO "YYYY-MM-DD" of the overridden occurrence
}

// Exported so useDatesNotes (Phase 4.2-1) can reuse the same mapping
// without duplicating logic. useNotes itself calls it internally too.
export function eventToCalendarNote(e: CalendarEvent): CalendarNote {
  const cat = e.hebrewExtensions.category;
  const noteType: NoteType =
    cat === 'birthday' ? 'birthday' :
    cat === 'yahrzeit' ? 'yahrzeit' :
    cat === 'anniversary' ? 'anniversary' : 'note';
  const recurrenceType = e.hebrewExtensions.recurrenceType;
  return {
    id: e.id,
    summary: e.summary,
    noteType,
    calendarType: e.hebrewExtensions.calendarType,
    recurring: recurrenceType !== 'none',
    recurrenceType,
    recurrenceCalendar: e.hebrewExtensions.recurrenceCalendar,
    created: e.created,
    hebrewDate: e.hebrewExtensions.hebrewDate,
    gregorianDateStr: e.start.date,
    reminderMinutes: e.reminders?.overrides?.[0]?.minutes ?? null,
    colorId: e.colorId ?? null,
    location: e.location ?? null,
    // Time fields (C2): derived from the Google-Calendar start/end convention.
    // isAllDay is true when start.dateTime is absent — NOT based on start.date
    // presence, because timed events also store start.date (the calendar day)
    // for day-keying in getEventsForGregorianDate (Task 4).
    startDateTime: e.start.dateTime ?? null,
    endDateTime: e.end?.dateTime ?? null,
    isAllDay: e.start.dateTime == null,
    // Exception/tombstone fields — undefined on normal rows (is_exception = 0).
    status: e.status,
    recurrenceId: e.hebrewExtensions.recurrenceId,
    exceptionDate: e.hebrewExtensions.exceptionDate,
  };
}

export function useNotes(date: Date | null) {
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const notesVersion = useCalendarStore((s) => s.notesVersion);
  const incrementNotesVersion = useCalendarStore((s) => s.incrementNotesVersion);

  useEffect(() => {
    if (!date) { setNotes([]); return; }
    const d: Date = date;
    async function load() {
      const hdate = new HDate(d);
      const [gregEvents, hebEvents, recurringEvents, exceptionEvents] = await Promise.all([
        StorageService.getEventsForGregorianDate(d),
        StorageService.getEventsForHebrewDate(hdate.getDate(), hdate.getMonth()),
        // Fetch all recurring notes so we can expand Gregorian recurring ones
        // to this specific date. Hebrew recurring are already returned by
        // getEventsForHebrewDate above; the id-keyed merge below deduplicates.
        StorageService.getAllRecurringNotes(),
        // Fetch exception/tombstone rows for the overlay.
        // Existing installs have zero such rows → no-op for current data.
        StorageService.getExceptions(),
      ]);

      // Primary path: dedup gregEvents + hebEvents (unchanged behaviour).
      // getEventsForGregorianDate and getEventsForHebrewDate both filter
      // is_exception = 0, so exception/tombstone rows never enter this path.
      const seen = new Set<string>();
      const primary = [...gregEvents, ...hebEvents].filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      const allPrimaryNotes = primary.map(eventToCalendarNote);

      // Secondary path: expand recurring notes to this day.
      // Fixes Gregorian recurring notes (birthday/yahrzeit saved with
      // calendarType: 'gregorian') which previously only fired on their
      // original start_date and never on subsequent years.
      const recurringNotes = recurringEvents.map(eventToCalendarNote);
      const exceptionNotes = exceptionEvents.map(eventToCalendarNote);
      const instances = expandRecurringNotes(recurringNotes, d, d, exceptionNotes);

      // Merge strategy with composite ids:
      // - instances now carry composite ids (masterId:YYYY-MM-DD) — they are
      //   the authoritative placement for ALL recurring notes on this date.
      // - Recurring masters returned by the primary Hebrew/Gregorian queries
      //   would collide: primary uses the master id, instance uses composite id.
      //   Fix: only non-recurring primary notes enter the map; all recurring
      //   placements come exclusively from `instances` (composite id).
      //   expandRecurringNotes is guaranteed to emit an instance for the current
      //   date for any recurring master the primary query matched, so nothing is lost.
      const combinedById = new Map<string, CalendarNote>();
      for (const n of allPrimaryNotes) {
        if (!n.recurring) combinedById.set(n.id, n);
      }
      for (const inst of instances) combinedById.set(inst.note.id, inst.note);

      setNotes(Array.from(combinedById.values()));
    }
    load().catch(console.error);
  }, [date?.getTime(), notesVersion]);

  const saveNote = useCallback(async (params: {
    id?: string;
    created?: string;
    summary: string;
    noteType: NoteType;
    calendarType: 'hebrew' | 'gregorian';
    date: Date;
    hebrewDate: HebrewDateInfo;
    reminderMinutes?: number | null;
    colorId?: string | null;
    location?: string | null;
    // C2 time params — all optional for back-compat; existing callers omit them
    // and get the previous all-day behavior unchanged.
    allDay?: boolean;           // default: true (preserves existing all-day behavior)
    startTime?: Date | null;    // hours/minutes for timed event start
    endTime?: Date | null;      // hours/minutes for timed event end (optional)
    reminderTime?: Date | null; // user-picked clock time for all-day reminder anchor
    // C3 explicit recurrence params — optional for back-compat.
    // When provided, these WIN over the implicit noteType derivation.
    // Callers that do NOT pass these (e.g. NoteList color picker, NoteEditor
    // pre-Wave-2) continue to get the old implicit behavior unchanged.
    recurrenceType?: RecurrenceType;
    recurrenceCalendar?: 'hebrew' | 'gregorian' | null;
  }) => {
    const now = new Date().toISOString();
    const dateStr = formatDateKey(params.date);

    // ── Recurrence: explicit params win; fall back to noteType derivation ────────
    //
    // Explicit path (Wave 2 passes params.recurrenceType):
    //   recurrenceType = params.recurrenceType (any of the 5 enum values)
    //   recurrenceCalendar rules per type:
    //     yearly  → params.recurrenceCalendar ?? params.calendarType ?? 'hebrew'
    //               (yearly ALWAYS needs a calendar; default hebrew)
    //     monthly → params.recurrenceCalendar ?? params.calendarType (can be undefined)
    //               (monthly may or may not be calendar-anchored; leave undefined if unspecified)
    //     daily | weekly | none → undefined
    //               (calendar-independent; daily/weekly are Gregorian by the locked model)
    //
    // Fallback path (caller omits params.recurrenceType — backward-compat):
    //   birthday / yahrzeit / anniversary → yearly, calendar = calendarType
    //   note → none, calendar = undefined
    //   This exactly matches the C1 implicit derivation so no existing row is affected.
    //
    // Back-compat guarantee: if a birthday row is edited WITHOUT passing recurrenceType
    // (should not happen post-Wave-2 but is defensively safe), the fallback derives
    // 'yearly' from noteType, preserving the stored recurrence.

    let recurrenceType: RecurrenceType;
    let recurrenceCalendar: 'hebrew' | 'gregorian' | undefined;

    if (params.recurrenceType !== undefined) {
      // ── Explicit path ──────────────────────────────────────────────────────────
      recurrenceType = params.recurrenceType;
      switch (recurrenceType) {
        case 'yearly':
          // Yearly events always carry a calendar discriminator (needed by
          // expandYearly to route hebrew vs. gregorian expansion).
          // Precedence: explicit param > calendarType > 'hebrew' (safe default).
          recurrenceCalendar =
            params.recurrenceCalendar != null
              ? params.recurrenceCalendar
              : (params.calendarType ?? 'hebrew');
          break;
        case 'monthly':
          // Monthly events CAN be calendar-anchored (hebrew or gregorian).
          // If the caller passes null explicitly, honour it (no calendar anchor).
          // If omitted, fall back to calendarType (so a monthly-hebrew note keeps
          // its calendar). expandMonthly falls back to calendarType when this is
          // undefined, so undefined is safe.
          recurrenceCalendar =
            params.recurrenceCalendar != null
              ? params.recurrenceCalendar
              : params.calendarType;
          break;
        case 'daily':
        case 'weekly':
        case 'none':
        default:
          // Calendar-independent types: daily/weekly use Gregorian by the locked
          // model; none is N/A. Do not persist a misleading calendar value.
          recurrenceCalendar = undefined;
          break;
      }
    } else {
      // ── Fallback path: implicit derivation from noteType (C1 / pre-Wave-2) ────
      // birthday / yahrzeit / anniversary → yearly recurring, anchored to calendarType.
      // note → one-time (none), no calendar anchor.
      const recurring = params.noteType !== 'note';
      recurrenceType = recurring ? 'yearly' : 'none';
      recurrenceCalendar = recurring ? params.calendarType : undefined;
    }

    // ── Build start/end based on allDay flag ──────────────────────────────────
    // allDay defaults to true so omitting it preserves the prior all-day behavior.
    const isAllDay = params.allDay !== false;

    let eventStart: CalendarEvent['start'];
    let eventEnd: CalendarEvent['end'];

    if (isAllDay) {
      // All-day: use date-only fields. start.date and end.date set; no dateTime.
      eventStart = { date: dateStr };
      eventEnd   = { date: dateStr };
    } else {
      // Timed event: merge params.date (calendar day) with startTime (hours/minutes).
      // We take year/month/day from the calendar date (local) and apply the hours/
      // minutes from the picked time Date, then convert to ISO 8601 for storage.
      //
      // Task 4 fix: we ALSO set start.date = dateStr so that getEventsForGregorianDate
      // (which queries WHERE start_date = ?) still finds this event by day.
      // isAllDay is derived from dateTime presence (== null), NOT date presence,
      // so having both fields does not corrupt the all-day flag.
      const startTimeDate = params.startTime ?? new Date(); // fallback to now if somehow null
      const mergedStart = new Date(
        params.date.getFullYear(),
        params.date.getMonth(),
        params.date.getDate(),
        startTimeDate.getHours(),
        startTimeDate.getMinutes(),
        0,
        0,
      );
      const startISO = mergedStart.toISOString();

      eventStart = { date: dateStr, dateTime: startISO, timeZone: 'Asia/Jerusalem' };

      if (params.endTime) {
        const mergedEnd = new Date(
          params.date.getFullYear(),
          params.date.getMonth(),
          params.date.getDate(),
          params.endTime.getHours(),
          params.endTime.getMinutes(),
          0,
          0,
        );
        eventEnd = { date: dateStr, dateTime: mergedEnd.toISOString(), timeZone: 'Asia/Jerusalem' };
      } else {
        // No explicit end time: mirror start (minimal sane default for a point-in-time event).
        eventEnd = { date: dateStr, dateTime: startISO, timeZone: 'Asia/Jerusalem' };
      }
    }

    const event: CalendarEvent = {
      id: params.id ?? generateUUID(),
      summary: params.summary,
      status: 'confirmed',
      created: params.created ?? now,
      updated: now,
      colorId: params.colorId ?? undefined,
      location: params.location ?? undefined,
      start: eventStart,
      end: eventEnd,
      reminders: params.reminderMinutes != null
        ? { useDefault: false, overrides: [{ method: 'popup', minutes: params.reminderMinutes }] }
        : { useDefault: false },
      hebrewExtensions: {
        calendarType: params.calendarType,
        hebrewDate: {
          day: params.hebrewDate.day,
          month: params.hebrewDate.month,
          year: params.hebrewDate.year,
          monthName: params.hebrewDate.monthName,
        },
        recurrenceType,
        recurrenceCalendar,
        category: params.noteType as NoteCategory,
        afterSunset: false,
        notificationScheduled: params.reminderMinutes != null,
      },
    };
    await StorageService.saveEvent(event);

    // Reminder scheduling:
    // - One-time events (recurrence_type 'none'): schedule immediately here.
    // - Recurring events (yearly_*): do NOT schedule here — owned by ensureAnnualReminders.
    //   Persist reminder_minutes only; ensureAnnualReminders computes the correct next occurrence on init.
    // - notificationScheduled means "a reminder is configured", regardless of who schedules.
    // - On edit: cancel the existing notification first (covers both one-time and recurring cases).

    if (params.id) {
      // editing an existing note — cancel whatever was previously scheduled
      await NotificationService.cancelNotification(params.id);
    }

    if (params.reminderMinutes != null) {
      const isOneTime = recurrenceType === 'none';
      if (isOneTime) {
        // Compute trigger for one-time events only.
        const startDateTime = event.start.dateTime;
        let triggerDate: Date;
        if (startDateTime) {
          // Timed event: trigger = startDateTime − reminderMinutes
          triggerDate = new Date(new Date(startDateTime).getTime() - params.reminderMinutes * 60 * 1000);
        } else {
          // All-day event with reminder.
          // C2 policy: anchor = reminderTime (user-picked clock time for this day).
          // REPLACES the prior hard-coded 09:00 default.
          // UI contract: Wave 2 MUST supply reminderTime whenever reminderMinutes is
          // set and allDay is true. The defensive 09:00 fallback below exists only for
          // safety — it should never fire in normal operation.
          const [year, month, day] = (event.start.date ?? '').split('-').map(Number);
          if (params.reminderTime) {
            triggerDate = new Date(
              year,
              month - 1,
              day,
              params.reminderTime.getHours(),
              params.reminderTime.getMinutes(),
              0,
              0,
            );
          } else {
            // DEFENSIVE FALLBACK ONLY — UI is contracted to always supply reminderTime
            // for all-day reminders. This path should never execute in production.
            triggerDate = new Date(year, month - 1, day, 9, 0, 0, 0);
          }
          triggerDate = new Date(triggerDate.getTime() - params.reminderMinutes * 60 * 1000);
        }
        if (triggerDate > new Date()) {
          await NotificationService.scheduleLocalNotification({
            id: event.id,
            title: event.summary,
            body: `תזכורת: ${event.summary}`,
            triggerDate,
          });
        }
      }
      // For recurring events: do nothing here. ensureAnnualReminders handles them on next init.
    }

    incrementNotesVersion();
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await NotificationService.cancelNotification(id);
    await StorageService.deleteEvent(id);
    incrementNotesVersion();
  }, []);

  // Gal C C3 — per-occurrence operations on a recurring series.
  // The UI extracts masterId + occurrenceDate from a composite instance id
  // ({masterId}:{YYYY-MM-DD}) and calls these. Thin wrappers over the C1
  // StorageService exception/tombstone writers + a notes refresh.

  /** "מחק לתאריך זה בלבד" — writes a tombstone so this one date is skipped; series continues. */
  const deleteOccurrence = useCallback(async (masterId: string, occurrenceDate: string) => {
    await StorageService.saveTombstoneForOccurrence(masterId, occurrenceDate);
    incrementNotesVersion();
  }, []);

  /** "ערוך לתאריך זה בלבד" — writes an override row for this one date; series unchanged. */
  const saveOccurrenceException = useCallback(async (
    masterId: string,
    occurrenceDate: string,
    overrides: {
      summary?: string;
      location?: string | null;
      colorId?: string | null;
      category?: NoteCategory;
      allDay?: boolean;
      startDateTime?: string | null;
      endDateTime?: string | null;
      reminderMinutes?: number | null;
    },
  ) => {
    await StorageService.saveExceptionForOccurrence(masterId, occurrenceDate, overrides);
    incrementNotesVersion();
  }, []);

  return { notes, saveNote, deleteNote, deleteOccurrence, saveOccurrenceException, refreshKey: notesVersion };
}
