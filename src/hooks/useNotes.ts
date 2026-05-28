import { useState, useEffect, useCallback } from 'react';
import { HDate } from '@hebcal/core';
import { StorageService } from '../services/StorageService';
import { NotificationService } from '../services/NotificationService';
import { CalendarEvent, NoteCategory } from '../schemas/EventSchema';
import { generateUUID } from '../utils/dateUtils';
import type { HebrewDateInfo } from '../services/DateService';
import { expandRecurringNotes } from '../utils/expandRecurringNotes';

export type NoteType = 'note' | 'birthday' | 'yahrzeit' | 'anniversary';

export interface CalendarNote {
  id: string;
  summary: string;
  noteType: NoteType;
  calendarType: 'hebrew' | 'gregorian';
  recurring: boolean;
  created: string;
  hebrewDate: { day: number; month: number; year?: number; monthName: string } | undefined;
  gregorianDateStr: string | undefined;
  reminderMinutes: number | null;
}

// Exported so useDatesNotes (Phase 4.2-1) can reuse the same mapping
// without duplicating logic. useNotes itself calls it internally too.
export function eventToCalendarNote(e: CalendarEvent): CalendarNote {
  const cat = e.hebrewExtensions.category;
  const noteType: NoteType =
    cat === 'birthday' ? 'birthday' :
    cat === 'yahrzeit' ? 'yahrzeit' :
    cat === 'anniversary' ? 'anniversary' : 'note';
  return {
    id: e.id,
    summary: e.summary,
    noteType,
    calendarType: e.hebrewExtensions.calendarType,
    recurring: e.hebrewExtensions.recurrenceType !== 'none',
    created: e.created,
    hebrewDate: e.hebrewExtensions.hebrewDate,
    gregorianDateStr: e.start.date,
    reminderMinutes: e.reminders?.overrides?.[0]?.minutes ?? null,
  };
}

export function useNotes(date: Date | null) {
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!date) { setNotes([]); return; }
    const d: Date = date;
    async function load() {
      const hdate = new HDate(d);
      const [gregEvents, hebEvents, recurringEvents] = await Promise.all([
        StorageService.getEventsForGregorianDate(d),
        StorageService.getEventsForHebrewDate(hdate.getDate(), hdate.getMonth()),
        // Fetch all recurring notes so we can expand Gregorian recurring ones
        // to this specific date. Hebrew recurring are already returned by
        // getEventsForHebrewDate above; the id-keyed merge below deduplicates.
        StorageService.getAllRecurringNotes(),
      ]);

      // Primary path: dedup gregEvents + hebEvents (unchanged behaviour)
      const seen = new Set<string>();
      const primary = [...gregEvents, ...hebEvents].filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
      const existingNotes = primary.map(eventToCalendarNote);

      // Secondary path: expand recurring notes to this day.
      // Fixes Gregorian recurring notes (birthday/yahrzeit saved with
      // calendarType: 'gregorian') which previously only fired on their
      // original start_date and never on subsequent years.
      const recurringNotes = recurringEvents.map(eventToCalendarNote);
      const instances = expandRecurringNotes(recurringNotes, d, d);

      // Merge by id — Hebrew recurring notes are already in existingNotes
      // via getEventsForHebrewDate and are naturally deduplicated here.
      const combinedById = new Map<string, CalendarNote>();
      for (const n of existingNotes)       combinedById.set(n.id, n);
      for (const inst of instances)        combinedById.set(inst.note.id, inst.note);

      setNotes(Array.from(combinedById.values()));
    }
    load().catch(console.error);
  }, [date?.getTime(), refreshKey]);

  const saveNote = useCallback(async (params: {
    id?: string;
    created?: string;
    summary: string;
    noteType: NoteType;
    calendarType: 'hebrew' | 'gregorian';
    date: Date;
    hebrewDate: HebrewDateInfo;
    reminderMinutes?: number | null;
  }) => {
    const now = new Date().toISOString();
    const dateStr = params.date.toISOString().split('T')[0];
    const recurring = params.noteType !== 'note';
    const recurrenceType = !recurring ? 'none' :
      params.calendarType === 'hebrew' ? 'yearly_hebrew' : 'yearly_gregorian';

    const event: CalendarEvent = {
      id: params.id ?? generateUUID(),
      summary: params.summary,
      status: 'confirmed',
      created: params.created ?? now,
      updated: now,
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

    setRefreshKey(k => k + 1);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    await NotificationService.cancelNotification(id);
    await StorageService.deleteEvent(id);
    setRefreshKey(k => k + 1);
  }, []);

  return { notes, saveNote, deleteNote, refreshKey };
}
