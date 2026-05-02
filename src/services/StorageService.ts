// src/services/StorageService.ts

import * as SQLite from 'expo-sqlite';
import { CalendarEvent } from '../schemas/EventSchema';

const db = SQLite.openDatabaseSync('calendar.db');

export class StorageService {
  static init() {
    db.execSync(`
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
  }

  // ── Events ────────────────────────────────────────────────

  static saveEvent(event: CalendarEvent): void {
    const ext = event.hebrewExtensions;
    db.runSync(
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

  static getEventsForGregorianDate(date: Date): CalendarEvent[] {
    const dateStr = date.toISOString().split('T')[0];
    const rows = db.getAllSync<any>(
      `SELECT * FROM events WHERE start_date = ? AND status != 'cancelled'`,
      [dateStr]
    );
    return rows.map(StorageService.rowToEvent);
  }

  static getEventsForHebrewDate(hebrewDay: number, hebrewMonth: number): CalendarEvent[] {
    const rows = db.getAllSync<any>(
      `SELECT * FROM events WHERE hebrew_day = ? AND hebrew_month = ? 
       AND calendar_type = 'hebrew' AND status != 'cancelled'`,
      [hebrewDay, hebrewMonth]
    );
    return rows.map(StorageService.rowToEvent);
  }

  static deleteEvent(id: string): void {
    db.runSync(`UPDATE events SET status = 'cancelled', updated = ? WHERE id = ?`, [
      new Date().toISOString(), id
    ]);
  }

  // ── Preferences ───────────────────────────────────────────

  static getPref(key: string, defaultValue: string): string {
    const row = db.getFirstSync<{ value: string }>(
      `SELECT value FROM preferences WHERE key = ?`, [key]
    );
    return row?.value ?? defaultValue;
  }

  static setPref(key: string, value: string): void {
    db.runSync(
      `INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  // ── Row Mapper ────────────────────────────────────────────

  private static rowToEvent(row: any): CalendarEvent {
    return {
      id: row.id,
      summary: row.summary,
      description: row.description,
      status: row.status,
      created: row.created,
      updated: row.updated,
      start: { date: row.start_date, dateTime: row.start_datetime },
      end: { date: row.end_date, dateTime: row.end_datetime },
      recurrence: JSON.parse(row.recurrence || '[]'),
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
