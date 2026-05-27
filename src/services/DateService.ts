// src/services/DateService.ts

import { HDate, HebrewCalendar, Event as HebcalEvent, flags, DailyLearning } from '@hebcal/core';
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

  // Strip leading English prefix like "Daf Yomi: " or "Mishna Yomi: " —
  // the Details screen already shows a Hebrew label on each row, so the
  // bilingual prefix is redundant and compresses the Hebrew display text.
  // Pattern: one or more ASCII letters/spaces followed by ":" + optional space.
  const display = rawDisplay.replace(/^[A-Za-z][A-Za-z\s]*:\s*/, '').trim();
  if (!display) return undefined; // guard against full-English edge case

  return { display, url };
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
   * Get all day data for a given Gregorian month.
   * Cached per month.
   */
  getMonthData(year: number, month: number): DayData[] {
    const key = getCacheKey(year, month, this.diaspora);
    if (monthCache.has(key)) return monthCache.get(key)!;

    const days: DayData[] = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    // Fetch all hebcal events for this month once
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month - 1, daysInMonth);

    const events = HebrewCalendar.calendar({
      start: startDate,
      end: endDate,
      isHebrewYear: false,
      il: !this.diaspora,
      omer: true,
      sedrot: true,
    });

    // Build a map: dateString → events
    const eventMap = new Map<string, HebcalEvent[]>();
    for (const ev of events) {
      const d = ev.getDate().greg();
      const k = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!eventMap.has(k)) eventMap.set(k, []);
      eventMap.get(k)!.push(ev);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const hdate = new HDate(date);
      const evKey = `${year}-${month}-${d}`;
      const dayEvents = eventMap.get(evKey) ?? [];

      const holidays: string[] = [];
      const holidaysEn: string[] = [];
      let parasha: string | undefined;
      let isYomTov = false;
      let isCholHamoed = false;
      let omerDay: number | undefined;

      for (const ev of dayEvents) {
        const mask = ev.getFlags();
        if (mask & flags.PARSHA_HASHAVUA) {
          parasha = ev.renderBrief('he');
        } else if (mask & flags.OMER_COUNT) {
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

      days.push({
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
      });
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
