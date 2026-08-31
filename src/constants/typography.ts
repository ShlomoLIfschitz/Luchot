// src/constants/typography.ts
// Type scale — matches docs/DESIGN.md Typography section, extended with the
// additional steps used by the redesign (screenTitle, cardTitle, cellPrimary,
// cellSecondary, cellTag).
//
// 2026-08-31 typography drift fix: the scale was missing two steps the
// actual (post-redesign) Figma file relies on — 14px and 12px — so every
// call site that needed one of those sizes mapped to the nearest existing
// step instead, compounding into a visible drift (most visibly, zmanim row
// times rendering at 17 Bold against a 15 Regular label instead of the
// correct 15 Bold / 14 Regular). `label` (14/400) and `subtitle` (12/500)
// were added to close that gap. No existing step's values were changed.
//
// 2026-08-31 (same pass, part 2): Figma also relies on 16px and 18px, which
// the scale still could not express. Added `emphasis` (16/500) and
// `sheetTitle` (18/700). Their lineHeight values were derived by linear
// interpolation from the immediate neighbours already in the scale (NOT
// invented): sheetTitle sits between cardTitle (17/22) and screenTitle
// (19/24) — slope 1px lineHeight per 1px fontSize — giving 18/23; emphasis
// sits between bodyMedium (15/22) and bodyLarge (17/24) — same slope —
// giving 16/23. No existing step's values were changed.

import type { TextStyle } from 'react-native';

// Heebo, approved and bundled via @expo-google-fonts/heebo (loaded in
// app/_layout.tsx). Every consumer that spreads `typography.xxx` through
// `withFontFamily()` picks this up automatically.
//
// FONT_FAMILY is the single switch point for the app's typeface: if the app
// ever changes fonts, only this constant (and the WEIGHT_TO_FAMILY table
// below it) need editing — no call site should need to change.
export const FONT_FAMILY: string | undefined = 'Heebo_400Regular';

interface TypeStyle {
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  lineHeight: number;
}

