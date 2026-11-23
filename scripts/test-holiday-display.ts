// @ts-nocheck -- runs under plain Node (node:test); the project tsconfig has no @types/node.
// scripts/test-holiday-display.ts
// Run: npm run test:holidays
// Guards the fixes from a tester's holiday feedback (docs/worklog/2026-11-16-holiday-feedback.md):
// Tanakh book names in Hebrew, every holiday of a day kept (30 Shevat: Family Day +
// Rosh Chodesh Adar), and the exact list the "ימים ממלכתיים נוספים" setting hides.

process.env.TZ = 'Asia/Jerusalem'; // deterministic local dates

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

// DateService imports '../utils/hebrewUtils' without an extension (Metro resolves it);
// plain Node needs '.ts', so add it for extensionless relative imports.
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  if (/^\\.\\.?\\//.test(spec) && !/\\.[cm]?[jt]s$/.test(spec)) {
    try { return await next(spec + '.ts', ctx); } catch {}
  }
  return next(spec, ctx);
}`));

const { HDate, HebrewCalendar, flags } = await import('@hebcal/core');
const { hebraizeBookName, isOptionalCivilDay, DateService } = await import('../src/services/DateService.ts');

test('Tanakh book names are translated to Hebrew', () => {
  assert.equal(hebraizeBookName('Ezekiel כ׳'), 'יחזקאל כ׳');
  assert.equal(hebraizeBookName('Psalms קיט'), 'תהלים קיט');
  assert.equal(hebraizeBookName('I Kings ה׳'), 'מלכים א׳ ה׳');
  assert.equal(hebraizeBookName('Song of Songs ב׳'), 'שיר השירים ב׳');
  assert.equal(hebraizeBookName('ברכות ב'), 'ברכות ב', 'Hebrew text stays as is');
  assert.equal(hebraizeBookName('Unknown כ׳'), 'Unknown כ׳', 'an unknown name stays as is');
});

// Every modern holiday hebcal knows in Israel over two years, plus Chag HaBanot.
const events = HebrewCalendar.calendar({ start: new Date(2026, 0, 1), end: new Date(2027, 11, 31), il: true })
  .filter((ev) => (ev.getFlags() & flags.MODERN_HOLIDAY) || ev.getDesc() === 'Chag HaBanot');
const hidden = new Set(events.filter(isOptionalCivilDay).map((ev) => ev.getDesc()));
const shown = new Set(events.filter((ev) => !isOptionalCivilDay(ev)).map((ev) => ev.getDesc()));

test('the setting hides the optional civil days', () => {
  for (const d of ['Yitzhak Rabin Memorial Day', 'Family Day', 'Hebrew Language Day', 'Yom HaAliyah', 'Chag HaBanot']) {
    assert.ok(hidden.has(d), `${d} should be hidden; hidden = ${[...hidden].join(', ')}`);
  }
});

test('the setting never hides the five kept days', () => {
  for (const d of ['Yom HaShoah', 'Yom HaZikaron', "Yom HaAtzma'ut", 'Yom Yerushalayim', 'Sigd']) {
    assert.ok(shown.has(d), `${d} should stay; shown = ${[...shown].join(', ')}`);
    assert.ok(!hidden.has(d), `${d} must not be hidden`);
  }
});

// 30 Shevat 5787 is Family Day and Rosh Chodesh Adar on the same day.
const shevat30 = new HDate(30, 'Shevat', 5787).greg();

// One instance, toggled like the app's single `dateService` (the day cache is module-wide;
// setShowCivilDays() clears it on a change).
const ds = new DateService(false);

test('30 Shevat with the setting on keeps both Family Day and Rosh Chodesh', () => {
  ds.setShowCivilDays(true);
  const { holidaysEn } = ds.getDayData(shevat30);
  assert.ok(holidaysEn.some((h) => /Family Day/.test(h)), `holidaysEn = ${holidaysEn.join(' | ')}`);
  assert.ok(holidaysEn.some((h) => /Rosh Chodesh/.test(h)), `holidaysEn = ${holidaysEn.join(' | ')}`);
});

test('30 Shevat with the setting turned off hides Family Day, keeps Rosh Chodesh', () => {
  ds.setShowCivilDays(false);
  const { holidaysEn } = ds.getDayData(shevat30);
  assert.ok(!holidaysEn.some((h) => /Family Day/.test(h)), `holidaysEn = ${holidaysEn.join(' | ')}`);
  assert.ok(holidaysEn.some((h) => /Rosh Chodesh/.test(h)), `holidaysEn = ${holidaysEn.join(' | ')}`);
});
