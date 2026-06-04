// src/schemas/EventSchema.ts

export type CalendarType = 'hebrew' | 'gregorian';
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type NoteCategory = 'work' | 'personal' | 'holiday' | 'torah' | 'medical' | 'other' | 'birthday' | 'yahrzeit' | 'anniversary';

/**
 * 1:1 compatible with Google Calendar API Event object
 * Extended with Hebrew calendar fields
 */
export interface CalendarEvent {
  // ── Google Calendar Core Fields ──────────────────────────
  id: string;                          // UUID
  summary: string;                     // Title
  description?: string;                // Body text
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  created: string;                     // ISO 8601
  updated: string;                     // ISO 8601

  start: {
    dateTime?: string;                 // ISO 8601 with timezone (timed events)
    date?: string;                     // YYYY-MM-DD (all-day events)
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };

  recurrence?: string[];               // RFC 5545 RRULE (e.g. "RRULE:FREQ=YEARLY")
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'popup' | 'email'; minutes: number }>;
  };
  colorId?: string;                    // Google color ID (1-11)

  // ── Hebrew Calendar Extensions ───────────────────────────
  hebrewExtensions: {
    calendarType: CalendarType;        // Which calendar anchors this event
    hebrewDate?: {
      day: number;
      month: number;                   // Hebrew month number (1=Nisan)
      year?: number;                   // Omit for yearly recurring
      monthName: string;               // e.g. "תשרי"
    };
    recurrenceType: RecurrenceType;
    category: NoteCategory;
    afterSunset?: boolean;             // Was created after sunset (next Hebrew day)
    notificationScheduled?: boolean;
    recurrenceCalendar?: 'hebrew' | 'gregorian';  // only meaningful for monthly/yearly
    recurrenceId?: string;             // links an exception/tombstone row to its master series
    isException?: boolean;
    exceptionDate?: string;            // ISO 8601 YYYY-MM-DD of the overridden occurrence
    renewalAskSuppressed?: boolean;
    lastRenewalAsk?: string;           // ISO 8601 date
  };
}

// ── Helper: Create new event ──────────────────────────────

import { generateUUID } from '../utils/dateUtils';

export function createEvent(params: {
  summary: string;
  gregorianDate: Date;
  hebrewDate: { day: number; month: number; year: number; monthName: string };
  calendarType?: CalendarType;
  category?: NoteCategory;
  description?: string;
  recurrenceType?: RecurrenceType;
  allDay?: boolean;
  afterSunset?: boolean;
}): CalendarEvent {
  const now = new Date().toISOString();
  const dateStr = params.gregorianDate.toISOString().split('T')[0];

  return {
    id: generateUUID(),
    summary: params.summary,
    description: params.description,
    status: 'confirmed',
    created: now,
    updated: now,
    start: params.allDay ? { date: dateStr } : { dateTime: params.gregorianDate.toISOString(), timeZone: 'Asia/Jerusalem' },
    end: params.allDay ? { date: dateStr } : { dateTime: params.gregorianDate.toISOString(), timeZone: 'Asia/Jerusalem' },
    reminders: { useDefault: false },
    hebrewExtensions: {
      calendarType: params.calendarType ?? 'hebrew',
      hebrewDate: params.hebrewDate,
      recurrenceType: params.recurrenceType ?? 'none',
      category: params.category ?? 'personal',
      afterSunset: params.afterSunset ?? false,
      notificationScheduled: false,
    }
  };
}
