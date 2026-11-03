// @ts-nocheck -- runs under plain Node (node:test, .ts import specifiers); the project tsconfig has no @types/node.
// scripts/test-device-sync.ts
// Run: npm run test:sync  (node --experimental-strip-types scripts/test-device-sync.ts)
// Pure tests for the device-calendar sync plan: which device events a Luchot
// event becomes, the 10-year Hebrew-date expansion, the diff against the
// mapping table, and the device → .ics-shape mapping used by the live overlay.
// The expo-calendar calls themselves are device-only.

process.env.TZ = 'Asia/Jerusalem'; // deterministic local-date assertions

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HDate } from '@hebcal/core';
import {
  planDeviceEvents,
  diffPlan,
  payloadHash,
  payloadFor,
  occurrenceStart,
  expandHebrewDates,
  hebrewSyncWindow,
  isSyncableMaster,
  deviceOccurrenceToParsed,
  HEBREW_SYNC_YEARS,
  isUpcoming,
} from '../src/services/DeviceSyncPlan.ts';
import { toCalendarEvent } from '../src/services/IcsParser.ts';

const WINDOW = { from: '2026-11-03', to: '2036-11-03' };

function ev(over = {}) {
  const ext = over.hebrewExtensions ?? {};
  return {
    id: 'm1',
    summary: 'אירוע',
    status: 'confirmed',
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    start: { date: '2026-11-10' },
    end: { date: '2026-11-10' },
    reminders: { useDefault: false },
    ...over,
    hebrewExtensions: {
      calendarType: 'gregorian',
      recurrenceType: 'none',
      category: 'note',
      ...ext,
    },
  };
}

function hebrewYearly(day, month, startDate) {
  return ev({
    start: { date: startDate },
    end: { date: startDate },
    hebrewExtensions: {
      calendarType: 'hebrew',
      recurrenceType: 'yearly',
      recurrenceCalendar: 'hebrew',
      category: 'birthday',
      hebrewDate: { day, month, monthName: '' },
    },
  });
}

function tombstone(masterId, date) {
  return ev({
    id: `t-${date}`, status: 'cancelled', start: { date }, end: { date },
    hebrewExtensions: { isException: true, recurrenceId: masterId, exceptionDate: date },
  });
}

function override(masterId, date, summary, extra = {}) {
  return ev({
    id: `o-${date}`, summary, start: { date }, end: { date }, ...extra,
    hebrewExtensions: { isException: true, recurrenceId: masterId, exceptionDate: date },
  });
}

// ── mapping: one-off events ──────────────────────────────────────────────────
test('all-day one-off → one all-day device event, UTC midnight, exclusive end', () => {
  const plan = planDeviceEvents(ev({ location: 'ירושלים' }), [], WINDOW);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].occKey, '');
  const p = plan[0].payload;
  assert.equal(p.allDay, true);
  assert.equal(p.startDate, '2026-11-10T00:00:00.000Z');
  assert.equal(p.endDate, '2026-11-11T00:00:00.000Z');
  assert.equal(p.timeZone, 'UTC');
  assert.equal(p.location, 'ירושלים');
  assert.equal(p.frequency, undefined);
});

test('multi-day all-day keeps its span (end exclusive)', () => {
  const p = planDeviceEvents(ev({ end: { date: '2026-11-12' } }), [], WINDOW)[0].payload;
  assert.equal(p.startDate, '2026-11-10T00:00:00.000Z');
  assert.equal(p.endDate, '2026-11-13T00:00:00.000Z');
});

test('timed one-off keeps its instants and zone', () => {
  const p = planDeviceEvents(ev({
    start: { date: '2026-11-10', dateTime: '2026-11-10T07:00:00.000Z', timeZone: 'Asia/Jerusalem' },
    end: { date: '2026-11-10', dateTime: '2026-11-10T08:30:00.000Z', timeZone: 'Asia/Jerusalem' },
  }), [], WINDOW)[0].payload;
  assert.equal(p.allDay, false);
  assert.equal(p.startDate, '2026-11-10T07:00:00.000Z');
  assert.equal(p.endDate, '2026-11-10T08:30:00.000Z');
  assert.equal(p.timeZone, 'Asia/Jerusalem');
});

// ── what is never written ────────────────────────────────────────────────────
test('cancelled, exception rows and holiday-category rows are never written', () => {
  assert.equal(isSyncableMaster(ev({ status: 'cancelled' })), false);
  assert.equal(isSyncableMaster(tombstone('m1', '2026-11-10')), false);
  assert.equal(isSyncableMaster(ev({ hebrewExtensions: { category: 'holiday' } })), false);
  assert.deepEqual(planDeviceEvents(ev({ status: 'cancelled' }), [], WINDOW), []);
});