export const typography = {
  displayLarge:   { fontSize: 32, fontWeight: '700', lineHeight: 38 },
  displayMedium:  { fontSize: 24, fontWeight: '700', lineHeight: 30 },
  displaySmall:   { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  screenTitle:    { fontSize: 19, fontWeight: '700', lineHeight: 24 },
  sheetTitle:     { fontSize: 18, fontWeight: '700', lineHeight: 23 },
  cardTitle:      { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  bodyLarge:      { fontSize: 17, fontWeight: '500', lineHeight: 24 },
  emphasis:       { fontSize: 16, fontWeight: '500', lineHeight: 23 },
  bodyMedium:     { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  label:          { fontSize: 14, fontWeight: '400', lineHeight: 19 },
  bodySmall:      { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  subtitle:       { fontSize: 12, fontWeight: '500', lineHeight: 16 },
  caption:        { fontSize: 11, fontWeight: '500', lineHeight: 14 },
  captionBold:    { fontSize: 11, fontWeight: '700', lineHeight: 14 },
  micro:          { fontSize: 10, fontWeight: '500', lineHeight: 13 },
  cellPrimary:    { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  cellSecondary:  { fontSize: 10, fontWeight: '400', lineHeight: 13 },
  cellTag:        { fontSize: 9,  fontWeight: '500', lineHeight: 12 },
} satisfies Record<string, TypeStyle>;

export type Typography = typeof typography;
export type TypographyKey = keyof Typography;

// The four static weights actually bundled via @expo-google-fonts/heebo and
// registered with useFonts() in app/_layout.tsx. The string values below are
// the exact object keys passed to useFonts() there (Heebo_400Regular,
// Heebo_500Medium, Heebo_600SemiBold, Heebo_700Bold) — those keys ARE the
// font-family names RN's font manager registers, so they must match
// character-for-character or the family silently falls back to the system
// font instead of erroring.
type RegisteredWeight = '400' | '500' | '600' | '700';

// RN's built-in weight aliases resolve onto one of the registered weights
// above ('normal' -> 400, 'bold' -> 700), so a caller may pass either form.
type WeightAlias = 'normal' | 'bold';

// Weights a caller is allowed to request via the optional `overrideWeight`
// argument of withFontFamily(). Deliberately NOT the full
// TextStyle['fontWeight'] union — restricting it to weights that actually
// have a bundled Heebo static means passing an unregistered weight (e.g.
// '800', which Heebo doesn't ship as a static in this app) is a compile-time
// error instead of a silent, invisible fallback to Regular.
export type OverridableWeight = RegisteredWeight | WeightAlias;

const WEIGHT_TO_FAMILY: Record<RegisteredWeight, string> = {
  '400': 'Heebo_400Regular',
  '500': 'Heebo_500Medium',
  '600': 'Heebo_600SemiBold',
  '700': 'Heebo_700Bold',
};

/**
 * Resolves any TextStyle['fontWeight'] value (including weights this app
 * doesn't currently declare anywhere, like '300' or '900') onto one of the
 * four weights we actually have a bundled Heebo static for.
 *
 * This only matters as a defensive fallback today — every step in
 * `typography` above already uses 400/500/600/700 — but it exists so that if
 * a future step (or a runtime-computed fontWeight at a call site) uses a
 * weight we don't have a static for, it degrades to the *nearest* bundled
 * weight rather than silently collapsing to Regular, which would be a much
 * harder bug to notice than a slightly-off weight.
 *
 * Documented mapping:
 *   'normal', '100'-'300'          -> '400' (Regular)
 *   '500'                          -> '500' (Medium)
 *   '600'                          -> '600' (SemiBold)
 *   'bold', '700', '800', '900'    -> '700' (Bold) for 700/800/900; 'bold' -> 700
 */
function resolveRegisteredWeight(weight: TextStyle['fontWeight']): RegisteredWeight {
  switch (weight) {
    case 'normal':
    case '100':
    case '200':
    case '300':
    case undefined:
      return '400';
    case '400':
      return '400';
    case '500':
      return '500';
    case '600':
      return '600';
    case 'bold':
    case '700':
    case '800':
    case '900':
      return '700';
    default:
      return '400';
  }
}

/**
 * Helper for consumers: spreads a typography step plus (when FONT_FAMILY is
 * set) the correctly-weighted Heebo family into a single object, ready to
 * drop into `StyleSheet.create`.
 *
 * Why this exists: in React Native, once `fontFamily` names a concrete font
 * file, `fontWeight` is ignored (Android does not synthesise bold for a
 * named font). So a step's `fontWeight` can never be applied by also setting
 * `fontWeight` alongside a concrete `fontFamily` — the weight has to be
 * baked into WHICH family is chosen instead. That's what this function does:
 * it looks at the step's (or the override's) fontWeight, maps it to the
 * matching bundled Heebo family, and returns a style with `fontFamily` set
 * and `fontWeight` omitted entirely (emitting both is what causes
 * inconsistent behaviour across platforms).
 *
 * Pass `overrideWeight` when a call site wants to render a step at a
 * different weight than the step's own default, e.g. a dynamic
 * "bold if selected" row:
 *   withFontFamily(typography.bodyMedium, isSelected ? '700' : '400')
 *
 * Rollback: if FONT_FAMILY is ever set back to `undefined` (system font),
 * this function returns the step with its declared `fontWeight` (or
 * `overrideWeight`, if given) intact, since the system font DOES synthesise
 * weights correctly. No call site needs to change for that rollback to work.
 *
 * Example:
 *   const styles = StyleSheet.create({
 *     title: { ...withFontFamily(typography.cardTitle), color: colors.textPrimary },
 *   });
 */
export function withFontFamily(step: TypeStyle, overrideWeight?: OverridableWeight): TextStyle {
  if (!FONT_FAMILY) {
    return overrideWeight ? { ...step, fontWeight: overrideWeight } : step;
  }
  const { fontWeight: _stepWeight, ...rest } = step;
  const registered = resolveRegisteredWeight(overrideWeight ?? _stepWeight);
  return { ...rest, fontFamily: WEIGHT_TO_FAMILY[registered] };
}
