// @ts-nocheck -- runs under plain Node (node:test, .ts import specifiers); the project tsconfig has no @types/node.
// scripts/test-ics-parser.ts
// Run: npm run test:ics  (node --experimental-strip-types scripts/test-ics-parser.ts)
// Pure-parser tests; the SQL part of dedup is device-only, so the dedup *logic*
// is tested through classifyDuplicates.

process.env.TZ = 'Asia/Jerusalem'; // deterministic local-date assertions

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  parseIcs,
  toCalendarEvent,
  classifyDuplicates,
  mapRecurrence,
  isSimpleRecurrence,
  sourceKeyOf,
  eventDayCount,
  localTimeRange,
  MAX_VEVENTS,
  UNTITLED_SUMMARY,
  type ParsedIcsEvent,
} from '../src/services/IcsParser.ts';

function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./ics-fixtures/${name}`, import.meta.url)), 'utf8');
}

function parseOk(text: string): ParsedIcsEvent[] {
  const r = parseIcs(text);
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error('unreachable');
  return r.events;
}

function byUid(events: ParsedIcsEvent[], uid: string, recurrenceId?: string): ParsedIcsEvent {
  const e = events.find((x) => x.uid === uid && x.recurrenceId === recurrenceId);
  assert.ok(e, `event ${uid} not found`);
  return e;
}

const google = parseOk(fixture('google-export.ics'));

// ── structure ───────────────────────────────────────────────────────────────
test('google export: cancelled skipped, 9 usable events, VTIMEZONE/VALARM do not leak', () => {
  assert.equal(google.length, 9);
  assert.equal(google.find((e) => e.uid === 'cancelled-009@google.com'), undefined);
  // VALARM's "DESCRIPTION:This is an event reminder" must not become the event description
  const timed = byUid(google, 'timed-tzid-003@google.com');
  assert.equal(timed.description, undefined);
  // No VTIMEZONE pseudo-events
  assert.ok(google.every((e) => e.uid));
});

test('CRLF fixture really has CRLF and 75-octet folds', () => {
  const raw = fixture('google-export.ics');
  assert.ok(raw.includes('\r\n'), 'fixture must use CRLF');
  assert.ok(raw.includes('\r\n '), 'fixture must contain folded lines');
});

test('not_ics for plain text; empty calendar is ok with no events', () => {
  assert.deepEqual(parseIcs(fixture('not-a-calendar.txt')), { ok: false, reason: 'not_ics' });
  assert.deepEqual(parseIcs(''), { ok: false, reason: 'not_ics' });
  const r = parseIcs(fixture('empty-calendar.ics'));
  assert.deepEqual(r, { ok: true, events: [], truncated: false });
});

test('UTF-8 BOM and bare-LF line endings are accepted', () => {
  const text = '﻿BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:x1\nDTSTART;VALUE=DATE:20260101\nSUMMARY:A\nEND:VEVENT\nEND:VCALENDAR\n';
  const ev = parseOk(text);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].summary, 'A');
});

// ── dates ───────────────────────────────────────────────────────────────────
test('all-day: DTEND is exclusive (single day)', () => {
  const e = byUid(google, 'allday-single-001@google.com');
  assert.equal(e.allDay, true);
  assert.equal(e.startDate, '2026-01-12');
  assert.equal(e.endDate, '2026-01-12');
  assert.equal(e.startDateTime, undefined);
});

test('all-day multi-day: 20-25 exclusive -> inclusive 20..24', () => {
  const e = byUid(google, 'allday-multi-002@google.com');
  assert.equal(e.startDate, '2026-02-20');
  assert.equal(e.endDate, '2026-02-24');
  assert.equal(eventDayCount(e), 5);
});

test('all-day without DTEND -> one day; DURATION P3D -> 3 days; clamp end>=start', () => {
  const mk = (extra: string): ParsedIcsEvent[] =>
    parseOk(`BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:d\nDTSTART;VALUE=DATE:20260110\n${extra}SUMMARY:S\nEND:VEVENT\nEND:VCALENDAR`);
  assert.equal(mk('')[0].endDate, '2026-01-10');
  assert.equal(mk('DURATION:P3D\n')[0].endDate, '2026-01-12');
  assert.equal(mk('DURATION:P1W\n')[0].endDate, '2026-01-16');
  assert.equal(mk('DTEND;VALUE=DATE:20260105\n')[0].endDate, '2026-01-10');
});

test('timed TZID=Asia/Jerusalem converts to the right UTC instant (winter +02:00)', () => {
  const e = byUid(google, 'timed-tzid-003@google.com');
  assert.equal(e.allDay, false);
  assert.equal(e.startDateTime, '2026-01-15T07:30:00.000Z');
  assert.equal(e.endDateTime, '2026-01-15T08:30:00.000Z');
  assert.equal(e.timeZone, 'Asia/Jerusalem');
  assert.equal(e.startDate, '2026-01-15');
  assert.equal(e.location, 'קפה נחמה, רחוב הרצל 5, תל אביב');
  assert.equal(localTimeRange(e), '09:30 – 10:30');
});

test('timed UTC (Z) keeps the instant; local date computed in device zone', () => {
  const e = byUid(google, 'timed-utc-004@google.com');
  assert.equal(e.startDateTime, '2026-03-01T12:00:00.000Z');
  assert.equal(e.timeZone, 'UTC');
  assert.equal(e.startDate, '2026-03-01');
  assert.equal(localTimeRange(e), '14:00 – 15:00');
});

test('UTC event late in the evening rolls to the next LOCAL date', () => {
  const ev = parseOk('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:l\nDTSTART:20260110T230000Z\nDTEND:20260110T233000Z\nSUMMARY:S\nEND:VEVENT\nEND:VCALENDAR');
  assert.equal(ev[0].startDate, '2026-01-11'); // 01:00 Jerusalem
  assert.equal(ev[0].endDate, '2026-01-11');
});

test('timed event ending exactly at local midnight stays on its start day', () => {
  const ev = parseOk('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:m\nDTSTART;TZID=Asia/Jerusalem:20260110T220000\nDTEND;TZID=Asia/Jerusalem:20260111T000000\nSUMMARY:S\nEND:VEVENT\nEND:VCALENDAR');
  assert.equal(ev[0].startDate, '2026-01-10');
  assert.equal(ev[0].endDate, '2026-01-10');
});

test('Outlook Windows TZID maps to IANA; unknown TZID is floating (device local)', () => {
  const ev = parseOk(fixture('outlook-windows-tz.ics'));
  assert.equal(ev.length, 2);
  const win = byUid(ev, '040000008200E00074C5B7101A82E00800000000AAAA0001');
  assert.equal(win.startDateTime, '2026-02-10T12:00:00.000Z'); // 14:00 +02:00
  assert.equal(win.timeZone, 'Asia/Jerusalem');
  assert.equal(win.description, undefined); // "\n" only -> trimmed to empty
  const floating = byUid(ev, '040000008200E00074C5B7101A82E00800000000AAAA0002');
  assert.equal(floating.startDateTime, '2026-02-12T06:00:00.000Z'); // 08:00 device local (+02:00)
  assert.equal(floating.timeZone, undefined);
});

test('floating time (no Z, no TZID) is device-local; missing DTEND -> end = start', () => {
  const ev = parseOk('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:f\nDTSTART:20260115T090000\nSUMMARY:S\nEND:VEVENT\nEND:VCALENDAR');
  assert.equal(ev[0].startDateTime, '2026-01-15T07:00:00.000Z');
  assert.equal(ev[0].endDateTime, ev[0].startDateTime);
});

test('VEVENT without DTSTART is skipped; invalid dates skipped', () => {
  const ev = parseOk(
    'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:a\nSUMMARY:no start\nEND:VEVENT\n' +
    'BEGIN:VEVENT\nUID:b\nDTSTART;VALUE=DATE:20260231\nSUMMARY:feb 31\nEND:VEVENT\n' +
    'BEGIN:VEVENT\nUID:c\nDTSTART:garbage\nSUMMARY:junk\nEND:VEVENT\nEND:VCALENDAR',
  );
  assert.equal(ev.length, 0);
});

// ── text ────────────────────────────────────────────────────────────────────
test('folded DESCRIPTION is unfolded and unescaped (\\n \\, \\; \\\\), Hebrew intact', () => {
  const e = byUid(google, 'long-desc-008@google.com');
  assert.equal(e.summary, 'ליל הסדר, אצל סבא');
  assert.equal(
    e.description,
    'ארוחת ליל הסדר אצל המשפחה\nמה להביא: יין, מצות, חרוסת וירקות; לא לשכוח את ההגדות!\n' +
    'פרטים נוספים: זמן הגעה בשעה שבע בערב, חניה ברחוב הסמוך, ויש לתאם הסעה\\הקרובה.',
  );
});

test('missing SUMMARY gets the Hebrew placeholder', () => {
  const ev = parseOk('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:n\nDTSTART;VALUE=DATE:20260101\nEND:VEVENT\nEND:VCALENDAR');
  assert.equal(ev[0].summary, UNTITLED_SUMMARY);
  assert.equal(UNTITLED_SUMMARY, '(ללא כותרת)');
});

test('quoted parameter values may contain ; and :', () => {
  const ev = parseOk('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:q\nDTSTART;X-FOO="a;b:c";VALUE=DATE:20260101\nSUMMARY:Q\nEND:VEVENT\nEND:VCALENDAR');
  assert.equal(ev.length, 1);
  assert.equal(ev[0].startDate, '2026-01-01');
});

// ── recurrence ──────────────────────────────────────────────────────────────
test('RRULE is kept verbatim; yearly all-day -> yearly/gregorian', () => {
  const e = byUid(google, 'birthday-005@google.com');
  assert.equal(e.rrule, 'RRULE:FREQ=YEARLY');
  assert.deepEqual(mapRecurrence(e), { recurrenceType: 'yearly', recurrenceCalendar: 'gregorian' });
  assert.equal(isSimpleRecurrence(e), true);
  const ce = toCalendarEvent(e, 'id-1', '2026-11-03T00:00:00.000Z');
  assert.deepEqual(ce.recurrence, ['RRULE:FREQ=YEARLY']);
  assert.equal(ce.hebrewExtensions.recurrenceType, 'yearly');
  assert.equal(ce.hebrewExtensions.recurrenceCalendar, 'gregorian');
});

test('weekly BYDAY=TU on a Tuesday -> weekly (no calendar); BYDAY mismatch -> none', () => {
  const e = byUid(google, 'weekly-tue-006@google.com');
  assert.equal(e.rrule, 'RRULE:FREQ=WEEKLY;BYDAY=TU');
  assert.deepEqual(mapRecurrence(e), { recurrenceType: 'weekly', recurrenceCalendar: undefined });
  assert.equal(mapRecurrence({ ...e, rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO' }).recurrenceType, 'none');
});

test('RRULE with UNTIL / COUNT / INTERVAL>1 / other BY* -> none, RRULE still stored', () => {
  const g = byUid(google, 'weekly-until-007@google.com');
  assert.equal(g.rrule, 'RRULE:FREQ=WEEKLY;UNTIL=20260630T045959Z;BYDAY=MO');
  assert.equal(mapRecurrence(g).recurrenceType, 'none');
  assert.equal(isSimpleRecurrence(g), false);
  const ce = toCalendarEvent(g, 'id-2', 'now');
  assert.deepEqual(ce.recurrence, [g.rrule]);
  assert.equal(ce.hebrewExtensions.recurrenceType, 'none');

  const base = byUid(google, 'birthday-005@google.com');
  for (const rule of [
    'RRULE:FREQ=YEARLY;COUNT=3',
    'RRULE:FREQ=YEARLY;INTERVAL=2',
    'RRULE:FREQ=MONTHLY;BYSETPOS=1;BYDAY=MO',
    'RRULE:FREQ=HOURLY',
    'RRULE:garbage',
  ]) {
    assert.equal(mapRecurrence({ ...base, rrule: rule }).recurrenceType, 'none', rule);
  }
});

test('implied BY* parts are simple; daily/monthly map; INTERVAL=1 ok', () => {
  const base = byUid(google, 'birthday-005@google.com'); // 2026-03-05
  assert.equal(mapRecurrence({ ...base, rrule: 'RRULE:FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=5' }).recurrenceType, 'yearly');
  assert.equal(mapRecurrence({ ...base, rrule: 'RRULE:FREQ=YEARLY;BYMONTH=4;BYMONTHDAY=5' }).recurrenceType, 'none');
  assert.deepEqual(mapRecurrence({ ...base, rrule: 'RRULE:FREQ=MONTHLY;BYMONTHDAY=5;INTERVAL=1' }), { recurrenceType: 'monthly', recurrenceCalendar: 'gregorian' });
  assert.deepEqual(mapRecurrence({ ...base, rrule: 'RRULE:FREQ=DAILY;WKST=SU' }), { recurrenceType: 'daily', recurrenceCalendar: undefined });
});

test('multi-day + RRULE keeps RRULE but recurrenceType none', () => {
  const multi = byUid(google, 'allday-multi-002@google.com');
  const withRule = { ...multi, rrule: 'RRULE:FREQ=YEARLY' };
  assert.equal(mapRecurrence(withRule).recurrenceType, 'none');
  assert.deepEqual(toCalendarEvent(withRule, 'x', 'now').recurrence, ['RRULE:FREQ=YEARLY']);
});

test('override instance: RECURRENCE-ID -> own source key, standalone one-off', () => {
  const master = byUid(google, 'weekly-tue-006@google.com');
  const override = byUid(google, 'weekly-tue-006@google.com', '20260113T180000');
  assert.equal(sourceKeyOf(master), 'weekly-tue-006@google.com');
  assert.equal(sourceKeyOf(override), 'weekly-tue-006@google.com|20260113T180000');
  assert.equal(override.rrule, undefined);
  assert.equal(mapRecurrence(override).recurrenceType, 'none');
  assert.equal(override.summary, 'שיעור גמרא (הוזז)');
});

// ── toCalendarEvent shape ───────────────────────────────────────────────────
test('toCalendarEvent all-day shape mirrors saveNote', () => {
  const e = byUid(google, 'allday-multi-002@google.com');
  const ce = toCalendarEvent(e, 'uuid-1', '2026-11-03T10:00:00.000Z');
  assert.equal(ce.id, 'uuid-1');
  assert.equal(ce.status, 'confirmed');
  assert.equal(ce.created, '2026-11-03T10:00:00.000Z');
  assert.equal(ce.updated, '2026-11-03T10:00:00.000Z');
  assert.deepEqual(ce.start, { date: '2026-02-20' });
  assert.deepEqual(ce.end, { date: '2026-02-24' });
  assert.deepEqual(ce.reminders, { useDefault: false });
  assert.equal(ce.recurrence, undefined);
  const ext = ce.hebrewExtensions;
  assert.equal(ext.calendarType, 'gregorian');
  assert.equal(ext.category, 'note');
  assert.equal(ext.afterSunset, false);
  assert.equal(ext.notificationScheduled, false);
  assert.equal(ext.recurrenceType, 'none');
  // 2026-02-20 = 3 Adar 5786 (month 12 in a non-leap Hebrew year 5786)
  assert.equal(ext.hebrewDate?.day, 3);
  assert.equal(ext.hebrewDate?.month, 12);
  assert.equal(ext.hebrewDate?.year, 5786);
  assert.equal(ext.hebrewDate?.monthName, 'אדר');
});

test('toCalendarEvent timed shape: start.date always set, dateTime + timeZone', () => {
  const e = byUid(google, 'timed-tzid-003@google.com');
  const ce = toCalendarEvent(e, 'uuid-2', 'now');
  assert.deepEqual(ce.start, { date: '2026-01-15', dateTime: '2026-01-15T07:30:00.000Z', timeZone: 'Asia/Jerusalem' });
  assert.deepEqual(ce.end, { date: '2026-01-15', dateTime: '2026-01-15T08:30:00.000Z', timeZone: 'Asia/Jerusalem' });
  assert.equal(ce.location, 'קפה נחמה, רחוב הרצל 5, תל אביב');
});

test('tentative source status is preserved', () => {
  const ev = parseOk('BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:t\nDTSTART;VALUE=DATE:20260101\nSTATUS:TENTATIVE\nSUMMARY:T\nEND:VEVENT\nEND:VCALENDAR');
  assert.equal(toCalendarEvent(ev[0], 'i', 'n').status, 'tentative');
});

// ── Luchot export + duplicates ──────────────────────────────────────────────
const luchot = parseOk(fixture('luchot-export.ics'));

test('luchot export parses (all-day, UTC timed, @luchot-hebcal)', () => {
  assert.equal(luchot.length, 3);
  assert.equal(luchot[0].startDate, '2026-03-18');
  assert.equal(luchot[0].endDate, '2026-03-18');
  assert.equal(luchot[1].summary, 'פגישה, עם הרופא');
  assert.equal(luchot[1].description, 'להביא בדיקות; ואת הפנייה');
});

test('classifyDuplicates: rules (a) imported key, (b) luchot id, (c) hebcal, same-file repeat', () => {
  const none = classifyDuplicates(luchot, new Set(), new Set());
  // only the @luchot-hebcal one is a duplicate with empty DB
  assert.deepEqual(none.items.map((i) => i.duplicate), [false, false, true]);

  const withIds = classifyDuplicates(luchot, new Set(), new Set(['3f2b8a4e-1c11-4d7a-9a55-0a1b2c3d4e5f']));
  assert.deepEqual(withIds.items.map((i) => i.duplicate), [true, false, true]);
  assert.equal(withIds.toImport.length, 1);
  assert.equal(withIds.duplicates.length, 2);

  const keys = new Set(['allday-single-001@google.com', 'weekly-tue-006@google.com|20260113T180000']);
  const g = classifyDuplicates(google, keys, new Set());
  assert.equal(g.duplicates.length, 2);
  assert.equal(g.toImport.length, 7);
  // master (UID only) is NOT a duplicate just because its override key is known
  assert.equal(g.items.find((i) => i.event.uid === 'weekly-tue-006@google.com' && !i.event.recurrenceId)?.duplicate, false);

  // same source key twice in one file counts once
  const dup = [google[0], google[0]];
  const r = classifyDuplicates(dup, new Set(), new Set());
  assert.deepEqual(r.items.map((i) => i.duplicate), [false, true]);

  // events without a UID are never duplicates
  const noUid: ParsedIcsEvent = { summary: 'x', allDay: true, startDate: '2026-01-01', endDate: '2026-01-01' };
  assert.deepEqual(classifyDuplicates([noUid, noUid], new Set(), new Set()).items.map((i) => i.duplicate), [false, false]);
});

test('a @luchot UID with a RECURRENCE-ID is not treated as a Luchot export id', () => {
  const e: ParsedIcsEvent = { uid: 'abc@luchot', recurrenceId: '20260101', summary: 's', allDay: true, startDate: '2026-01-01', endDate: '2026-01-01' };
  assert.equal(classifyDuplicates([e], new Set(), new Set(['abc'])).items[0].duplicate, false);
});

// ── bounds / hostile input ──────────────────────────────────────────────────
test('VEVENT cap: more than MAX_VEVENTS -> truncated flag, rest ignored', () => {
  const one = 'BEGIN:VEVENT\nUID:u\nDTSTART;VALUE=DATE:20260101\nSUMMARY:S\nEND:VEVENT\n';
  const text = 'BEGIN:VCALENDAR\n' + one.repeat(MAX_VEVENTS + 10) + 'END:VCALENDAR';
  const r = parseIcs(text);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.truncated, true);
    assert.equal(r.events.length, MAX_VEVENTS);
  }
});

test('hostile input is linear: long lines / deep nesting finish fast and do not throw', () => {
  const t0 = Date.now();
  const longValue = 'A'.repeat(2_000_000);
  const deep = 'BEGIN:X\n'.repeat(50_000);
  const r = parseIcs(`BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:h\nDTSTART;VALUE=DATE:20260101\nSUMMARY:${longValue}\nEND:VEVENT\n${deep}END:VCALENDAR`);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.events.length, 1);
    assert.ok(r.events[0].summary.length <= 500); // capped
  }
  const r2 = parseIcs('BEGIN:VCALENDAR\nDTSTART;' + ';'.repeat(100_000) + ':x\nEND:VCALENDAR');
  assert.equal(r2.ok, true);
  assert.ok(Date.now() - t0 < 3000, 'parsing took too long');
});

test('nested component properties (VALARM) never leak; properties outside VEVENT ignored', () => {
  const ev = parseOk(
    'BEGIN:VCALENDAR\nSUMMARY:calendar level\nBEGIN:VEVENT\nUID:v\nDTSTART;VALUE=DATE:20260101\nSUMMARY:Real\n' +
    'BEGIN:VALARM\nSUMMARY:alarm\nDTSTART:20300101T000000Z\nEND:VALARM\nEND:VEVENT\nEND:VCALENDAR',
  );
  assert.equal(ev.length, 1);
  assert.equal(ev[0].summary, 'Real');
  assert.equal(ev[0].startDate, '2026-01-01');
});
