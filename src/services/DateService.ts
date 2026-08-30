// src/services/DateService.ts

import { HDate, HebrewCalendar, Event as HebcalEvent, flags, DailyLearning, ParshaEvent, getSedra } from '@hebcal/core';
import '@hebcal/learning'; // side-effect: registers daily learning schedules into DailyLearning registry

// ── Types ─────────────────────────────────────────────────

export interface HebrewDateInfo {
  day: number;
  month: number;
  year: number;
  monthName: string;          // Hebrew name e.g. "תשרי"
  monthNameTranslit: string;  // e.g. "Tishrei"
  fullDate: string;           // e.g. "כ״ז בתשרי תשפ״ה"
  isShabbat: boolean;
  isRoshChodesh: boolean;
}

/**
 * A single daily learning item. Contains both the display text
 * (Hebrew, rendered via @hebcal/learning) and a direct link to
 * the corresponding Sefaria source.
 */
export interface LearningItem {
  display: string;  // Hebrew rendered text, e.g. "ברכות דף ב"
  url:     string;  // Sefaria URL, e.g. "https://www.sefaria.org/Berakhot.2?lang=bi"
}

export interface DayData {
  gregorianDate: Date;
  hebrewDate: HebrewDateInfo;
  holidays: string[];         // Holiday names (Hebrew)
  holidaysEn: string[];
  parasha?: string;           // Only on Shabbat
  // Wave 1B (Task 7) — Hebrew name of the parasha of the COMING Shabbat,
  // populated every day of the week (including Shabbat itself, where it
  // duplicates `parasha` — harmless). Does not change `parasha`'s existing
  // "Shabbat only" semantics; existing consumers of `parasha` are
  // unaffected. undefined when the coming Shabbat's reading is a special
  // holiday reading rather than a regular weekly parasha (e.g. Shabbat
  // Chol HaMoed, or a Shabbat that coincides with a Yom Tov).
  upcomingParasha?: string;
  isYomTov: boolean;
  isCholHamoed: boolean;
  omerDay?: number;           // 1-49 during Sefirat HaOmer
  dafYomi?:          LearningItem;  // Bavli Daf Yomi via @hebcal/learning ('dafYomi')
  rambamOneChapter?: LearningItem;  // Rambam 1-chapter cycle via @hebcal/learning ('rambam1')
  // ── Phase 3.7b-1: additional learning schedules ─────────────────────────
  mishnaYomi?:   LearningItem;  // Mishnah Yomi (2 mishnayot/day)
  nachYomi?:     LearningItem;  // Nach Yomi (1 chapter/day)
  tanakhYomi?:   LearningItem;  // Tanakh Yomi (Israeli program)
  chofetzChaim?: LearningItem;  // Chofetz Chaim — daily halacha
  psalms?:       LearningItem;  // Tehillim (monthly cycle)
  // ── Phase 4 deferred ─────────────────────────────────────────────────────
  // rambamThreeChapters — not in @hebcal/learning v5.1.2
  // seferHaMitzvot        — not in @hebcal/learning v5.1.2
  // arukhHaShulchan       — not in @hebcal/learning v5.1.2
}

// ── Cache ─────────────────────────────────────────────────

const monthCache = new Map<string, DayData[]>();

function getCacheKey(year: number, month: number, diaspora: boolean): string {
  return `${year}-${month}-${diaspora ? 'd' : 'i'}`;
}

// ── Hebrew Month Names ─────────────────────────────────────

const HEBREW_MONTH_NAMES: Record<number, { he: string; en: string }> = {
  1:  { he: 'ניסן',     en: 'Nisan' },
  2:  { he: 'אייר',     en: 'Iyar' },
  3:  { he: 'סיון',     en: 'Sivan' },
  4:  { he: 'תמוז',     en: 'Tammuz' },
  5:  { he: 'אב',       en: 'Av' },
  6:  { he: 'אלול',     en: 'Elul' },
  7:  { he: 'תשרי',     en: 'Tishrei' },
  8:  { he: 'חשון',     en: 'Cheshvan' },
  9:  { he: 'כסלו',     en: 'Kislev' },
  10: { he: 'טבת',      en: 'Tevet' },
  11: { he: 'שבט',      en: 'Shevat' },
  12: { he: 'אדר',      en: 'Adar' },
  13: { he: 'אדר ב׳',   en: 'Adar II' },
};

// ── Hebrew Numerals ────────────────────────────────────────

const GEMATRIA = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט',
  'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט',
  'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל'];

