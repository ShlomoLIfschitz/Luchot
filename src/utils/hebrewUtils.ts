// src/utils/hebrewUtils.ts

/**
 * Matches Hebrew niqqud (vowel points) and te'amim (cantillation marks).
 *
 * This is intentionally NOT a single contiguous ֑-ׇ class, even
 * though that's the visual span of the Hebrew points block. That span
 * also contains punctuation characters that must survive stripping:
 *   - U+05BE maqaf        (Hebrew hyphen, e.g. inside "חוה״מ"-style text)
 *   - U+05C0 paseq         (verse-internal cantillation separator, not a point)
 *   - U+05C3 sof pasuq     (verse-end punctuation)
 *   - U+05C6 nun hafukha   (inverted nun, a structural marker, not a point)
 * A naive ֑-ׇ regex would silently destroy these too. The class
 * below is the union of the real sub-ranges — cantillation (U+0591-U+05AF),
 * niqqud + meteg (U+05B0-U+05BD), rafe (U+05BF), shin/sin dots
 * (U+05C1-U+05C2), upper/lower dots (U+05C4-U+05C5), and qamats qatan
 * (U+05C7) — which naturally skips the punctuation gaps above without
 * needing explicit exclusions.
 *
 * Geresh (U+05F3), gershayim (U+05F4), and ASCII quotes/apostrophes live
 * outside this block entirely and are never touched by this regex.
 */
const NIKUD_REGEX = /[֑-ׇֽֿׁׂׅׄ]/g;

/**
 * Strips Hebrew niqqud (vowel points) and te'amim (cantillation marks)
 * from a string, leaving consonantal letters and all punctuation
 * (geresh, gershayim, maqaf, quotes) untouched.
 *
 * Pure, dependency-free. Defensive against undefined/null/empty input
 * (returns '' rather than throwing) so callers don't need to guard.
 * Cheap — a single regex replace — safe to call per-string in hot loops
 * such as DateService.buildDayData, which runs once per calendar day.
 */
export function stripNikud(text: string): string {
  if (!text) return '';
  return text.replace(NIKUD_REGEX, '');
}
