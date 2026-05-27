// src/services/StorageService.ts

import * as SQLite from 'expo-sqlite';
import { CalendarEvent } from '../schemas/EventSchema';

// ── Database handle ────────────────────────────────────────────────────────────
// openDatabaseSync returns the same async query methods (execAsync, getAllAsync,
// runAsync, getFirstAsync) as openDatabaseAsync, but opens synchronously.
// This is required for standard Expo Go, which ships the classic SQLite native
// module — the "Next" async API (openDatabaseAsync) throws "Unimplemented"
// there at runtime.
let db: SQLite.SQLiteDatabase | null = null;
let schemaInitialized = false;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('calendar.db');
  }
  return db;
}

async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;
  await getDb().execAsync(`
    CREATE TABLE IF NOT EXISTS events (
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
    );
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  schemaInitialized = true;
}

export class StorageService {
  // Called explicitly on app startup from _layout.tsx; also safe to skip —
  // any public method will call ensureSchema() itself on first use.
  static async init(): Promise<void> {
    await ensureSchema();
  }

  // ── Events ────────────────────────────────────────────────

  static async saveEvent(event: CalendarEvent): Promise<void> {
    await ensureSchema();
    const database = getDb();
    const ext = event.hebrewExtensions;
    await database.runAsync(
      `INSERT OR REPLACE INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      ]
    );
  }

  static async getEventsForGregorianDate(date: Date): Promise<CalendarEvent[]> {
    await ensureSchema();
    const database = getDb();
    const dateStr = date.toISOString().split('T')[0];
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM events WHERE start_date = ? AND status != 'cancelled'`,
      [dateStr]
    );
    return rows.map(StorageService.rowToEvent);
  }

  static async getEventsForHebrewDate(hebrewDay: number, hebrewMonth: number): Promise<CalendarEvent[]> {
    await ensureSchema();
    const database = getDb();
    const rows = await database.getAllAsync<any>(
      `SELECT * FROM events WHERE hebrew_day = ? AND hebrew_month = ?
       AND calendar_type = 'hebrew' AND status != 'cancelled'`,
      [hebrewDay, hebrewMonth]
    );
    return rows.map(StorageService.rowToEvent);
  }

  static async deleteEvent(id: string): Promise<void> {
    await ensureSchema();
    const database = getDb();
    await database.runAsync(
      `UPDATE events SET status = 'cancelled', updated = ? WHERE id = ?`,
      [new Date().toISOString(), id]
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
    const database = getDb();
    const startStr = startDate.toISOString().split('T')[0];
    const endStr   = endDate.toISOString().split('T')[0];
    const rows = await database.getAllAsync<any>(
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
   * Returns ALL events with recurrence_type other than 'none', regardless
   * of date. The caller (expandRecurringNotes utility) decides which
   * instances fall within a given range.
   *
   * Used by useDatesNotes for batch grid rendering (Phase 4.2-1).
   */
  static async getAllRecurringNotes(): Promise<CalendarEvent[]> {
    await ensureSchema();
    const database = getDb();
    const rows = await database.getAllAsync<any>(
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
    const database = getDb();
    const row = await database.getFirstAsync<{ value: string }>(
      `SELECT value FROM preferences WHERE key = ?`, [key]
    );
    return row?.value ?? defaultValue;
  }

  static async setPref(key: string, value: string): Promise<void> {
    await ensureSchema();
    const database = getDb();
    await database.runAsync(
      `INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  // ── Row Mapper ────────────────────────────────────────────

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
      }
    };
  }
}
