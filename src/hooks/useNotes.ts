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
  }) => {
    const now = new Date().toISOString();
    const dateStr = formatDateKey(params.date);
    // Gal C: orthogonal recurrence model — type + calendar are separate axes.
    // C1 preserves existing behavior: birthday/yahrzeit/anniversary → yearly,
    // anchored to the chosen calendar. The recurrence picker (daily/weekly/
    // monthly) arrives in C2/C3; until then noteType still implies yearly.
    const recurring = params.noteType !== 'note';
    const recurrenceType = recurring ? 'yearly' : 'none';
    const recurrenceCalendar: 'hebrew' | 'gregorian' | undefined =
      recurring ? params.calendarType : undefined;

    const event: CalendarEvent = {
      id: params.id ?? generateUUID(),
      summary: params.summary,
      status: 'confirmed',
      created: params.created ?? now,
      updated: now,
      colorId: params.colorId ?? undefined,
      location: params.location ?? undefined,
      start: { date: dateStr },
      end: { date: dateStr },
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
        // Compute trigger for one-time events only
        const startDateTime = event.start.dateTime;
        let triggerDate: Date;
        if (startDateTime) {
          triggerDate = new Date(new Date(startDateTime).getTime() - params.reminderMinutes * 60 * 1000);
        } else {
          // All-day: 09:00 on event day minus reminderMinutes (locked Wave 2 policy)
          const [year, month, day] = (event.start.date ?? '').split('-').map(Number);
          triggerDate = new Date(year, month - 1, day, 9, 0, 0, 0);
          triggerDate.setMinutes(triggerDate.getMinutes() - params.reminderMinutes);
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

  return { notes, saveNote, deleteNote, refreshKey: notesVersion };
}
