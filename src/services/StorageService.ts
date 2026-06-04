// src/services/StorageService.ts
// Phase 4.7-1 fix: switched from expo-sqlite v14 "Next" API to legacy API.
// Both openDatabaseAsync and openDatabaseSync in expo-sqlite v14 use
// NativeDatabase — the new native module that is NOT present in standard
// Expo Go. The expo-sqlite/legacy entry point exports the classic
// openDatabase() which uses the original SQLite native module that ships
// with Expo Go.
//
// Query helpers (dbAll / dbRun / dbFirst) wrap the legacy transactionAsync
// pattern so callers remain identical to the previous version.

import {
  openDatabase,
  type SQLiteDatabase,
  type SQLStatementArg,
  type ResultSet,
} from 'expo-sqlite/legacy';
import { HDate } from '@hebcal/core';
import { CalendarEvent, NoteCategory } from '../schemas/EventSchema';
import { formatDateKey, generateUUID } from '../utils/dateUtils';

// ── DB handle ──────────────────────────────────────────────────────────────────

let db: SQLiteDatabase | null = null;
let schemaInitialized = false;
let schemaV2Migrated = false;
let schemaColorMigrated = false;
let schemaLocationMigrated = false;
let schemaV5Migrated = false;

function getDb(): SQLiteDatabase {
  if (!db) {
    db = openDatabase('calendar.db');
  }
  return db;
}

// All transactions run single-file on the one shared connection.
// expo-sqlite/legacy deadlocks if two transactionAsync calls overlap
// (confirmed, standalone Android). This gate makes overlap impossible,
// so callers may use Promise.all / fire-and-forget freely.
let txnTail: Promise<unknown> = Promise.resolve();

function runExclusive<T>(work: () => Promise<T>): Promise<T> {
  const result = txnTail.then(work, work);                 // run regardless of prior outcome
  txnTail = result.then(() => undefined, () => undefined); // one failure can't break the chain
  return result;
}

