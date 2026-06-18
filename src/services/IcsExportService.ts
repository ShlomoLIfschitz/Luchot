// src/services/IcsExportService.ts
// Exports all personal calendar events (and optionally hebcal Jewish calendar
// events for the current Hebrew year) to a standard iCalendar (.ics) file,
// then shares it via the OS share sheet.

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { HebrewCalendar, HDate } from '@hebcal/core';
import { StorageService } from './StorageService';

// ── iCal string helpers ────────────────────────────────────────────────────────

function escapeIcal(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/** YYYY-MM-DD → YYYYMMDD */
function dateStrToIcal(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

/** ISO 8601 → YYYYMMDDTHHMMSSZ */
function isoToIcalTimestamp(isoStr: string): string {
  return new Date(isoStr).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/** YYYY-MM-DD → YYYYMMDD of the following day (for DTEND of all-day events) */
function nextDayIcal(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

/** JavaScript Date → YYYYMMDD (UTC) */
function dateToIcalDate(d: Date): string {
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

/** Sanitise a string for use in a UID field (ASCII only) */
function sanitiseUid(s: string): string {
  return s.replace(/[^A-Za-z0-9@.\-_]/g, '-');
}

// ── Main export function ───────────────────────────────────────────────────────

/**
 * Builds a .ics file from all personal events in SQLite (always), plus
 * optionally all major hebcal Jewish calendar events for the current
 * Hebrew year. Writes the file to the app cache directory and triggers
 * the OS share sheet.
 *
 * Throws a Hebrew-language Error on failure so the UI can display it
 * directly in an Alert.
 */
export async function exportCalendar(includeHebcal: boolean): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('שיתוף קבצים אינו זמין במכשיר זה');
  }

  const lines: string[] = [];

  // ── VCALENDAR header ──────────────────────────────────────────────────────
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Luchot//Luchot Calendar//HE');
  lines.push('CALNAME:לוחות');
  lines.push('X-WR-CALNAME:לוחות');

  // ── Personal events ───────────────────────────────────────────────────────
  const events = await StorageService.getAllEvents();

  for (const event of events) {
    const rawDate = event.start.date ?? event.start.dateTime?.split('T')[0] ?? '';
    if (!rawDate) continue;

    const dtStart  = dateStrToIcal(rawDate);
    // Bug 1 fix: use the real end date instead of always start+1
    const endRaw   = event.end?.date ?? rawDate;
    const dtEnd    = nextDayIcal(endRaw);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${sanitiseUid(event.id + '@luchot')}`);
    lines.push(`SUMMARY:${escapeIcal(event.summary)}`);
    lines.push(`DESCRIPTION:${escapeIcal(event.description ?? '')}`);
    // Bug 2 fix: timed events get real UTC timestamps; all-day events keep VALUE=DATE
    if (event.start.dateTime) {
      const dtStartTimed = isoToIcalTimestamp(event.start.dateTime);
      const dtEndTimed   = event.end?.dateTime
        ? isoToIcalTimestamp(event.end.dateTime)
        : isoToIcalTimestamp(event.start.dateTime); // fallback: same as start
      lines.push(`DTSTART:${dtStartTimed}`);
      lines.push(`DTEND:${dtEndTimed}`);
    } else {
      // All-day event — DTEND is exclusive (Bug 1 fix applied via dtEnd)
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    }
    lines.push(`CREATED:${isoToIcalTimestamp(event.created)}`);
    lines.push(`LAST-MODIFIED:${isoToIcalTimestamp(event.updated)}`);
    lines.push('END:VEVENT');
  }

  // ── Jewish calendar events (optional) ─────────────────────────────────────
  if (includeHebcal) {
    const currentHYear = new HDate().getFullYear();

    const hebEvents = HebrewCalendar.calendar({
      year: currentHYear,
      isHebrewYear: true,
      sedrot: true,
      omer: false,
      shabbatMevarchim: false,
      noModern: false,
      candlelighting: false,
      il: true,
    });

    for (const ev of hebEvents) {
      const cats = ev.getCategories();
      const isRelevant = cats.some((c) =>
        c === 'holiday' || c === 'roshchodesh' || c === 'shabbat',
      );
      if (!isRelevant) continue;

      const gregDate = ev.getDate().greg();
      const dtStart  = dateToIcalDate(gregDate);
      const dtEndDate = new Date(gregDate);
      dtEndDate.setUTCDate(dtEndDate.getUTCDate() + 1);
      const dtEnd = dateToIcalDate(dtEndDate);

      const rawUid = `${ev.getDate().toString()}-${ev.getDesc()}@luchot-hebcal`;
      const uid = sanitiseUid(rawUid);

      const summaryHe = ev.render('he');
      let descriptionEn = '';
      try {
        descriptionEn = ev.renderBrief('en');
      } catch {
        descriptionEn = ev.getDesc();
      }

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`SUMMARY:${escapeIcal(summaryHe)}`);
      lines.push(`DESCRIPTION:${escapeIcal(descriptionEn)}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push('END:VEVENT');
    }
  }

  lines.push('END:VCALENDAR');

  // ── Write + share ─────────────────────────────────────────────────────────
  const icsContent = lines.join('\r\n');

  const today    = new Date().toISOString().split('T')[0];
  const fileName = `luchot-${today}.ics`;
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('תיקיית המטמון אינה זמינה');
  }
  const uri = cacheDir + fileName;

  await FileSystem.writeAsStringAsync(uri, icsContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  await Sharing.shareAsync(uri, {
    mimeType: 'text/calendar',
    dialogTitle: 'ייצוא לוח שנה',
  });
}
