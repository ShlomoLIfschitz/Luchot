// src/utils/hebrewLabels.ts
// Display strings used by the screen headers, in the exact wording of the
// Figma frames ("יום שישי", "ד׳ בתשרי תשפ״ו", "26 בספטמבר 2025").
// Built from local tables, never toLocaleDateString — Hermes on Android has
// unreliable Intl data (same rule as MonthGrid / weekTimelineLayout).

import { dateService, toHebrewNumeral, toHebrewYear } from '../services/DateService';
import { GREG_MONTHS_HE } from '../components/calendar/weekTimelineLayout';

const WEEKDAY_NAMES_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

/** "יום שישי" (Saturday: "שבת"). */
export function weekdayNameHe(d: Date): string {
  return WEEKDAY_NAMES_HE[d.getDay()];
}

/** "ד׳ בתשרי" */
export function hebrewDayMonth(d: Date): string {
  const h = dateService.getDayData(d).hebrewDate;
  return `${toHebrewNumeral(h.day)} ב${h.monthName}`;
}

/** "ד׳ בתשרי תשפ״ו" */
export function hebrewFullDate(d: Date): string {
  const h = dateService.getDayData(d).hebrewDate;
  return `${toHebrewNumeral(h.day)} ב${h.monthName} ${toHebrewYear(h.year)}`;
}

/** "26 בספטמבר 2025" */
export function gregFullDate(d: Date): string {
  return `${d.getDate()} ב${GREG_MONTHS_HE[d.getMonth()]} ${d.getFullYear()}`;
}