async function doCreateSchema(): Promise<void> {
  if (schemaInitialized) return;
  await getDb().transactionAsync(async (txn) => {
    await txn.executeSqlAsync(
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        summary TEXT NOT NULL,
        description TEXT,
        start_date TEXT NOT NULL,
        start_datetime TEXT,
        end_date TEXT,
        end_datetime TEXT,
        status TEXT DEFAULT 'confirmed',
        recurrence TEXT,
        calendar_type TEXT DEFAULT 'hebrew',
        hebrew_day INTEGER,
        hebrew_month INTEGER,
        hebrew_year INTEGER,
        hebrew_month_name TEXT,
        recurrence_type TEXT DEFAULT 'none',
        category TEXT DEFAULT 'personal',
        after_sunset INTEGER DEFAULT 0,
        color_id TEXT,
        created TEXT,
        updated TEXT,
        notification_scheduled INTEGER DEFAULT 0,
        reminder_minutes INTEGER,
        location TEXT,
        recurrence_calendar TEXT,
        recurrence_id TEXT,
        is_exception INTEGER DEFAULT 0,
        exception_date TEXT,
        renewal_ask_suppressed INTEGER DEFAULT 0,
        last_renewal_ask TEXT
      )`,
      [],
    );
    await txn.executeSqlAsync(
      `CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT)`,
      [],
    );
    // v2 migration: add reminder_minutes column (additive, safe on existing data)
    if (!schemaV2Migrated) {
      try {
        await txn.executeSqlAsync(
          'ALTER TABLE events ADD COLUMN reminder_minutes INTEGER',
          [],
        );
      } catch {
        // column already exists — no-op
      }
      schemaV2Migrated = true;
    }
    // v3 migration: add color_id column (additive, safe — already in CREATE TABLE for new installs)
    if (!schemaColorMigrated) {
      try {
        await txn.executeSqlAsync('ALTER TABLE events ADD COLUMN color_id TEXT', []);
      } catch {
        // column already exists — no-op
      }
      schemaColorMigrated = true;
    }
    // v4 migration: add location column
    if (!schemaLocationMigrated) {
      try {
        await txn.executeSqlAsync('ALTER TABLE events ADD COLUMN location TEXT', []);
      } catch {
        // column already exists — no-op
      }
      schemaLocationMigrated = true;
    }
    // v5 migration: add recurrence/renewal columns, then remap legacy recurrence_type values.
    // Each ALTER is wrapped individually — "column already exists" is a no-op on upgrade.
    // The remap UPDATEs run AFTER the ALTERs (recurrence_calendar must exist before we write it).
    // All statements run inside this same transaction, so either all succeed or all roll back.
    // The UPDATEs are idempotent: after the first run, no rows hold the old compound enum values.
    if (!schemaV5Migrated) {
      try {
        await txn.executeSqlAsync(
          'ALTER TABLE events ADD COLUMN recurrence_calendar TEXT',
          [],
        );
      } catch {
        // column already exists — no-op
      }
      try {
        await txn.executeSqlAsync(
          'ALTER TABLE events ADD COLUMN recurrence_id TEXT',
          [],
        );
      } catch {
        // column already exists — no-op
      }
      try {
        await txn.executeSqlAsync(
          'ALTER TABLE events ADD COLUMN is_exception INTEGER DEFAULT 0',
          [],
        );
      } catch {
        // column already exists — no-op
      }
      try {
        await txn.executeSqlAsync(
          'ALTER TABLE events ADD COLUMN exception_date TEXT',
          [],
        );
      } catch {
        // column already exists — no-op
      }
      try {
        await txn.executeSqlAsync(
          'ALTER TABLE events ADD COLUMN renewal_ask_suppressed INTEGER DEFAULT 0',
          [],
        );
      } catch {
        // column already exists — no-op
      }
      try {
        await txn.executeSqlAsync(
          'ALTER TABLE events ADD COLUMN last_renewal_ask TEXT',
          [],
        );
      } catch {
        // column already exists — no-op
      }
      // Remap legacy compound recurrence_type values to the new orthogonal enum.
      // recurrence_type now holds only: none | weekly | monthly | yearly
      // recurrence_calendar holds: hebrew | gregorian | null
      // These four UPDATE statements are idempotent — after the first run, no
      // rows match the old compound values, so subsequent runs are no-ops.
      await txn.executeSqlAsync(
        `UPDATE events SET recurrence_type = 'yearly',  recurrence_calendar = 'hebrew'
         WHERE recurrence_type = 'yearly_hebrew'`,
        [],
      );
      await txn.executeSqlAsync(
        `UPDATE events SET recurrence_type = 'yearly',  recurrence_calendar = 'gregorian'
         WHERE recurrence_type = 'yearly_gregorian'`,
        [],
      );
      await txn.executeSqlAsync(
        `UPDATE events SET recurrence_type = 'monthly', recurrence_calendar = 'hebrew'
         WHERE recurrence_type = 'monthly_hebrew'`,
        [],
      );
      await txn.executeSqlAsync(
        `UPDATE events SET recurrence_type = 'monthly', recurrence_calendar = 'gregorian'
         WHERE recurrence_type = 'monthly_gregorian'`,
        [],
      );
      schemaV5Migrated = true;
    }
  });
  schemaInitialized = true;
}

let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!schemaReady) schemaReady = runExclusive(doCreateSchema);
  return schemaReady;
}

// ── Query helpers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function dbAll<T = any>(sql: string, args: SQLStatementArg[]): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rows: any[] = [];
  // NOTE: no readOnly flag. The expo-sqlite/legacy `transactionAsync(cb, true)`
  // (read-only) variant hangs and never resolves on the standalone Android
  // build, deadlocking every read. Plain read-write transactions (the same
  // path schema creation and writes use) work reliably, so all reads use them.
  await runExclusive(async () => {
    await getDb().transactionAsync(async (txn) => {
      const rs: ResultSet = await txn.executeSqlAsync(sql, args);
      rows = rs.rows;
    });
  });
  return rows as T[];
}

async function dbRun(sql: string, args: SQLStatementArg[]): Promise<void> {
  await runExclusive(async () => {
    await getDb().transactionAsync(async (txn) => {
      await txn.executeSqlAsync(sql, args);
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function dbFirst<T = any>(sql: string, args: SQLStatementArg[]): Promise<T | null> {
  const rows = await dbAll<T>(sql, args);
  return rows.length > 0 ? rows[0] : null;
}

// ── StorageService ─────────────────────────────────────────────────────────────

export class StorageService {
  // Called explicitly on app startup from _layout.tsx; also safe to skip —
  // any public method will call ensureSchema() itself on first use.
  static async init(): Promise<void> {
    await ensureSchema();
  }

  // ── Events ────────────────────────────────────────────────

  static async saveEvent(event: CalendarEvent): Promise<void> {
    await ensureSchema();
    const ext = event.hebrewExtensions;
    await dbRun(
      `INSERT OR REPLACE INTO events (
        id, summary, description,
        start_date, start_datetime,
        end_date, end_datetime,
        status, recurrence,
        calendar_type,
        hebrew_day, hebrew_month, hebrew_year, hebrew_month_name,
        recurrence_type, category,
        after_sunset, color_id,
        created, updated,
        notification_scheduled, reminder_minutes, location,
        recurrence_calendar, recurrence_id,
        is_exception, exception_date,
        renewal_ask_suppressed, last_renewal_ask
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        event.id,                                        // 1  id
        event.summary,                                   // 2  summary
        event.description ?? null,                       // 3  description
        event.start.date ?? null,                        // 4  start_date
        event.start.dateTime ?? null,                    // 5  start_datetime
        event.end.date ?? null,                          // 6  end_date
        event.end.dateTime ?? null,                      // 7  end_datetime
        event.status,                                    // 8  status
        JSON.stringify(event.recurrence ?? []),          // 9  recurrence
        ext.calendarType,                                // 10 calendar_type
        ext.hebrewDate?.day ?? null,                     // 11 hebrew_day
        ext.hebrewDate?.month ?? null,                   // 12 hebrew_month
        ext.hebrewDate?.year ?? null,                    // 13 hebrew_year
        ext.hebrewDate?.monthName ?? null,               // 14 hebrew_month_name
        ext.recurrenceType,                              // 15 recurrence_type
        ext.category,                                    // 16 category
        ext.afterSunset ? 1 : 0,                        // 17 after_sunset
        event.colorId ?? null,                           // 18 color_id
        event.created,                                   // 19 created
        event.updated,                                   // 20 updated
        ext.notificationScheduled ? 1 : 0,              // 21 notification_scheduled
        event.reminders?.overrides?.[0]?.minutes ?? null, // 22 reminder_minutes
        event.location ?? null,                          // 23 location
        ext.recurrenceCalendar ?? null,                  // 24 recurrence_calendar
        ext.recurrenceId ?? null,                        // 25 recurrence_id
        ext.isException ? 1 : 0,                        // 26 is_exception
        ext.exceptionDate ?? null,                       // 27 exception_date
        ext.renewalAskSuppressed ? 1 : 0,               // 28 renewal_ask_suppressed
        ext.lastRenewalAsk ?? null,                      // 29 last_renewal_ask
      ],
    );
  }

  static async getEventsForGregorianDate(date: Date): Promise<CalendarEvent[]> {
    await ensureSchema();
    const dateStr = formatDateKey(date);
    const rows = await dbAll(
      `SELECT * FROM events WHERE start_date = ? AND status != 'cancelled' AND is_exception = 0`,
      [dateStr],
    );
    return rows.map(StorageService.rowToEvent);
  }

  static async getEventsForHebrewDate(hebrewDay: number, hebrewMonth: number): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events WHERE hebrew_day = ? AND hebrew_month = ?
       AND calendar_type = 'hebrew' AND status != 'cancelled' AND is_exception = 0`,
      [hebrewDay, hebrewMonth],
    );
    return rows.map(StorageService.rowToEvent);
  }

  /**
   * Soft-cancels the event with the given id.
   *
   * Cascade: if the deleted event is a recurring master, its exception and
   * tombstone children (rows with recurrence_id = id) are hard-deleted.
   * Rationale: exception/tombstone rows are meaningless without their master —
   * keeping them wastes space and could confuse future reads. The master itself
   * is soft-cancelled (status='cancelled') so ICS export and audit trails still
   * see it; the ephemeral children have no such need.
   *
   * Both statements run through the serialized runExclusive queue (each dbRun
   * call acquires the gate in turn). Because exceptions/tombstones are a closed
   * set keyed by recurrence_id, two sequential dbRun calls are sufficient and
   * simpler than bundling them into one transaction.
   */
  static async deleteEvent(id: string): Promise<void> {
    await ensureSchema();
    // 1. Soft-cancel the target row (master or standalone).
    await dbRun(
      `UPDATE events SET status = 'cancelled', updated = ? WHERE id = ?`,
      [new Date().toISOString(), id],
    );
    // 2. Hard-delete any exception/tombstone children that belong to this master.
    //    Safe for standalone (non-master) events: no rows have recurrence_id = their id,
    //    so this DELETE is a no-op.
    await dbRun(
      `DELETE FROM events WHERE recurrence_id = ?`,
      [id],
    );
  }

  /**
   * Returns non-recurring events whose start_date falls in the inclusive
   * range [startDate, endDate]. Recurring events are excluded — they are
   * fetched separately via getAllRecurringNotes and expanded by the
   * expandRecurringNotes utility.
   *
   * is_exception = 0 guard: exception/tombstone rows must not surface as
   * standalone notes. All existing rows have is_exception = 0 (column default),
   * so this filter is a no-op for current data.
   *
   * Used by useDatesNotes for batch grid rendering (Phase 4.2-1).
   */
  static async getNotesInRange(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    await ensureSchema();
    const startStr = formatDateKey(startDate);
    const endStr   = formatDateKey(endDate);
    const rows = await dbAll(
      `SELECT * FROM events
       WHERE start_date >= ?
         AND start_date <= ?
         AND recurrence_type = 'none'
         AND status != 'cancelled'
         AND is_exception = 0`,
      [startStr, endStr],
    );
    return rows.map(StorageService.rowToEvent);
  }

  /**
   * Returns ALL non-cancelled events, ordered by start_date ascending.
   * Used by IcsExportService to generate the full .ics export.
   */
  static async getAllEvents(): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events WHERE status != 'cancelled' ORDER BY start_date ASC`,
      [],
    );
    return rows.map(StorageService.rowToEvent);
  }

  /**
   * Returns ALL events with recurrence_type other than 'none', regardless
   * of date. The caller (expandRecurringNotes utility) decides which
   * instances fall within a given range.
   *
   * is_exception = 0 guard: exception rows have recurrence_type = 'none' by
   * design (override rows are single-occurrence placeholders), so the
   * recurrence_type != 'none' filter already excludes them. The extra
   * is_exception = 0 is a defensive belt-and-suspenders in case a future write
   * path ever produces a mis-classified row.
   *
   * Used by useDatesNotes for batch grid rendering (Phase 4.2-1).
   */
  static async getAllRecurringNotes(): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events
       WHERE recurrence_type != 'none'
         AND status != 'cancelled'
         AND is_exception = 0`,
      [],
    );
    return rows.map(StorageService.rowToEvent);
  }

  /**
   * Returns ALL exception and tombstone rows (is_exception = 1).
   *
   * IMPORTANT: does NOT filter on status. Tombstone rows have status='cancelled'
   * and are the mechanism for hiding a specific occurrence — returning only
   * status='confirmed' would defeat the entire purpose.
   *
   * Callers map the results through rowToEvent so the full CalendarEvent shape
   * is available, including recurrence_id, exception_date, and status.
   *
   * Used by useNotes and useDatesNotes to build the exception overlay that is
   * passed into expandRecurringNotes.
   */
  static async getExceptions(): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events WHERE is_exception = 1`,
      [],
    );
    return rows.map(StorageService.rowToEvent);
  }

  /**
   * Saves an OVERRIDE row for a specific occurrence of a recurring series.
   *
   * The override is a new standalone CalendarEvent row with:
   *   - A fresh UUID id (distinct from both the master and the composite slot id).
   *   - is_exception = true, recurrence_id = masterId, exception_date = occurrenceDate.
   *   - recurrence_type = 'none' (a single-occurrence stand-in, not itself recurring).
   *   - status = 'confirmed'.
   *   - start.date always = occurrenceDate (for day-keying in getEventsForGregorianDate).
   *
   * Overrides param — all fields optional; omitted fields fall back to empty/null defaults
   * on the override row (master values are NOT automatically inherited — the caller must
   * carry forward any master fields it wants to preserve on the override):
   *   summary / location / colorId / category — identity / display fields.
   *   allDay / startDateTime / endDateTime — time placement:
   *     allDay = true (default): date-only fields, no dateTime.
   *     allDay = false + startDateTime: start.date = occurrenceDate AND start.dateTime =
   *       startDateTime (day-keying preserved). end.dateTime = endDateTime ?? startDateTime.
   *     startDateTime / endDateTime must be ISO 8601 with timezone when provided.
   *   category: should match the master's NoteCategory unless the user changed it.
   *   reminderMinutes — reminder offset in minutes.
   *
   * Routes through saveEvent so the named-column INSERT is the single write path.
   *
   * Re-editing / deleting a specific override: call getExceptions() and filter by
   * recurrence_id = masterId AND exception_date = occurrenceDate. Use the row's real
   * UUID id for subsequent saveEvent or deleteEvent calls.
   *
   * @param masterId        The id of the master recurring event.
   * @param occurrenceDate  ISO "YYYY-MM-DD" of the occurrence being overridden.
   * @param overrides       Field overrides — full type inline on the parameter.
   */
  static async saveExceptionForOccurrence(
    masterId: string,
    occurrenceDate: string,
    overrides: {
      // ── Identity / display ───────────────────────────────────────────────────
      summary?: string;
      location?: string | null;
      colorId?: string | null;
      /** The event category (noteType mapped to NoteCategory). The override row
       *  should carry the master's category unless the user changed it. */
      category?: NoteCategory;
      // ── Time placement ───────────────────────────────────────────────────────
      /** true = all-day (default). false = timed; requires startDateTime. */
      allDay?: boolean;
      /** ISO 8601 with timezone (e.g. "2026-06-04T09:00:00.000Z"). Required when allDay=false. */
      startDateTime?: string | null;
      /** ISO 8601 with timezone. Optional even when timed; mirrors startDateTime if omitted. */
      endDateTime?: string | null;
      // ── Reminder ─────────────────────────────────────────────────────────────
      reminderMinutes?: number | null;
    },
  ): Promise<void> {
    await ensureSchema();
    const now = new Date().toISOString();

    // ── Build start / end ────────────────────────────────────────────────────────
    // start.date is ALWAYS occurrenceDate so getEventsForGregorianDate (WHERE
    // start_date = ?) can locate this override. isAllDay is derived from dateTime
    // presence (null → all-day), not date presence — both can coexist on timed rows.
    const isAllDay = overrides.allDay !== false;

    let eventStart: CalendarEvent['start'];
    let eventEnd: CalendarEvent['end'];

    if (isAllDay || !overrides.startDateTime) {
      // All-day override: date-only fields.
      eventStart = { date: occurrenceDate };
      eventEnd   = { date: occurrenceDate };
    } else {
      // Timed override: set both date (for day-keying) and dateTime.
      eventStart = {
        date: occurrenceDate,
        dateTime: overrides.startDateTime,
        timeZone: 'Asia/Jerusalem',
      };
      const endISO = overrides.endDateTime ?? overrides.startDateTime; // mirror start if no end
      eventEnd = {
        date: occurrenceDate,
        dateTime: endISO,
        timeZone: 'Asia/Jerusalem',
      };
    }

    const overrideEvent: CalendarEvent = {
      id: generateUUID(),
      summary: overrides.summary ?? '',
      location: overrides.location ?? undefined,
      status: 'confirmed',
      created: now,
      updated: now,
      colorId: overrides.colorId ?? undefined,
      start: eventStart,
      end: eventEnd,
      reminders: overrides.reminderMinutes != null
        ? { useDefault: false, overrides: [{ method: 'popup', minutes: overrides.reminderMinutes }] }
        : { useDefault: false },
      hebrewExtensions: {
        // Override rows are keyed only to the Gregorian date (occurrenceDate).
        // Hebrew-calendar anchoring belongs to the master; overrides are one-off placements.
        calendarType: 'gregorian',
        recurrenceType: 'none',
        category: overrides.category ?? 'personal',
        afterSunset: false,
        notificationScheduled: overrides.reminderMinutes != null,
        recurrenceId: masterId,
        isException: true,
        exceptionDate: occurrenceDate,
      },
    };
    await StorageService.saveEvent(overrideEvent);
  }

  /**
   * Saves a TOMBSTONE row for a specific occurrence of a recurring series.
   *
   * The tombstone is a new CalendarEvent row with:
   *   - A fresh UUID id.
   *   - is_exception = true, recurrence_id = masterId, exception_date = occurrenceDate.
   *   - status = 'cancelled' (the signal to expandRecurringNotes to skip this slot).
   *   - summary = '' (tombstones never display; summary is irrelevant).
   *   - recurrence_type = 'none'.
   *
   * Routes through saveEvent so named-column INSERT is the single write path.
   *
   * Note for C3: tombstones are retrieved by getExceptions() and matched in the
   * expandRecurringNotes overlay by (recurrence_id, exception_date). To undo a
   * tombstone (restore an occurrence), call deleteEvent(tombstoneId) where
   * tombstoneId is obtained from getExceptions() filtered by recurrence_id + exception_date.
   *
   * @param masterId        The id of the master recurring event.
   * @param occurrenceDate  ISO "YYYY-MM-DD" of the occurrence being cancelled.
   */
  static async saveTombstoneForOccurrence(
    masterId: string,
    occurrenceDate: string,
  ): Promise<void> {
    await ensureSchema();
    const now = new Date().toISOString();
    const tombstoneEvent: CalendarEvent = {
      id: generateUUID(),
      summary: '',
      status: 'cancelled',
      created: now,
      updated: now,
      start: { date: occurrenceDate },
      end: { date: occurrenceDate },
      reminders: { useDefault: false },
      hebrewExtensions: {
        calendarType: 'gregorian',
        recurrenceType: 'none',
        category: 'personal',
        afterSunset: false,
        notificationScheduled: false,
        recurrenceId: masterId,
        isException: true,
        exceptionDate: occurrenceDate,
      },
    };
    await StorageService.saveEvent(tombstoneEvent);
  }

  // ── Preferences ───────────────────────────────────────────

  static async getPref(key: string, defaultValue: string): Promise<string> {
    await ensureSchema();
    const row = await dbFirst<{ value: string }>(
      `SELECT value FROM preferences WHERE key = ?`,
      [key],
    );
    return row?.value ?? defaultValue;
  }

  static async setPref(key: string, value: string): Promise<void> {
    await ensureSchema();
    await dbRun(
      `INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)`,
      [key, value],
    );
  }

  /**
   * Batch-reads ALL preferences in a SINGLE transaction. Replaces the prior
   * pattern of one getPref() per key via Promise.all, which launched many
   * concurrent transactionAsync calls at startup and deadlocked the
   * expo-sqlite/legacy driver on standalone Android. Callers apply their own
   * per-key defaults against the returned map.
   */
  static async getAllPrefs(): Promise<Record<string, string>> {
    await ensureSchema();
    const rows = await dbAll<{ key: string; value: string }>(
      `SELECT key, value FROM preferences`,
      [],
    );
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  }

  // ── Row Mapper ────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static rowToEvent(row: any): CalendarEvent {
    let recurrence: string[] | undefined;
    try {
      const parsed = JSON.parse(row.recurrence || '[]');
      recurrence = Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      recurrence = [];
    }
    return {
      id: row.id,
      summary: row.summary,
      description: row.description,
      status: row.status,
      created: row.created,
      updated: row.updated,
      start: { date: row.start_date, dateTime: row.start_datetime },
      end: { date: row.end_date, dateTime: row.end_datetime },
      recurrence,
      colorId: row.color_id,
      hebrewExtensions: {
        calendarType: row.calendar_type,
        hebrewDate: row.hebrew_day ? {
          day: row.hebrew_day,
          month: row.hebrew_month,
          year: row.hebrew_year,
          monthName: row.hebrew_month_name,
        } : undefined,
        recurrenceType: row.recurrence_type,
        category: row.category,
        afterSunset: row.after_sunset === 1,
        notificationScheduled: row.notification_scheduled === 1,
        recurrenceCalendar: row.recurrence_calendar ?? undefined,
        recurrenceId: row.recurrence_id ?? undefined,
        isException: row.is_exception === 1,
        exceptionDate: row.exception_date ?? undefined,
        renewalAskSuppressed: row.renewal_ask_suppressed === 1,
        lastRenewalAsk: row.last_renewal_ask ?? undefined,
      },
      reminders: row.reminder_minutes != null
        ? { useDefault: false, overrides: [{ method: 'popup' as const, minutes: row.reminder_minutes }] }
        : { useDefault: false },
      location: row.location ?? undefined,
    };
  }

  /**
   * Returns a single CalendarEvent by its real UUID id, or null if not found /
   * soft-cancelled.
   *
   * Primary use case: Wave 2 "edit all occurrences" — it has a composite instance
   * id (masterId:YYYY-MM-DD) and needs to load the master row to recover its
   * original anchor date (gregorianDateStr / hebrewDate) before calling saveNote.
   *
   * Does NOT filter on status so tombstone/exception rows can also be fetched if
   * needed (though in practice edit-all will always target a master, not a child).
   */
  static async getEventById(id: string): Promise<CalendarEvent | null> {
    await ensureSchema();
    const row = await dbFirst(`SELECT * FROM events WHERE id = ?`, [id]);
    return row ? StorageService.rowToEvent(row) : null;
  }

  static async getEventsWithReminders(): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events WHERE reminder_minutes IS NOT NULL AND status != 'cancelled'`,
      [],
    );
    return rows.map(StorageService.rowToEvent);
  }

  /**
   * Returns master recurring events (daily/weekly/monthly) that have a
   * reminder_minutes set and are not cancelled.  Exception/tombstone rows
   * (is_exception = 1) are excluded — only master series rows are swept.
   *
   * Used by NotificationService.ensureRecurringReminders().
   */
  static async getRecurringRemindableEvents(): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events
       WHERE reminder_minutes IS NOT NULL
         AND recurrence_type IN ('daily', 'weekly', 'monthly')
         AND status != 'cancelled'
         AND is_exception = 0`,
      [],
    );
    return rows.map(StorageService.rowToEvent);
  }

  /**
   * Returns yearly recurring events that are candidates for the renewal prompt.
   *
   * SQL pre-filter:
   *   - recurrence_type = 'yearly'
   *   - reminder_minutes IS NOT NULL (event has a reminder set)
   *   - renewal_ask_suppressed = 0 (user has not permanently suppressed)
   *   - status != 'cancelled'
   *   - last_renewal_ask IS NULL OR last_renewal_ask < date('now','-11 months')
   *     (no ask in the past ~11 months — grace window before the anniversary)
   *
   * JS post-filter: include only events where the most-recent past occurrence
   * (on or before today) exists AND is >= the event's created date.  This
   * ensures brand-new yearly events whose first anniversary has not yet arrived
   * are excluded.
   *
   * Gregorian yearly: occurrence = (month, day) of start_date in the current
   *   year; if that falls after today, use the prior year.
   * Hebrew yearly: derive the most-recent Gregorian date of (hebrewDate.day,
   *   hebrewDate.month) at or before today using @hebcal/core HDate.  Try the
   *   current Hebrew year; if its greg() is after today, try the prior year.
   *   Skip if HDate construction fails (invalid / non-existent date).
   */
  static async getEventsNeedingRenewal(): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events
       WHERE recurrence_type = 'yearly'
         AND reminder_minutes IS NOT NULL
         AND renewal_ask_suppressed = 0
         AND status != 'cancelled'
         AND (last_renewal_ask IS NULL OR last_renewal_ask < date('now', '-11 months'))`,
      [],
    );

    const events = rows.map(StorageService.rowToEvent);

    const today = new Date();
    // Local midnight today — used for "is occurrence on or before today?" check.
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const result: CalendarEvent[] = [];

    for (const event of events) {
      const startDate = event.start.date; // YYYY-MM-DD
      const created   = event.created;    // ISO string

      if (!startDate || !created) continue;

      // Parse created date to local midnight for comparison.
      const [cy, cm, cd] = created.split('T')[0].split('-').map(Number);
      const createdMidnight = new Date(cy, cm - 1, cd);

      let mostRecentOccurrence: Date | null = null;
      const recCal = event.hebrewExtensions.recurrenceCalendar;

      if (recCal === 'hebrew') {
        // Hebrew yearly: use hebrewDate fields.
        const heb = event.hebrewExtensions.hebrewDate;
        if (!heb) continue; // malformed — skip

        const currentHYear = new HDate(today).getFullYear();
        for (const tryYear of [currentHYear, currentHYear - 1]) {
          try {
            const hdate = new HDate(heb.day, heb.month, tryYear);
            const greg = hdate.greg(); // Returns a JS Date (local midnight)
            const occMidnight = new Date(
              greg.getFullYear(), greg.getMonth(), greg.getDate(),
            );
            if (occMidnight <= todayMidnight) {
              mostRecentOccurrence = occMidnight;
              break;
            }
          } catch {
            // Invalid hebrew date for this year (e.g. Adar in non-leap) — try prior.
            continue;
          }
        }
      } else {
        // Gregorian yearly (recurrenceCalendar = 'gregorian' or null).
        const [, mStr, dStr] = startDate.split('-');
        const month = parseInt(mStr, 10) - 1; // JS 0-indexed
        const day   = parseInt(dStr, 10);

        // Try this year's occurrence; if it's in the future, use last year's.
        const thisYear = new Date(todayMidnight.getFullYear(), month, day);
        if (thisYear <= todayMidnight) {
          mostRecentOccurrence = thisYear;
        } else {
          mostRecentOccurrence = new Date(todayMidnight.getFullYear() - 1, month, day);
        }
      }

      // Post-filter: most-recent occurrence must exist and be >= created date.
      if (!mostRecentOccurrence) continue;
      if (mostRecentOccurrence < createdMidnight) continue;

      result.push(event);
    }

    return result;
  }

  /**
   * Records that the renewal prompt was shown (or acted on) for the given event.
   * Sets last_renewal_ask to today's date (YYYY-MM-DD) so the SQL grace window
   * (`last_renewal_ask < date('now','-11 months')`) won't re-surface this event
   * for ~11 months.
   *
   * Date format: YYYY-MM-DD — matches the SQLite date() function comparisons
   * used in getEventsNeedingRenewal.
   */
  static async confirmRenewal(eventId: string): Promise<void> {
    await ensureSchema();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await dbRun(
      `UPDATE events SET last_renewal_ask = ?, updated = ? WHERE id = ?`,
      [todayStr, new Date().toISOString(), eventId],
    );
  }

  /**
   * Permanently suppresses the renewal prompt for the given event.
   * Sets renewal_ask_suppressed = 1 so the event is excluded from future
   * getEventsNeedingRenewal() results regardless of last_renewal_ask.
   *
   * Per spec: suppressing does NOT cancel the reminder — notifications continue.
   */
  static async suppressRenewal(eventId: string): Promise<void> {
    await ensureSchema();
    await dbRun(
      `UPDATE events SET renewal_ask_suppressed = 1, updated = ? WHERE id = ?`,
      [new Date().toISOString(), eventId],
    );
  }
}