export function toHebrewNumeral(n: number): string {
  return GEMATRIA[n] ?? n.toString();
}

// ── Hebrew Year Gematria ───────────────────────────────────

const GEM_HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק'];
const GEM_TENS     = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const GEM_UNITS    = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];

/** Converts a Hebrew year number to gematria letters, e.g. 5785 → "תשפ״ה" */
export function toHebrewYear(year: number): string {
  const y = year % 1000;
  const h = Math.floor(y / 100);
  const rem = y % 100;
  let t = Math.floor(rem / 10);
  let u = rem % 10;

  // Avoid writing God's name (yod-heh=15, yod-vav=16)
  let tensStr  = GEM_TENS[t];
  let unitsStr = GEM_UNITS[u];
  if (t === 1 && u === 5) { tensStr = 'ט'; unitsStr = 'ו'; }
  if (t === 1 && u === 6) { tensStr = 'ט'; unitsStr = 'ז'; }

  const letters = GEM_HUNDREDS[h] + tensStr + unitsStr;
  if (letters.length <= 1) return letters + '׳';
  return letters.slice(0, -1) + '״' + letters.slice(-1);
}

// ── Daily Learning Helper ─────────────────────────────────
// Looks up a named learning schedule for a given Hebrew date and returns
// a LearningItem (display text + Sefaria URL), or undefined if no event
// exists for this date or if the event has no URL.
// The @hebcal/learning side-effect import above populates the registry.

/** il = true for Israel, false for Diaspora (mirrors HebrewCalendar `il` flag) */
function renderLearning(scheduleName: string, hd: HDate, il: boolean): LearningItem | undefined {
  const event = DailyLearning.lookup(scheduleName, hd, il);
  if (!event) return undefined;

  const rawDisplay = event.render('he');
  // url() may not exist on all schedule events; defensive check guards against
  // future schedule additions in @hebcal/learning that might not expose a URL.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const url = typeof (event as any).url === 'function'
    ? (event as any).url() as string
    : undefined;

  if (!rawDisplay || !url) return undefined;

  // Strip bilingual boilerplate from the display string:
  //   1. Leading prefix  "Daf Yomi: " / "Mishna Yomi: " etc.
  //      Pattern: 1+ ASCII letters/spaces followed by ":" + optional space.
  //   2. Trailing English book name "Psalms" / "I Kings" etc. that some
  //      @hebcal/learning schedules append after the Hebrew citation.
  //      Pattern: 1+ whitespace + 1+ ASCII letters/spaces at end of string.
  // After both strips, reject if no Hebrew characters remain (U+0590–U+05FF)
  // to guard against schedules that produce fully-English output.
  const display = rawDisplay
    .replace(/^[A-Za-z][A-Za-z\s]*:\s*/, '')        // leading "Daf Yomi: "
    .replace(/\s+[A-Za-z][A-Za-z\s]*$/, '')          // trailing "Psalms", "I Kings"
    .trim();
  // Reject if empty or contains no Hebrew characters
  if (!display || !/[֐-׿]/.test(display)) return undefined;

  return { display, url };
}

// ── Upcoming Parasha Helper (Wave 1B, Task 7) ──────────────────────────────
// Resolves the parasha of the Shabbat on/after `hdate` WITHOUT an extra
// HebrewCalendar.calendar() call per day (buildDayData runs per-day for a
// whole month grid — that would be one full calendar sweep per day).
// @hebcal/core's getSedra(hyear, il) is itself cached (internal QuickLRU,
// keyed by `${hyear}-${il}`), so repeated calls across the days of a month
// (all sharing the same Hebrew year + il) reuse the same Sedra instance —
// no extra caching needed on our side. Sedra.lookup() also handles the
// Hebrew-year boundary internally (it transparently recurses into next
// year's Sedra via getSedra() when the date's Shabbat falls just over the
// year line), so no special-casing is needed here either.
function lookupUpcomingParasha(hdate: HDate, il: boolean): string | undefined {
  const sedra = getSedra(hdate.getFullYear(), il);
  const result = sedra.lookup(hdate);
  // A Shabbat whose reading is a special holiday (Shabbat Chol HaMoed, a
  // Shabbat that falls on/adjacent to a Yom Tov, etc.) has no regular
  // parasha this week — return undefined rather than a wrong value.
  if (result.chag) return undefined;
  const ev = new ParshaEvent(result.hdate, result.parsha, il, result.num);
  return ev.renderBrief('he');
}

// ── Core DateService ──────────────────────────────────────

