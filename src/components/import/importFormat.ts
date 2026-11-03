// src/components/import/importFormat.ts
// Hebrew string formatting for the .ics import screen (labels, date columns,
// ranges, singular/plural). Pure display logic; no parsing or storage here.

import { dateService, toHebrewNumeral, toHebrewYear } from '../../services/DateService';
import {
  eventDayCount,
  localTimeRange,
  mapRecurrence,
  type ParsedIcsEvent,
} from '../../services/IcsParser';

const SHORT_MONTHS = [
  'ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני',
  'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳',
] as const;

const RECURRENCE_LABEL: Record<string, string> = {
  daily: 'יום',
  weekly: 'שבוע',
  monthly: 'חודש',
  yearly: 'שנה',
};

interface Ymd {
  y: number;
  m: number;
  d: number;
}

function parseYmd(s: string): Ymd {
  return { y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)), d: Number(s.slice(8, 10)) };
}

/** Hebrew day numeral with geresh / gershayim, e.g. 3 -> ג׳, 23 -> כ״ג. */
function hebrewDay(n: number): string {
  const letters = toHebrewNumeral(n);
  if (letters.length <= 1) return `${letters}׳`;
  return `${letters.slice(0, -1)}״${letters.slice(-1)}`;
}

interface HebParts {
  day: number;
  monthName: string;
  year: number;
}

function hebParts(ymd: string): HebParts {
  const { y, m, d } = parseYmd(ymd);
  const h = dateService.getDayData(new Date(y, m - 1, d)).hebrewDate;
  return { day: h.day, monthName: h.monthName, year: h.year };
}

/** "כ״ג בטבת" or, for a span, "ג׳–ז׳ באדר" / "כ״ג בטבת – ב׳ בשבט". */
export function formatHebrewDateColumn(startDate: string, endDate: string): string {
  const a = hebParts(startDate);
  if (endDate === startDate) return `${hebrewDay(a.day)} ב${a.monthName}`;
  const b = hebParts(endDate);
  if (a.monthName === b.monthName && a.year === b.year) {
    return `${hebrewDay(a.day)}–${hebrewDay(b.day)} ב${a.monthName}`;
  }
  return `${hebrewDay(a.day)} ב${a.monthName} – ${hebrewDay(b.day)} ב${b.monthName}`;
}

/** "12 בינו׳" or, for a span, "20–24 בפבר׳" / "20 בינו׳ – 3 בפבר׳". */
export function formatGregorianDateColumn(startDate: string, endDate: string): string {
  const a = parseYmd(startDate);
  if (endDate === startDate) return `${a.d} ב${SHORT_MONTHS[a.m - 1]}`;
  const b = parseYmd(endDate);
  if (a.m === b.m && a.y === b.y) return `${a.d}–${b.d} ב${SHORT_MONTHS[a.m - 1]}`;
  return `${a.d} ב${SHORT_MONTHS[a.m - 1]} – ${b.d} ב${SHORT_MONTHS[b.m - 1]}`;
}

/** Gregorian range: "ינו׳ – דצמ׳ 2026" / "נוב׳ 2026 – פבר׳ 2027" / "ינו׳ 2026". */
export function formatGregorianRange(startDate: string, endDate: string): string {
  const a = parseYmd(startDate);
  const b = parseYmd(endDate);
  if (a.y === b.y && a.m === b.m) return `${SHORT_MONTHS[a.m - 1]} ${a.y}`;
  if (a.y === b.y) return `${SHORT_MONTHS[a.m - 1]} – ${SHORT_MONTHS[b.m - 1]} ${a.y}`;
  return `${SHORT_MONTHS[a.m - 1]} ${a.y} – ${SHORT_MONTHS[b.m - 1]} ${b.y}`;
}

/** Hebrew range: "טבת תשפ״ו – טבת תשפ״ז" (collapses same month / same year). */
export function formatHebrewRange(startDate: string, endDate: string): string {
  const a = hebParts(startDate);
  const b = hebParts(endDate);
  if (a.year === b.year && a.monthName === b.monthName) {
    return `${a.monthName} ${toHebrewYear(a.year)}`;
  }
  if (a.year === b.year) return `${a.monthName} – ${b.monthName} ${toHebrewYear(a.year)}`;
  return `${a.monthName} ${toHebrewYear(a.year)} – ${b.monthName} ${toHebrewYear(b.year)}`;
}

/** Second line of a preview row: "כל היום" / "{n} ימים" / "HH:mm – HH:mm", plus recurrence. */
export function formatEventMeta(e: ParsedIcsEvent): string {
  let base: string;
  if (e.allDay) {
    const days = eventDayCount(e);
    base = days > 1 ? `${days} ימים` : 'כל היום';
  } else {
    base = localTimeRange(e) ?? 'כל היום';
  }
  const rec = RECURRENCE_LABEL[mapRecurrence(e).recurrenceType];
  return rec ? `${base} · חוזר כל ${rec}` : base;
}

/** "קובץ יומן · 18 ק״ב" (KB rounded up, minimum 1); no size known -> "קובץ יומן". */
export function formatFileSizeLine(sizeBytes: number | undefined): string {
  if (sizeBytes === undefined || !Number.isFinite(sizeBytes) || sizeBytes < 0) return 'קובץ יומן';
  return `קובץ יומן · ${Math.max(1, Math.ceil(sizeBytes / 1024))} ק״ב`;
}

export function importButtonLabel(n: number): string {
  return n === 1 ? 'ייבא אירוע אחד' : `ייבא ${n} אירועים`;
}

export function importedTitle(n: number): string {
  return n === 1 ? 'יובא אירוע אחד' : `יובאו ${n} אירועים`;
}

export function skippedLine(k: number): string {
  return k === 1
    ? 'אירוע אחד שכבר היה קיים דולג.'
    : `${k} אירועים שכבר היו קיימים דולגו.`;
}

export function allDuplicatesBody(n: number): string {
  return n === 1
    ? 'האירוע בקובץ כבר קיים ביומן מייבוא קודם. לא יתווסף דבר.'
    : `כל ${n} האירועים בקובץ כבר קיימים ביומן מייבוא קודם. לא יתווסף דבר.`;
}

/** File name from a URI when the caller did not provide one. */
export function fileNameFromUri(uri: string): string {
  const last = uri.split(/[\\/]/).pop() ?? '';
  const clean = last.split('?')[0];
  try {
    return decodeURIComponent(clean) || 'calendar.ics';
  } catch {
    return clean || 'calendar.ics';
  }
}
