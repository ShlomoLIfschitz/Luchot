// src/services/IcsParser.ts
// Pure RFC 5545 (.ics) parser + mapping to CalendarEvent + duplicate classification.
//
// Runs under plain Node (`node --experimental-strip-types`) so it can be tested
// without a device: the ONLY value imports are `luxon` and `@hebcal/core`; the
// schema import is type-only. Do not add react-native / expo / relative value
// imports here.
//
// Security posture: the input is an untrusted file. Every scan is a single
// linear pass (no regex with nested quantifiers), the VEVENT count is capped
// (MAX_VEVENTS), text fields are length-capped, and nothing is eval'd or logged.

// No @types/luxon in the project (luxon is a transitive dep of kosher-zmanim).
// Only the tiny surface used below is typed, locally.
// @ts-ignore TS7016: untyped module
import { DateTime as LuxonDateTime } from 'luxon';
import { HDate } from '@hebcal/core';
import type { CalendarEvent, NoteCategory, RecurrenceType } from '../schemas/EventSchema';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ParsedIcsEvent {
  uid?: string;
  recurrenceId?: string;
  summary: string;
  description?: string;
  location?: string;
  allDay: boolean;
  /** YYYY-MM-DD, device-local calendar date. */
  startDate: string;
  /** YYYY-MM-DD, INCLUSIVE, device-local calendar date. */
  endDate: string;
  /** UTC ISO instant (timed events only). */
  startDateTime?: string;
  endDateTime?: string;
  /** IANA zone the source expressed the time in ('UTC' for Z times); undefined for floating. */
  timeZone?: string;
  /** The raw 'RRULE:...' line value (first RRULE only). */
  rrule?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

export type IcsParseResult =
  | { ok: true; events: ParsedIcsEvent[]; truncated: boolean }
  | { ok: false; reason: 'not_ics' };

export interface MappedRecurrence {
  recurrenceType: RecurrenceType;
  recurrenceCalendar: 'hebrew' | 'gregorian' | undefined;
}

export interface DuplicateClassification {
  /** Same order as input. */
  items: Array<{ event: ParsedIcsEvent; duplicate: boolean }>;
  toImport: ParsedIcsEvent[];
  duplicates: ParsedIcsEvent[];
}

/** Hard cap on VEVENTs processed from one file; the rest are ignored (`truncated`). */
export const MAX_VEVENTS = 5000;
export const UNTITLED_SUMMARY = '(ללא כותרת)';

const MAX_SUMMARY = 500;
const MAX_DESCRIPTION = 20000;
const MAX_LOCATION = 500;
const MAX_UID = 500;

// ── Content-line parsing ───────────────────────────────────────────────────────

interface ContentLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** RFC 5545 §3.1: a line break followed by one space/tab continues the previous line. */
function unfold(text: string): string[] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const raw = src.split(/\r\n|\n|\r/);
  const out: string[] = [];
  for (const line of raw) {
    const c = line.charCodeAt(0);
    if ((c === 0x20 || c === 0x09) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Single linear scan: NAME;PARAM=V;PARAM="V;x":value  (quotes may hide ; : ,). */
function parseContentLine(line: string): ContentLine | null {
  const n = line.length;
  let i = 0;
  while (i < n && line[i] !== ';' && line[i] !== ':') i++;
  if (i >= n || i === 0) return null;
  const name = line.slice(0, i).toUpperCase();
  const params: Record<string, string> = {};

  while (i < n && line[i] === ';') {
    i++; // skip ';'
    const nameStart = i;
    while (i < n && line[i] !== '=' && line[i] !== ';' && line[i] !== ':') i++;
    const pName = line.slice(nameStart, i).toUpperCase();
    let pValue = '';
    if (i < n && line[i] === '=') {
      i++;
      if (line[i] === '"') {
        i++;
        const vStart = i;
        while (i < n && line[i] !== '"') i++;
        pValue = line.slice(vStart, i);
        if (i < n) i++; // closing quote
        // tolerate extra comma-separated values after a quoted one: skip to ; or :
        while (i < n && line[i] !== ';' && line[i] !== ':') i++;
      } else {
        const vStart = i;
        while (i < n && line[i] !== ';' && line[i] !== ':') i++;
        pValue = line.slice(vStart, i);
      }
    }
    if (pName) params[pName] = pValue;
  }
  if (i >= n || line[i] !== ':') return null;
  return { name, params, value: line.slice(i + 1) };
}

/** RFC 5545 TEXT unescape: \n \N \, \; \\  (single pass; unknown escapes keep the char). */
function unescapeText(s: string): string {
  if (s.indexOf('\\') === -1) return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length) {
      const nx = s[i + 1];
      out += nx === 'n' || nx === 'N' ? '\n' : nx;
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

// ── Date helpers (no relative imports, so formatDateKey is reimplemented) ──────

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar date key — same output as src/utils/dateUtils.formatDateKey. */
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** YYYY-MM-DD → Date at UTC midnight (pure calendar arithmetic, DST-free). */
function ymdToUtc(ymd: string): Date {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

function addDaysYmd(ymd: string, days: number): string {
  const d = ymdToUtc(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

interface IcsDateValue {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
  hasTime: boolean;
  utc: boolean;
}

const DATE_RE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/;

function parseIcsDateValue(raw: string): IcsDateValue | null {
  const m = DATE_RE.exec(raw.trim().toUpperCase());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const hasTime = m[4] !== undefined;
  const h = hasTime ? Number(m[4]) : 0;
  const mi = hasTime ? Number(m[5]) : 0;
  const s = hasTime ? Number(m[6]) : 0;
  if (h > 23 || mi > 59 || s > 60) return null;
  return { y, mo, d, h, mi, s: Math.min(s, 59), hasTime, utc: m[7] === 'Z' };
}

/** Windows time-zone names (Outlook) → IANA. */
const WINDOWS_TZ: Record<string, string> = {
  'israel standard time': 'Asia/Jerusalem',
  'jerusalem standard time': 'Asia/Jerusalem',
  'pacific standard time': 'America/Los_Angeles',
  'eastern standard time': 'America/New_York',
  'central standard time': 'America/Chicago',
  'mountain standard time': 'America/Denver',
  'gmt standard time': 'Europe/London',
  'w. europe standard time': 'Europe/Berlin',
  utc: 'UTC',
};

interface Resolved {
  date: Date;
  /** IANA zone used; undefined = floating (device local). */
  timeZone: string | undefined;
}

function toDate(v: IcsDateValue, tzid: string | undefined): Resolved | null {
  if (v.utc) {
    const t = Date.UTC(v.y, v.mo - 1, v.d, v.h, v.mi, v.s);
    return Number.isNaN(t) ? null : { date: new Date(t), timeZone: 'UTC' };
  }
  if (tzid) {
    const candidates = [tzid];
    const mapped = WINDOWS_TZ[tzid.toLowerCase()];
    if (mapped) candidates.push(mapped);
    for (const zone of candidates) {
      const dt = LuxonDateTime.fromObject({
        year: v.y, month: v.mo, day: v.d, hour: v.h, minute: v.mi, second: v.s, zone,
      }) as { isValid: boolean; toMillis(): number };
      if (dt.isValid) return { date: new Date(dt.toMillis()), timeZone: zone };
    }
    // unknown zone → fall through to floating
  }
  const local = new Date(v.y, v.mo - 1, v.d, v.h, v.mi, v.s);
  return Number.isNaN(local.getTime()) ? null : { date: local, timeZone: undefined };
}

const DURATION_RE = /^([+-])?P(?:(\d{1,6})W)?(?:(\d{1,6})D)?(?:T(?:(\d{1,6})H)?(?:(\d{1,6})M)?(?:(\d{1,6})S)?)?$/;

/** Minimal DURATION: PnW, PnD, PTnHnMnS combos. Returns {days, ms} or null. */
function parseDuration(raw: string): { days: number; ms: number } | null {
  const m = DURATION_RE.exec(raw.trim().toUpperCase());
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  const days = (Number(m[2] ?? 0) * 7 + Number(m[3] ?? 0)) * sign;
  const ms = ((Number(m[4] ?? 0) * 3600 + Number(m[5] ?? 0) * 60 + Number(m[6] ?? 0)) * 1000) * sign;
  return { days, ms };
}

// ── VEVENT assembly ────────────────────────────────────────────────────────────

interface RawEvent {
  props: ContentLine[];
}

function first(props: ContentLine[], name: string): ContentLine | undefined {
  for (const p of props) if (p.name === name) return p;
  return undefined;
}

function cap(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

function buildEvent(raw: RawEvent): ParsedIcsEvent | null {
  const props = raw.props;

  const status = first(props, 'STATUS')?.value.trim().toUpperCase();
  if (status === 'CANCELLED') return null;

  const dtStartLine = first(props, 'DTSTART');
  if (!dtStartLine) return null;
  const startVal = parseIcsDateValue(dtStartLine.value);
  if (!startVal) return null;

  const allDay = dtStartLine.params['VALUE']?.toUpperCase() === 'DATE' || !startVal.hasTime;

  const dtEndLine = first(props, 'DTEND');
  const durationLine = first(props, 'DURATION');

  let startDate: string;
  let endDate: string;
  let startDateTime: string | undefined;
  let endDateTime: string | undefined;
  let timeZone: string | undefined;

  if (allDay) {
    startDate = `${String(startVal.y).padStart(4, '0')}-${pad2(startVal.mo)}-${pad2(startVal.d)}`;
    // Reject impossible dates like 20260231 (Date.UTC would roll over).
    if (addDaysYmd(startDate, 0) !== startDate) return null;
    endDate = startDate;
    const endVal = dtEndLine ? parseIcsDateValue(dtEndLine.value) : null;
    if (endVal) {
      // DTEND is EXCLUSIVE for all-day events.
      const endExclusive = `${String(endVal.y).padStart(4, '0')}-${pad2(endVal.mo)}-${pad2(endVal.d)}`;
      if (addDaysYmd(endExclusive, 0) === endExclusive) endDate = addDaysYmd(endExclusive, -1);
    } else if (durationLine) {
      const dur = parseDuration(durationLine.value);
      if (dur && dur.days > 0) endDate = addDaysYmd(startDate, dur.days - 1);
    }
    if (endDate < startDate) endDate = startDate; // clamp (ISO date strings compare lexicographically)
  } else {
    const tzid = dtStartLine.params['TZID'];
    const resolvedStart = toDate(startVal, tzid);
    if (!resolvedStart) return null;
    timeZone = resolvedStart.timeZone;
    let endMs = resolvedStart.date.getTime();

    const endVal = dtEndLine ? parseIcsDateValue(dtEndLine.value) : null;
    if (endVal && endVal.hasTime) {
      const resolvedEnd = toDate(endVal, dtEndLine?.params['TZID'] ?? tzid);
      if (resolvedEnd) endMs = resolvedEnd.date.getTime();
    } else if (!endVal && durationLine) {
      const dur = parseDuration(durationLine.value);
      if (dur) endMs += dur.days * 86400000 + dur.ms;
    }
    if (endMs < resolvedStart.date.getTime()) endMs = resolvedStart.date.getTime();

    const startD = resolvedStart.date;
    const endD = new Date(endMs);
    startDate = localDateKey(startD);
    startDateTime = startD.toISOString();
    endDateTime = endD.toISOString();
    // An event ending exactly at local midnight (Google does this for "until
    // midnight") belongs to the previous day, not a spurious extra one.
    const endsAtMidnight =
      endMs > startD.getTime() &&
      endD.getHours() === 0 && endD.getMinutes() === 0 && endD.getSeconds() === 0 && endD.getMilliseconds() === 0;
    endDate = localDateKey(endsAtMidnight ? new Date(endMs - 1) : endD);
    if (endDate < startDate) endDate = startDate;
  }

  const summaryRaw = first(props, 'SUMMARY')?.value;
  const summary = cap(unescapeText(summaryRaw ?? '').trim(), MAX_SUMMARY) || UNTITLED_SUMMARY;

  const uidRaw = first(props, 'UID')?.value.trim();
  const recurrenceIdRaw = first(props, 'RECURRENCE-ID')?.value.trim();
  const descRaw = first(props, 'DESCRIPTION')?.value;
  const locRaw = first(props, 'LOCATION')?.value;
  const rruleLine = first(props, 'RRULE');

  const event: ParsedIcsEvent = {
    summary,
    allDay,
    startDate,
    endDate,
  };
  if (uidRaw) event.uid = cap(uidRaw, MAX_UID);
  if (recurrenceIdRaw) event.recurrenceId = cap(recurrenceIdRaw, MAX_UID);
  const description = descRaw ? cap(unescapeText(descRaw).trim(), MAX_DESCRIPTION) : '';
  if (description) event.description = description;
  const location = locRaw ? cap(unescapeText(locRaw).trim(), MAX_LOCATION) : '';
  if (location) event.location = location;
  if (!allDay) {
    event.startDateTime = startDateTime;
    event.endDateTime = endDateTime;
    if (timeZone) event.timeZone = timeZone;
  }
  if (rruleLine && rruleLine.value.trim()) event.rrule = `RRULE:${rruleLine.value.trim()}`;
  if (status === 'TENTATIVE') event.status = 'tentative';
  else if (status === 'CONFIRMED') event.status = 'confirmed';
  return event;
}

// ── Public: parse ──────────────────────────────────────────────────────────────

export function parseIcs(text: string): IcsParseResult {
  const lines = unfold(text);

  const stack: string[] = [];
  let sawCalendar = false;
  let current: RawEvent | null = null;
  let seenVevents = 0;
  let truncated = false;
  const events: ParsedIcsEvent[] = [];

  for (const line of lines) {
    if (line.length === 0) continue;
    const cl = parseContentLine(line);
    if (!cl) continue;

    if (cl.name === 'BEGIN') {
      const comp = cl.value.trim().toUpperCase();
      if (comp === 'VCALENDAR') sawCalendar = true;
      if (stack.length < 16) stack.push(comp); // bounded nesting
      if (comp === 'VEVENT' && stack.length === 2 && stack[0] === 'VCALENDAR') {
        seenVevents++;
        if (seenVevents > MAX_VEVENTS) {
          truncated = true;
          break;
        }
        current = { props: [] };
      }
      continue;
    }
    if (cl.name === 'END') {
      const comp = cl.value.trim().toUpperCase();
      if (comp === 'VEVENT' && current && stack.length === 2 && stack[1] === 'VEVENT') {
        const ev = buildEvent(current);
        if (ev) events.push(ev);
        current = null;
      }
      // pop to the matching component (tolerates mismatched END in malformed files)
      const idx = stack.lastIndexOf(comp);
      if (idx !== -1) stack.length = idx;
      continue;
    }

    // Collect properties only when directly inside a VEVENT (not VALARM etc.).
    if (current && stack.length === 2 && stack[1] === 'VEVENT') {
      current.props.push(cl);
    }
  }

  if (!sawCalendar) return { ok: false, reason: 'not_ics' };
  return { ok: true, events, truncated };
}

// ── Source keys / duplicates ───────────────────────────────────────────────────

const LUCHOT_SUFFIX = '@luchot';
const LUCHOT_HEBCAL_SUFFIX = '@luchot-hebcal';

/** UID, or UID|RECURRENCE-ID for override instances. Undefined when the VEVENT has no UID. */
export function sourceKeyOf(e: ParsedIcsEvent): string | undefined {
  if (!e.uid) return undefined;
  return e.recurrenceId ? `${e.uid}|${e.recurrenceId}` : e.uid;
}

/** For a Luchot-exported UID `<id>@luchot` returns the events.id; otherwise undefined. */
export function luchotEventIdOf(e: ParsedIcsEvent): string | undefined {
  const uid = e.uid;
  if (!uid || e.recurrenceId || !uid.endsWith(LUCHOT_SUFFIX)) return undefined;
  const id = uid.slice(0, uid.length - LUCHOT_SUFFIX.length);
  return id.length > 0 ? id : undefined;
}

/** Holidays Luchot already shows (exported with includeHebcal). */
export function isLuchotHebcalEvent(e: ParsedIcsEvent): boolean {
  return !!e.uid && e.uid.endsWith(LUCHOT_HEBCAL_SUFFIX);
}

/**
 * Pure duplicate classification. Inputs come from two batched DB lookups:
 *  - importedKeys: source keys present in ics_imports whose mapped event still
 *    exists with status != 'cancelled'
 *  - existingIds: events.id values that exist with status != 'cancelled'
 * A VEVENT is a duplicate when (a) its source key is in importedKeys, (b) it is a
 * Luchot export UID whose id is in existingIds, (c) it is an @luchot-hebcal
 * holiday, or (d) the same source key already appeared earlier in this file.
 */
export function classifyDuplicates(
  events: ParsedIcsEvent[],
  importedKeys: Set<string>,
  existingIds: Set<string>,
): DuplicateClassification {
  const seen = new Set<string>();
  const items: Array<{ event: ParsedIcsEvent; duplicate: boolean }> = [];
  const toImport: ParsedIcsEvent[] = [];
  const duplicates: ParsedIcsEvent[] = [];

  for (const event of events) {
    const key = sourceKeyOf(event);
    const luchotId = luchotEventIdOf(event);
    const duplicate =
      isLuchotHebcalEvent(event) ||
      (key !== undefined && importedKeys.has(key)) ||
      (luchotId !== undefined && existingIds.has(luchotId)) ||
      (key !== undefined && seen.has(key));
    if (key !== undefined) seen.add(key);
    items.push({ event, duplicate });
    if (duplicate) duplicates.push(event);
    else toImport.push(event);
  }
  return { items, toImport, duplicates };
}

// ── Recurrence mapping ─────────────────────────────────────────────────────────

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function parseRrule(rrule: string): Record<string, string> | null {
  const body = rrule.startsWith('RRULE:') ? rrule.slice(6) : rrule;
  const out: Record<string, string> = {};
  for (const part of body.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) return null;
    out[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).toUpperCase();
  }
  return out.FREQ ? out : null;
}

/**
 * Which Luchot recurrence the RRULE maps to. Luchot only expands recurrenceType;
 * the RRULE string alone does nothing. Only "simple" rules (FREQ only, or with
 * parts implied by DTSTART, no COUNT/UNTIL, INTERVAL 1) become recurring; every
 * other rule keeps the RRULE text but imports as a one-off ('none').
 */
export function mapRecurrence(e: ParsedIcsEvent): MappedRecurrence {
  const none: MappedRecurrence = { recurrenceType: 'none', recurrenceCalendar: undefined };
  if (!e.rrule) return none;
  // Luchot forbids multi-day recurring events.
  if (e.endDate !== e.startDate) return none;
  const r = parseRrule(e.rrule);
  if (!r) return none;

  const y = Number(e.startDate.slice(0, 4));
  const mo = Number(e.startDate.slice(5, 7));
  const d = Number(e.startDate.slice(8, 10));
  const weekday = WEEKDAY_CODES[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];

  for (const key of Object.keys(r)) {
    const v = r[key];
    switch (key) {
      case 'FREQ':
      case 'WKST':
        break;
      case 'INTERVAL':
        if (v !== '1') return none;
        break;
      case 'BYDAY':
        if (!(r.FREQ === 'WEEKLY' && v === weekday)) return none;
        break;
      case 'BYMONTHDAY':
        if (!((r.FREQ === 'MONTHLY' || r.FREQ === 'YEARLY') && v === String(d))) return none;
        break;
      case 'BYMONTH':
        if (!(r.FREQ === 'YEARLY' && v === String(mo))) return none;
        break;
      default: // COUNT, UNTIL, BYSETPOS, BYYEARDAY, ...
        return none;
    }
  }

  switch (r.FREQ) {
    case 'DAILY':
      return { recurrenceType: 'daily', recurrenceCalendar: undefined };
    case 'WEEKLY':
      return { recurrenceType: 'weekly', recurrenceCalendar: undefined };
    case 'MONTHLY':
      return { recurrenceType: 'monthly', recurrenceCalendar: 'gregorian' };
    case 'YEARLY':
      return { recurrenceType: 'yearly', recurrenceCalendar: 'gregorian' };
    default:
      return none;
  }
}

/** True when the RRULE becomes a real Luchot recurrence (for the preview text). */
export function isSimpleRecurrence(e: ParsedIcsEvent): boolean {
  return mapRecurrence(e).recurrenceType !== 'none';
}

// ── Display helpers for the UI ─────────────────────────────────────────────────

/** Number of calendar days the event spans (>= 1). */
export function eventDayCount(e: ParsedIcsEvent): number {
  const ms = ymdToUtc(e.endDate).getTime() - ymdToUtc(e.startDate).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

/** 'HH:mm – HH:mm' (24h, device-local) for timed events; undefined for all-day. */
export function localTimeRange(e: ParsedIcsEvent): string | undefined {
  if (e.allDay || !e.startDateTime) return undefined;
  const fmt = (iso: string): string => {
    const d = new Date(iso);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const start = fmt(e.startDateTime);
  const end = e.endDateTime ? fmt(e.endDateTime) : start;
  return `${start} – ${end}`;
}

// ── Mapping to CalendarEvent ───────────────────────────────────────────────────

/** Same names DateService uses (HEBREW_MONTH_NAMES.he), replicated so this file stays Node-pure. */
const HEBREW_MONTH_NAMES_HE: Record<number, string> = {
  1: 'ניסן', 2: 'אייר', 3: 'סיון', 4: 'תמוז', 5: 'אב', 6: 'אלול', 7: 'תשרי',
  8: 'חשון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳',
};

export function toCalendarEvent(p: ParsedIcsEvent, id: string, nowIso: string): CalendarEvent {
  const hd = new HDate(
    new Date(
      Number(p.startDate.slice(0, 4)),
      Number(p.startDate.slice(5, 7)) - 1,
      Number(p.startDate.slice(8, 10)),
    ),
  );
  const { recurrenceType, recurrenceCalendar } = mapRecurrence(p);

  let start: CalendarEvent['start'];
  let end: CalendarEvent['end'];
  if (p.allDay || !p.startDateTime) {
    start = { date: p.startDate };
    end = { date: p.endDate };
  } else {
    // Mirrors useNotes.saveNote: start.date is always set (start_date is NOT NULL).
    const tz = p.timeZone ?? 'Asia/Jerusalem'; // floating time = device local; app default zone
    start = { date: p.startDate, dateTime: p.startDateTime, timeZone: tz };
    end = { date: p.endDate, dateTime: p.endDateTime ?? p.startDateTime, timeZone: tz };
  }

  return {
    id,
    summary: p.summary,
    description: p.description,
    location: p.location,
    status: p.status === 'tentative' ? 'tentative' : 'confirmed',
    created: nowIso,
    updated: nowIso,
    start,
    end,
    recurrence: p.rrule ? [p.rrule] : undefined,
    reminders: { useDefault: false },
    hebrewExtensions: {
      calendarType: 'gregorian',
      hebrewDate: {
        day: hd.getDate(),
        month: hd.getMonth(),
        year: hd.getFullYear(),
        monthName: HEBREW_MONTH_NAMES_HE[hd.getMonth()] ?? '',
      },
      recurrenceType,
      recurrenceCalendar,
      category: 'note' as NoteCategory, // what regular notes store (useNotes.saveNote)
      afterSunset: false,
      notificationScheduled: false,
    },
  };
}