export class DateService {
  private diaspora: boolean;

  constructor(diaspora = false) {
    this.diaspora = diaspora;
  }

  setDiaspora(value: boolean) {
    this.diaspora = value;
    monthCache.clear(); // Invalidate cache on change
  }

  /**
   * Build a fully-populated DayData for a single Gregorian Date.
   * Used internally by getMonthData and getHebrewMonthData.
   * Fetches hebcal events for that one day and runs the same
   * classification logic that getMonthData previously applied
   * per-day over a batched eventMap.
   */
  private buildDayData(date: Date): DayData {
    const hdate = new HDate(date);

    const events = HebrewCalendar.calendar({
      start: date,
      end: date,
      isHebrewYear: false,
      il: !this.diaspora,
      omer: true,
      sedrot: true,
    });

    const holidays: string[] = [];
    const holidaysEn: string[] = [];
    let parasha: string | undefined;
    let isYomTov = false;
    let isCholHamoed = false;
    let omerDay: number | undefined;

    for (const ev of events) {
      const mask = ev.getFlags();
      if (mask & flags.PARSHA_HASHAVUA) {
        parasha = ev.renderBrief('he');
      } else if (mask & flags.OMER_COUNT) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        omerDay = (ev as any).omer;
      } else if (mask & flags.YOM_TOV_ENDS || mask & flags.CHAG) {
        isYomTov = true;
        holidays.push(ev.renderBrief('he'));
        holidaysEn.push(ev.renderBrief('en'));
      } else if (mask & flags.CHOL_HAMOED) {
        isCholHamoed = true;
        holidays.push(ev.renderBrief('he'));
        holidaysEn.push(ev.renderBrief('en'));
      } else if (!(mask & flags.PARSHA_HASHAVUA) && !(mask & flags.OMER_COUNT)) {
        holidays.push(ev.renderBrief('he'));
        holidaysEn.push(ev.renderBrief('en'));
      }
    }

    const monthInfo = HEBREW_MONTH_NAMES[hdate.getMonth()] ?? { he: '', en: '' };
    const upcomingParasha = lookupUpcomingParasha(hdate, !this.diaspora);

