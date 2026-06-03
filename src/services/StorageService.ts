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
import { CalendarEvent } from '../schemas/EventSchema';
import { formatDateKey } from '../utils/dateUtils';

// ── DB handle ──────────────────────────────────────────────────────────────────

let db: SQLiteDatabase | null = null;
let schemaInitialized = false;
let schemaV2Migrated = false;
let schemaColorMigrated = false;

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
        notification_scheduled INTEGER DEFAULT 0
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
      `INSERT OR REPLACE INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        event.id, event.summary, event.description ?? null,
        event.start.date ?? null, event.start.dateTime ?? null,
        event.end.date ?? null, event.end.dateTime ?? null,
        event.status, JSON.stringify(event.recurrence ?? []),
        ext.calendarType,
        ext.hebrewDate?.day ?? null, ext.hebrewDate?.month ?? null,
        ext.hebrewDate?.year ?? null, ext.hebrewDate?.monthName ?? null,
        ext.recurrenceType, ext.category,
        ext.afterSunset ? 1 : 0,
        event.colorId ?? null,
        event.created, event.updated,
        ext.notificationScheduled ? 1 : 0,
        event.reminders?.overrides?.[0]?.minutes ?? null,
      ],
    );
  }

  static async getEventsForGregorianDate(date: Date): Promise<CalendarEvent[]> {
    await ensureSchema();
    const dateStr = formatDateKey(date);
    const rows = await dbAll(
      `SELECT * FROM events WHERE start_date = ? AND status != 'cancelled'`,
      [dateStr],
    );
    return rows.map(StorageService.rowToEvent);
  }

  static async getEventsForHebrewDate(hebrewDay: number, hebrewMonth: number): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events WHERE hebrew_day = ? AND hebrew_month = ?
       AND calendar_type = 'hebrew' AND status != 'cancelled'`,
      [hebrewDay, hebrewMonth],
    );
    return rows.map(StorageService.rowToEvent);
  }

  static async deleteEvent(id: string): Promise<void> {
    await ensureSchema();
    await dbRun(
      `UPDATE events SET status = 'cancelled', updated = ? WHERE id = ?`,
      [new Date().toISOString(), id],
    );
  }

  /**
   * Returns non-recurring events whose start_date falls in the inclusive
   * range [startDate, endDate]. Recurring events are excluded — they are
   * fetched separately via getAllRecurringNotes and expanded by the
   * expandRecurringNotes utility.
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
         AND status != 'cancelled'`,
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
   * Used by useDatesNotes for batch grid rendering (Phase 4.2-1).
   */
  static async getAllRecurringNotes(): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events
       WHERE recurrence_type != 'none'
         AND status != 'cancelled'`,
      [],
    );
    return rows.map(StorageService.rowToEvent);
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
      },
      reminders: row.reminder_minutes != null
        ? { useDefault: false, overrides: [{ method: 'popup' as const, minutes: row.reminder_minutes }] }
        : { useDefault: false },
    };
  }

  static async getEventsWithReminders(): Promise<CalendarEvent[]> {
    await ensureSchema();
    const rows = await dbAll(
      `SELECT * FROM events WHERE reminder_minutes IS NOT NULL AND status != 'cancelled'`,
      [],
    );
    return rows.map(StorageService.rowToEvent);
  }
}
