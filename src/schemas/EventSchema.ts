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

// NOTE: the `createEvent()` helper that used to live here was removed
// (Wave 1A data-integrity review, 2026-08-30). It was a second,
// never-called construction path for CalendarEvent that had already
// drifted from the real production path (`useNotes.saveNote`, which
// hand-builds the event to cover all-day/timed variants, multi-day end
// dates, explicit recurrence params, location, colorId, and reminders —
// none of which `createEvent` supported). Unifying them would have meant
// growing `createEvent` to reimplement `saveNote`'s branch-heavy logic
// rather than removing duplication, so it was deleted instead. `saveNote`
// remains the single, auditable construction point for `CalendarEvent`.

// ── Runtime Validation (Zod) ──────────────────────────────────────────────
//
// This file historically contained only TypeScript interfaces (compile-time,
// erased at runtime). `CalendarEventSchema` below is the REAL runtime
// validator, used by StorageService.rowToEvent to check rows read back from
// SQLite before they reach the UI (locked project decision: DB data must be
// Zod-validated). It intentionally mirrors — but is NOT identical to —
// `CalendarEvent`, because SQLite has no schema enforcement beyond column
// affinity and six schema versions (v1-v6) have written this table over
// time. A malformed row must never crash the app or hide a user's whole
// calendar, so StorageService uses `safeParse` and skips (never throws on)
// any row that fails validation.
//
// Strictness reasoning (per-field, see also StorageService.rowToEvent):
//   - Fields backed by a nullable SQLite column (no NOT NULL constraint) are
//     `.nullish()` even where `CalendarEvent` merely marks them optional —
//     a SQL NULL and an absent JS property both mean "not set". This covers
//     description, location, created, updated, colorId, recurrence,
//     reminders, and every field added by a later ALTER TABLE (recurrence
//     v5 columns, etc.).
//   - `status` is the one closed `z.enum(...)`: its 3-value set
//     ('confirmed' | 'tentative' | 'cancelled') has never changed across
//     v1-v6, every write path sets it from the TS literal union, and it's
//     the field IcsExportService/NotificationService branch on most
//     directly — worth catching real corruption here.
//   - `calendarType`, `recurrenceType`, `category`, and `recurrenceCalendar`
//     are validated as non-empty strings rather than closed enums. They ARE
//     app-internal enums, but their *value sets* have changed across schema
//     versions (see the v5 migration's `recurrence_type` remap in
//     StorageService — 'yearly_hebrew' -> 'yearly' + recurrence_calendar
//     'hebrew', run once at startup before any read). Rejecting a
//     well-formed-but-unrecognized string here risks silently hiding a
//     legitimate user note; downstream code already treats unrecognized
//     values safely (e.g. `eventToCalendarNote` falls back to noteType
//     'note' for any unmatched category).
//   - Booleans reconstructed in `rowToEvent` via `row.x === 1` are guaranteed
//     real booleans by construction, so they are required (non-nullish) —
//     this still guards against a future mapper regression.
//   - `id` is required and non-empty: it's the SQLite PRIMARY KEY and every
//     id-keyed dedup/merge in the app (useNotes, useDatesNotes) depends on
//     it being present.

import { z } from 'zod';

const EventDateTimeSchema = z.object({
  dateTime: z.string().nullish(),
  date: z.string().nullish(),
  timeZone: z.string().nullish(),
});

const HebrewDateSchema = z.object({
  day: z.number(),
  month: z.number(),
  year: z.number().nullish(),
  monthName: z.string(),
});

const ReminderOverrideSchema = z.object({
  method: z.enum(['popup', 'email']),
  minutes: z.number(),
});

const RemindersSchema = z.object({
  useDefault: z.boolean(),
  overrides: z.array(ReminderOverrideSchema).nullish(),
});

const HebrewExtensionsSchema = z.object({
  calendarType: z.string().min(1),   // 'hebrew' | 'gregorian' — see leniency note above
  hebrewDate: HebrewDateSchema.nullish(),
  recurrenceType: z.string().min(1), // 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  category: z.string().min(1),       // NoteCategory — see leniency note above
  afterSunset: z.boolean().nullish(),
  notificationScheduled: z.boolean().nullish(),
  recurrenceCalendar: z.string().nullish(),
  recurrenceId: z.string().nullish(),
  isException: z.boolean().nullish(),
  exceptionDate: z.string().nullish(),
  renewalAskSuppressed: z.boolean().nullish(),
  lastRenewalAsk: z.string().nullish(),
});

export const CalendarEventSchema = z.object({
  id: z.string().min(1),
  summary: z.string(),
  description: z.string().nullish(),
  location: z.string().nullish(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']),
  created: z.string().nullish(),
  updated: z.string().nullish(),
  start: EventDateTimeSchema,
  end: EventDateTimeSchema,
  recurrence: z.array(z.string()).nullish(),
  reminders: RemindersSchema.nullish(),
  colorId: z.string().nullish(),
  hebrewExtensions: HebrewExtensionsSchema,
});

// ── Compile-time drift guard ────────────────────────────────────────────
// Keeps `CalendarEvent` and `CalendarEventSchema` from silently drifting:
// if a field is ever added to (or removed from) one but not the other, one
// of the `_assert*` lines below fails to compile ("Type 'false' is not
// assignable to type 'true'"). This checks KEY PARITY only (both sides
// declare the same field names) — it deliberately does NOT require
// identical optionality/nullability, since the Zod schema is intentionally
// more permissive than the TS interface for the reasons documented above.
type KeysEqual<A, B> = [keyof A] extends [keyof B]
  ? [keyof B] extends [keyof A]
    ? true
    : false
  : false;

type TopLevelKeysInSync = KeysEqual<CalendarEvent, z.infer<typeof CalendarEventSchema>>;
type HebrewExtensionsKeysInSync = KeysEqual<
  CalendarEvent['hebrewExtensions'],
  z.infer<typeof HebrewExtensionsSchema>
>;

const _assertTopLevelInSync: TopLevelKeysInSync = true;
const _assertHebrewExtensionsInSync: HebrewExtensionsKeysInSync = true;
void _assertTopLevelInSync;
void _assertHebrewExtensionsInSync;