    return {
      gregorianDate: date,
      hebrewDate: {
        day: hdate.getDate(),
        month: hdate.getMonth(),
        year: hdate.getFullYear(),
        monthName: monthInfo.he,
        monthNameTranslit: monthInfo.en,
        fullDate: `${toHebrewNumeral(hdate.getDate())} ${monthInfo.he}`,
        isShabbat: date.getDay() === 6,
        isRoshChodesh: hdate.getDate() === 1 || hdate.getDate() === 30,
      },
      holidays,
      holidaysEn,
      parasha,
      upcomingParasha,
      isYomTov,
      isCholHamoed,
      omerDay,
      dafYomi:          renderLearning('dafYomi',      hdate, !this.diaspora),
      rambamOneChapter: renderLearning('rambam1',      hdate, !this.diaspora),
      mishnaYomi:       renderLearning('mishnaYomi',   hdate, !this.diaspora),
      nachYomi:         renderLearning('nachYomi',     hdate, !this.diaspora),
      tanakhYomi:       renderLearning('tanakhYomi',   hdate, !this.diaspora),
      chofetzChaim:     renderLearning('chofetzChaim', hdate, !this.diaspora),
      psalms:           renderLearning('psalms',       hdate, !this.diaspora),
    };
  }

  /**
   * Get all day data for a given Gregorian month.
   * Cached per month.
   */
  getMonthData(year: number, month: number): DayData[] {
    const key = getCacheKey(year, month, this.diaspora);
    if (monthCache.has(key)) return monthCache.get(key)!;

    const days: DayData[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      days.push(this.buildDayData(new Date(year, month - 1, d)));
    }

    monthCache.set(key, days);
    return days;
  }

  /**
   * Get all day data for a given Hebrew month.
   * Iterates over every day in the Hebrew month (HDate.daysInMonth handles
   * leap-year Adar I/II correctly), converts each to its Gregorian date,
   * and delegates to buildDayData.
   * Cached with a distinct key prefixed "he_" to avoid collision with
   * Gregorian keys (which are formatted as "${year}-${month}-${d|i}").
   * setDiaspora clears monthCache, which also invalidates Hebrew entries.
   */
  getHebrewMonthData(hYear: number, hMonth: number): DayData[] {
    const key = `he_${hYear}_${hMonth}_${this.diaspora}`;
    if (monthCache.has(key)) return monthCache.get(key)!;

    const days: DayData[] = [];
    const len = HDate.daysInMonth(hMonth, hYear);

    for (let day = 1; day <= len; day++) {
      const hd = new HDate(day, hMonth, hYear);
      days.push(this.buildDayData(hd.greg()));
    }

    monthCache.set(key, days);
    return days;
  }

  /**
   * Get data for a single day (used for daily view)
   */
  getDayData(date: Date): DayData {
    const month = this.getMonthData(date.getFullYear(), date.getMonth() + 1);
    return month[date.getDate() - 1];
  }

  /**
   * Convert a Hebrew calendar date (year/month/day) to its Gregorian
   * equivalent.
   *
   * Returns null if the date is invalid for the given Hebrew year — e.g.,
   * month 13 (Adar II) in a non-leap year, or a day out of range for
   * that month. This cleanly handles "Feb 29 equivalents" in the Hebrew
   * calendar without throwing.
   *
   * Used by expandRecurringNotes (Phase 4.2-1) to compute the Gregorian
   * date that a Hebrew-anchored recurring note (birthday, yahrzeit,
   * anniversary) falls on in any given year.
   */
  hebrewToGregorian(hebYear: number, hebMonth: number, hebDay: number): Date | null {
    try {
      const hd = new HDate(hebDay, hebMonth, hebYear);
      return hd.greg();
    } catch {
      return null;
    }
  }

  /**
   * Returns months for a Hebrew year in Tishrei-first display order.
   *
   * Common year (12 months): 7,8,9,10,11,12,1,2,3,4,5,6
   * Leap year   (13 months): 7,8,9,10,11,12,13,1,2,3,4,5,6
   *
   * nameHe is sourced from HEBREW_MONTH_NAMES. In a leap year, month 12
   * (Adar I) is returned as "אדר א׳" to distinguish it from month 13
   * (Adar II, "אדר ב׳"). In a common year, month 12 returns plain "אדר".
   */
  getHebrewMonthsForYear(hYear: number): { month: number; nameHe: string }[] {
    const monthsInYear = HDate.monthsInYear(hYear);
    const isLeap = HDate.isLeapYear(hYear);

    const base = [7, 8, 9, 10, 11, 12];
    if (monthsInYear === 13) base.push(13);
    const order = [...base, 1, 2, 3, 4, 5, 6];

    return order.map((month) => {
      const entry = HEBREW_MONTH_NAMES[month] ?? { he: '', en: '' };
      // In a leap year, month 12 is Adar I — override the plain "אדר" entry.
      const nameHe = (isLeap && month === 12) ? 'אדר א׳' : entry.he;
      return { month, nameHe };
    });
  }

  /**
   * Returns the number of days in a Hebrew month (29 or 30).
   * Thin wrapper around HDate.daysInMonth — arg order is (month, year).
   */
  getHebrewDaysInMonth(hMonth: number, hYear: number): number {
    return HDate.daysInMonth(hMonth, hYear);
  }

  /**
   * Get Hebrew date for "after sunset" — returns next Hebrew day
   */
  getAfterSunsetHebrewDate(date: Date): HebrewDateInfo {
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hdate = new HDate(tomorrow);
    const monthInfo = HEBREW_MONTH_NAMES[hdate.getMonth()] ?? { he: '', en: '' };
    return {
      day: hdate.getDate(),
      month: hdate.getMonth(),
      year: hdate.getFullYear(),
      monthName: monthInfo.he,
      monthNameTranslit: monthInfo.en,
      fullDate: `${toHebrewNumeral(hdate.getDate())} ${monthInfo.he}`,
      isShabbat: tomorrow.getDay() === 6,
      isRoshChodesh: hdate.getDate() === 1 || hdate.getDate() === 30,
    };
  }

}

export const dateService = new DateService();

/**
 * Returns the Omer count for the given Gregorian date, or null if the
 * date falls outside the Omer period (16 Nisan – 5 Sivan).
 *
 * Uses a targeted single-day HebrewCalendar lookup. Does not touch the
 * month cache and has no side effects on cached state.
 */
export function getOmerForDate(date: Date): { day: number; text: string } | null {
  const events = HebrewCalendar.calendar({
    start: date,
    end: date,
    isHebrewYear: false,
    omer: true,
  });
  const omerEvent = events.find(ev => (ev.getFlags() & flags.OMER_COUNT) !== 0);
  if (!omerEvent) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const day = (omerEvent as any).omer as number;
  const text = omerEvent.render('he');
  if (!day || !text) return null;
  return { day, text };
}
