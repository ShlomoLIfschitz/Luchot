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
 * Order (per SCREENS.md):
 *   1. Holidays (Jewish) — highest priority, shown first
 *   2. Special days (Rosh Chodesh, national days) — via isRoshChodesh
 *   3. Omer count — only if no holidays (Pesach/Lag BaOmer/Shavuot
 *      already convey the same period)
 *   4. User events (noteType='note')
 *   5. Personal (noteType='birthday' | 'yahrzeit' | 'anniversary')
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
  const tags: DayCellTag[] = [];

  // 1. Jewish holidays (highest priority)
  for (const holiday of dayData.holidays) {
    tags.push({ category: 'holiday', label: holiday });
  }

  // 2. Rosh Chodesh → tagSpecial (only when not already a Yom Tov,
  //    to avoid double-tagging e.g. Rosh Hashana which is both)
  if (dayData.hebrewDate.isRoshChodesh && !dayData.isYomTov) {
    tags.push({ category: 'special', label: 'ראש חודש' });
  }

  // 3. Omer count → tagSpecial (only when no holidays, since Pesach /
  //    Lag BaOmer / Shavuot already convey the sefirah period)
  if (dayData.omerDay !== undefined && dayData.holidays.length === 0) {
    tags.push({ category: 'special', label: `יום ${dayData.omerDay} לעומר` });
  }

  // 4 & 5. User notes — category resolved via colorId override or type default
  for (const note of userNotes) {
    tags.push({
      category: resolveEventColor(note.noteType, note.colorId),
      label: note.summary,
    });
  }

  return tags;
}