// ── Gregorian series: one device event with a rule ──────────────────────────
test('gregorian yearly → one recurring event (FREQ yearly), no expansion', () => {
  const plan = planDeviceEvents(ev({
    hebrewExtensions: { recurrenceType: 'yearly', recurrenceCalendar: 'gregorian', category: 'birthday' },
  }), [], WINDOW);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].payload.frequency, 'yearly');
  assert.deepEqual(plan[0].payload.cancelDates, []);
});

test('daily / weekly / gregorian monthly map to their frequency', () => {
  for (const t of ['daily', 'weekly', 'monthly']) {
    const plan = planDeviceEvents(ev({ hebrewExtensions: { recurrenceType: t } }), [], WINDOW);
    assert.equal(plan.length, 1);
    assert.equal(plan[0].payload.frequency, t);
  }
});

test('gregorian series: tombstone + override → cancelled dates, override written apart', () => {
  const master = ev({ hebrewExtensions: { recurrenceType: 'weekly' } });
  const plan = planDeviceEvents(master, [
    tombstone('m1', '2026-11-17'),
    override('m1', '2026-11-24', 'שונה'),
    tombstone('other', '2026-12-01'), // another series: ignored
  ], WINDOW);
  assert.deepEqual(plan.map((d) => d.occKey), ['', 'x:2026-11-24']);
  assert.deepEqual(plan[0].payload.cancelDates, ['2026-11-17', '2026-11-24']);
  assert.equal(plan[1].payload.title, 'שונה');
  assert.equal(plan[1].payload.startDate, '2026-11-24T00:00:00.000Z');
});

test('occurrenceStart: UTC midnight for all-day, same local clock time for timed', () => {
  const allDay = payloadFor(ev());
  assert.equal(occurrenceStart(allDay, '2026-12-01'), '2026-12-01T00:00:00.000Z');
  const timed = payloadFor(ev({
    start: { date: '2026-11-10', dateTime: '2026-11-10T07:00:00.000Z' }, // 09:00 local (IST, +2)
    end: { date: '2026-11-10', dateTime: '2026-11-10T08:00:00.000Z' },
  }));
  // 2027-06-01 is summer time (+3): 09:00 local = 06:00Z
  assert.equal(occurrenceStart(timed, '2027-06-01'), '2027-06-01T06:00:00.000Z');
});

// ── Hebrew-date yearly expansion (10 years ahead) ────────────────────────────
test('sync window is today .. today + 10 years', () => {
  assert.equal(HEBREW_SYNC_YEARS, 10);
  assert.deepEqual(hebrewSyncWindow(new Date(2026, 10, 3)), { from: '2026-11-03', to: '2036-11-03' });
});

test('hebrew yearly → one all-day device event per year for 10 years, each on the right Hebrew date', () => {
  // 15 Kislev (month 9), anchored 2020
  const master = hebrewYearly(15, 9, '2020-12-01');
  const plan = planDeviceEvents(master, [], WINDOW);
  assert.ok(plan.length === 10 || plan.length === 11, `got ${plan.length}`);
  for (const d of plan) {
    assert.match(d.occKey, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(d.payload.frequency, undefined); // written as single events, not a rule
    assert.equal(d.payload.startDate, `${d.occKey}T00:00:00.000Z`);
    const [y, m, dd] = d.occKey.split('-').map(Number);
    const h = new HDate(new Date(y, m - 1, dd));
    assert.equal(h.getDate(), 15);
    assert.equal(h.getMonth(), 9);
  }
  const keys = plan.map((d) => d.occKey);
  assert.deepEqual([...keys].sort(), keys, 'chronological');
  assert.ok(keys[0] >= WINDOW.from && keys[keys.length - 1] <= WINDOW.to);
});

test('hebrew yearly never starts before the event itself', () => {
  const master = hebrewYearly(1, 7, '2030-09-28'); // Rosh Hashana-dated, starts 2030
  const keys = planDeviceEvents(master, [], WINDOW).map((d) => d.occKey);
  assert.ok(keys.length > 0);
  assert.ok(keys.every((k) => k >= '2030-09-28'));
});

test('hebrew yearly: tombstoned year skipped, overridden year carries the override', () => {
  const master = hebrewYearly(15, 9, '2020-12-01');
  const all = planDeviceEvents(master, [], WINDOW).map((d) => d.occKey);
  const plan = planDeviceEvents(master, [
    tombstone('m1', all[1]),
    override('m1', all[2], 'מסיבה'),
  ], WINDOW);
  const keys = plan.map((d) => d.occKey);
  assert.equal(keys.includes(all[1]), false);
  assert.equal(plan.find((d) => d.occKey === all[2]).payload.title, 'מסיבה');
  assert.equal(plan.length, all.length - 1);
});

test('hebrew yearly on 30 Cheshvan: a year without the date is skipped or moved, never duplicated', () => {
  const keys = expandHebrewDates(hebrewYearly(30, 8, '2020-11-16'), WINDOW);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.length >= 9 && keys.length <= 11);
});

