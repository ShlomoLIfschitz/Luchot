// src/services/DateService.ts

import { HDate, HebrewCalendar, Event as HebcalEvent, flags, parshiot } from '@hebcal/core';

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

export interface DayData {
  gregorianDate: Date;
  hebrewDate: HebrewDateInfo;
  holidays: string[];         // Holiday names (Hebrew)
  holidaysEn: string[];
  parasha?: string;           // Only on Shabbat
  isYomTov: boolean;
  isCholHamoed: boolean;
  omerDay?: number;           // 1-49 during Sefirat HaOmer
  dafYomi?: string;           // e.g. "ברכות דף ב"
  rambamChapter?: string;
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
    const startDate = new HDate(1, month, year);
    const endDate = new HDate(daysInMonth, month, year);

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
        dafYomi: this.getDafYomi(date),
        rambamChapter: this.getRambamChapter(date),
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

  // ── Daf Yomi (simplified — real implementation uses full cycle table) ──

  private getDafYomi(date: Date): string {
    // Daf Yomi cycle 14 started Jan 5, 2020
    const cycleStart = new Date('2020-01-05');
    const daysSinceStart = Math.floor((date.getTime() - cycleStart.getTime()) / 86400000);
    const totalDafs = 2711; // Total daf in Shas
    const currentDaf = daysSinceStart % totalDafs;

    const tractates = [
      { name: 'ברכות', dafs: 64 }, { name: 'שבת', dafs: 157 },
      { name: 'עירובין', dafs: 105 }, { name: 'פסחים', dafs: 121 },
      { name: 'שקלים', dafs: 22 }, { name: 'יומא', dafs: 88 },
      { name: 'סוכה', dafs: 56 }, { name: 'ביצה', dafs: 40 },
      { name: 'ראש השנה', dafs: 35 }, { name: 'תענית', dafs: 31 },
      { name: 'מגילה', dafs: 32 }, { name: 'מועד קטן', dafs: 29 },
      { name: 'חגיגה', dafs: 27 }, { name: 'יבמות', dafs: 122 },
      { name: 'כתובות', dafs: 112 }, { name: 'נדרים', dafs: 91 },
      { name: 'נזיר', dafs: 66 }, { name: 'סוטה', dafs: 49 },
      { name: 'גיטין', dafs: 90 }, { name: 'קידושין', dafs: 82 },
      { name: 'בבא קמא', dafs: 119 }, { name: 'בבא מציעא', dafs: 119 },
      { name: 'בבא בתרא', dafs: 176 }, { name: 'סנהדרין', dafs: 113 },
      { name: 'מכות', dafs: 24 }, { name: 'שבועות', dafs: 49 },
      { name: 'עבודה זרה', dafs: 76 }, { name: 'הוריות', dafs: 14 },
      { name: 'זבחים', dafs: 120 }, { name: 'מנחות', dafs: 110 },
      { name: 'חולין', dafs: 142 }, { name: 'בכורות', dafs: 61 },
      { name: 'ערכין', dafs: 34 }, { name: 'תמורה', dafs: 34 },
      { name: 'כריתות', dafs: 28 }, { name: 'מעילה', dafs: 22 },
      { name: 'נידה', dafs: 73 },
    ];

    let remaining = currentDaf;
    for (const t of tractates) {
      if (remaining < t.dafs) {
        return `${t.name} דף ${toHebrewNumeral(remaining + 2)}`;
      }
      remaining -= t.dafs;
    }
    return '';
  }

  private getRambamChapter(date: Date): string {
    // Rambam 1-chapter cycle: 1000 chapters over ~3 years
    const cycleStart = new Date('2023-05-25');
    const daysSinceStart = Math.floor((date.getTime() - cycleStart.getTime()) / 86400000);
    const chapter = (daysSinceStart % 1000) + 1;
    return `פרק ${toHebrewNumeral(chapter)}`;
  }
}

export const dateService = new DateService();
