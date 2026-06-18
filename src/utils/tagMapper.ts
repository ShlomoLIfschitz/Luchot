// src/utils/tagMapper.ts
// Maps a day's holidays and user notes to DayCellTag[] for display.
// Pure function — no React, no hooks, no side effects. Testable in isolation.

import type { DayData } from '../services/DateService';
import type { CalendarNote } from '../hooks/useNotes';
import type { DayCellTag } from '../components/calendar/DayCell';
import { resolveEventColor } from './colorResolver';

/**
 * Maps a DayData (holidays, Rosh Chodesh, Omer) and a list of user
 * CalendarNotes for that date into DayCellTag[].
 *
 * Order (per SCREENS.md + Slice C top-lane rule):
 *   0. Multi-day SPAN tags (notes with segment defined) — lifted to the front
 *      so the bar occupies the same slot every day across the week.
 *   1. Holidays (Jewish)
 *   2. Special days (Rosh Chodesh, national days) — via isRoshChodesh
 *   3. Omer count — only if no holidays
 *   4. Single-day user events (noteType='note', no segment)
 *   5. Single-day personal (noteType='birthday' | 'yahrzeit' | 'anniversary', no segment)
 *
 * Within each group, order is the order received.
 *
 * Shabbat is intentionally NOT added as a tag — it is conveyed via
 * background tint in DayCell (isShabbat prop).
 *
 * Does NOT slice to 2 — that is DayCell's responsibility. Returns the
 * full ordered list.
 */
export function buildDayTags(
  dayData: DayData,
  userNotes: CalendarNote[],
): DayCellTag[] {
  // ── 0. Split user notes into span tags (multi-day segment) vs normal ─────────
  // Span tags are lifted to the front so the bar aligns horizontally across days.
  // Label rule: only the start day carries the title; middle and end show blank.
  const spanTags: DayCellTag[] = [];
  const normalNoteTags: DayCellTag[] = [];

  for (const note of userNotes) {
    const category = resolveEventColor(note.noteType, note.colorId);
    if (note.segment !== undefined) {
      // Multi-day span: blank label on non-start days so middle/end are bars only.
      const label = note.segment.isStart ? note.summary : '';
      spanTags.push({ category, label, segment: note.segment });
    } else {
      // Single-day note (or recurring instance): normal chip, no segment.
      normalNoteTags.push({ category, label: note.summary });
    }
  }

  // ── 1–3. Holiday / special / omer tags (ordering unchanged) ──────────────────
  const holidayTags: DayCellTag[] = [];

  for (const holiday of dayData.holidays) {
    holidayTags.push({ category: 'holiday', label: holiday });
  }

  // Rosh Chodesh → tagSpecial (only when not already a Yom Tov,
  // to avoid double-tagging e.g. Rosh Hashana which is both).
  // Also skip if hebcal already emitted a Rosh Chodesh entry into
  // holidays[] (detected via stable English label) to avoid the
  // "ראש חודש" / "ראש חודש סיון" duplicate.
  const specialTags: DayCellTag[] = [];
  const hasRoshChodeshHoliday = dayData.holidaysEn.some((h) => h.startsWith('Rosh Chodesh'));
  if (dayData.hebrewDate.isRoshChodesh && !dayData.isYomTov && !hasRoshChodeshHoliday) {
    specialTags.push({ category: 'special', label: 'ראש חודש' });
  }

  // Omer count → tagSpecial (only when no holidays, since Pesach /
  // Lag BaOmer / Shavuot already convey the sefirah period)
  if (dayData.omerDay !== undefined && dayData.holidays.length === 0) {
    specialTags.push({ category: 'special', label: `יום ${dayData.omerDay} לעומר` });
  }

  // ── Assemble: spans first, then holidays, specials, single-day notes ─────────
  return [...spanTags, ...holidayTags, ...specialTags, ...normalNoteTags];
}