test('hebrew monthly → one event per Hebrew month in the window', () => {
  const master = ev({
    start: { date: '2026-11-11' }, end: { date: '2026-11-11' },
    hebrewExtensions: {
      calendarType: 'hebrew', recurrenceType: 'monthly', recurrenceCalendar: 'hebrew',
      hebrewDate: { day: 1, month: 9, monthName: '' },
    },
  });
  const keys = planDeviceEvents(master, [], WINDOW).map((d) => d.occKey);
  // 10 Hebrew years ≈ 123–124 months
  assert.ok(keys.length >= 120 && keys.length <= 125, `got ${keys.length}`);
  for (const k of keys.slice(0, 15)) {
    const [y, m, d] = k.split('-').map(Number);
    assert.equal(new HDate(new Date(y, m - 1, d)).getDate(), 1);
  }
});

test('hebrew timed series keeps its local clock time every year', () => {
  const master = hebrewYearly(15, 9, '2020-12-01');
  master.start = { date: '2020-12-01', dateTime: '2020-12-01T16:00:00.000Z', timeZone: 'Asia/Jerusalem' }; // 18:00 local
  master.end = { date: '2020-12-01', dateTime: '2020-12-01T17:00:00.000Z', timeZone: 'Asia/Jerusalem' };
  for (const d of planDeviceEvents(master, [], WINDOW)) {
    const s = new Date(d.payload.startDate);
    assert.equal(s.getHours(), 18);
    assert.equal(new Date(d.payload.endDate).getTime() - s.getTime(), 3600000);
  }
});

// ── diff against device_sync_map ─────────────────────────────────────────────
function rowsFor(plan) {
  return plan.map((d, i) => ({ occKey: d.occKey, deviceEventId: `dev${i}`, payloadHash: payloadHash(d.payload) }));
}

test('diff: unchanged plan → nothing to do', () => {
  const plan = planDeviceEvents(ev(), [], WINDOW);
  const diff = diffPlan(plan, rowsFor(plan), WINDOW);
  assert.deepEqual([diff.create, diff.update, diff.recreate, diff.remove].map((x) => x.length), [0, 0, 0, 0]);
});

test('diff: edit → update in place; delete → remove', () => {
  const before = planDeviceEvents(ev(), [], WINDOW);
  const rows = rowsFor(before);
  const after = planDeviceEvents(ev({ summary: 'חדש' }), [], WINDOW);
  const d1 = diffPlan(after, rows, WINDOW);
  assert.equal(d1.update.length, 1);
  assert.equal(d1.update[0].row.deviceEventId, 'dev0');
  const d2 = diffPlan([], rows, WINDOW);
  assert.equal(d2.remove.length, 1);
});

test('diff: new tombstone on a gregorian series → recreate (cancelled dates changed)', () => {
  const master = ev({ hebrewExtensions: { recurrenceType: 'weekly' } });
  const rows = rowsFor(planDeviceEvents(master, [], WINDOW));
  const after = planDeviceEvents(master, [tombstone('m1', '2026-11-17')], WINDOW);
  const diff = diffPlan(after, rows, WINDOW);
  assert.equal(diff.recreate.length, 1);
  assert.equal(diff.update.length, 0);
});

test('diff: renaming a gregorian series without exceptions → update, not recreate', () => {
  const master = ev({ hebrewExtensions: { recurrenceType: 'weekly' } });
  const rows = rowsFor(planDeviceEvents(master, [], WINDOW));
  const diff = diffPlan(planDeviceEvents({ ...master, summary: 'x' }, [], WINDOW), rows, WINDOW);
  assert.equal(diff.update.length, 1);
  assert.equal(diff.recreate.length, 0);
});

