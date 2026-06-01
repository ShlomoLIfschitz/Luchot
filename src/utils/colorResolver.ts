// src/utils/colorResolver.ts
// Resolves the display TagCategory for a user event, respecting an optional
// colorId override. colorId stores the token key (e.g. 'tagPersonal'); when
// absent, a default is inferred from the note type.

import type { TagCategory } from '../components/calendar/DayCell';
import type { NoteType } from '../hooks/useNotes';

/** The 5 colour token keys the user can assign to an event. */
export const COLOR_OPTIONS = [
  'tagPersonal',
  'tagEvent',
  'tagSpecial',
  'tagShabbat',
  'tagHoliday',
] as const;

export type ColorTokenKey = (typeof COLOR_OPTIONS)[number];

/** Maps a stored token key to the TagCategory used by DayCell. */
const TOKEN_TO_CATEGORY: Record<ColorTokenKey, TagCategory> = {
  tagPersonal: 'personal',
  tagEvent:    'event',
  tagSpecial:  'special',
  tagShabbat:  'shabbat',
  tagHoliday:  'holiday',
};

/** Default category per note type when no colorId override is set. */
const DEFAULT_CATEGORY: Record<NoteType, TagCategory> = {
  note:        'event',
  birthday:    'personal',
  yahrzeit:    'personal',
  anniversary: 'personal',
};

/**
 * Returns the TagCategory to use for a user event tag in DayCell.
 * Respects an explicit colorId override; falls back to the type default.
 *
 * @param noteType  The note's type (note | birthday | yahrzeit | anniversary).
 * @param colorId   The user-chosen token key, or null/undefined for default.
 */
export function resolveEventColor(
  noteType: NoteType,
  colorId: string | null | undefined,
): TagCategory {
  if (colorId && colorId in TOKEN_TO_CATEGORY) {
    return TOKEN_TO_CATEGORY[colorId as ColorTokenKey];
  }
  return DEFAULT_CATEGORY[noteType] ?? 'event';
}