test('diff: window slides a year → past occurrence kept, new year created (launch extension)', () => {
  const master = hebrewYearly(15, 9, '2020-12-01');
  const rows = rowsFor(planDeviceEvents(master, [], WINDOW));
  const next = { from: '2027-12-01', to: '2037-12-01' };
  const diff = diffPlan(planDeviceEvents(master, [], next), rows, next);
  assert.equal(diff.remove.length, 0, 'history is not deleted');
  assert.ok(diff.create.length >= 1, 'the new 10th year is added');
  assert.ok(diff.create.every((d) => d.occKey > WINDOW.to.slice(0, 4)));
});

test('diff: deleting a hebrew series removes every occurrence, past ones too', () => {
  const master = hebrewYearly(15, 9, '2020-12-01');
  const rows = rowsFor(planDeviceEvents(master, [], WINDOW));
  const later = { from: '2030-01-01', to: '2040-01-01' };
  const diff = diffPlan([], rows, later);
  assert.equal(diff.remove.length, rows.length);
});

// ── read path: device occurrence → .ics shape → CalendarEvent (Phase 2 reuse) ─
test('device all-day occurrence → inclusive local dates', () => {
  const p = deviceOccurrenceToParsed({
    title: 'טיסה לרומא', allDay: true,
    startDate: '2026-11-12T00:00:00.000Z', endDate: '2026-11-14T00:00:00.000Z',
  });
  assert.equal(p.allDay, true);
  assert.equal(p.startDate, '2026-11-12');
  assert.equal(p.endDate, '2026-11-13');
});

test('device timed occurrence → start-day only, instants kept; untitled gets a title', () => {
  const p = deviceOccurrenceToParsed({
    title: '  ', allDay: false,
    startDate: '2026-11-12T21:30:00.000Z', endDate: '2026-11-12T23:00:00.000Z', timeZone: 'UTC',
  });
  assert.equal(p.startDate, '2026-11-12'); // 23:30 local (UTC+2) on the 12th
  assert.equal(p.endDate, p.startDate);
  assert.equal(p.startDateTime, '2026-11-12T21:30:00.000Z');
  assert.equal(p.summary, '(ללא כותרת)');
});

test('device occurrence goes through the Phase 2 mapping (toCalendarEvent) unchanged', () => {
  const p = deviceOccurrenceToParsed({
    title: 'שיחה עם הבנק', allDay: false, location: 'סניף',
    startDate: '2026-11-12T08:30:00.000Z', endDate: '2026-11-12T09:00:00.000Z',
  });
  const e = toCalendarEvent(p, 'ext:1', '2026-11-03T00:00:00.000Z');
  assert.equal(e.summary, 'שיחה עם הבנק');
  assert.equal(e.location, 'סניף');
  assert.equal(e.start.dateTime, '2026-11-12T08:30:00.000Z');
  assert.equal(e.hebrewExtensions.recurrenceType, 'none');
  assert.ok(e.hebrewExtensions.hebrewDate.day > 0);
});

test('invalid device dates are dropped', () => {
  assert.equal(deviceOccurrenceToParsed({ title: 'x', startDate: 'nope' }), null);
});

// ── turning sync on: which existing events are pushed ────────────────────────
test('isUpcoming: one-off events from today on are pushed, past ones are not', () => {
  const today = '2026-11-03';
  assert.equal(isUpcoming(ev({ start: { date: '2026-11-03' }, end: { date: '2026-11-03' } }), today), true);
  assert.equal(isUpcoming(ev({ start: { date: '2026-12-01' }, end: { date: '2026-12-01' } }), today), true);
  assert.equal(isUpcoming(ev({ start: { date: '2026-11-02' }, end: { date: '2026-11-02' } }), today), false);
  // timed event earlier today still counts as today
  assert.equal(isUpcoming(ev({
    start: { date: '2026-11-03', dateTime: '2026-11-03T05:00:00.000Z' },
    end: { date: '2026-11-03', dateTime: '2026-11-03T06:00:00.000Z' },
  }), today), true);
});

test('isUpcoming: a multi-day event still running is pushed', () => {
  assert.equal(isUpcoming(ev({ start: { date: '2026-11-01' }, end: { date: '2026-11-05' } }), '2026-11-03'), true);
});

test('isUpcoming: every recurring series is pushed, even if it started in the past', () => {
  const old = '2010-01-01';
  assert.equal(isUpcoming(hebrewYearly(15, 9, old), '2026-11-03'), true);
  assert.equal(isUpcoming(ev({ start: { date: old }, end: { date: old }, hebrewExtensions: { recurrenceType: 'weekly' } }), '2026-11-03'), true);
});
