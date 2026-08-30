// src/constants/typography.ts
// Type scale — matches docs/DESIGN.md Typography section, extended with the
// additional steps used by the redesign (screenTitle, cardTitle, cellPrimary,
// cellSecondary, cellTag).

import type { TextStyle } from 'react-native';

// Heebo, approved and bundled via @expo-google-fonts/heebo (loaded in
// app/_layout.tsx). Every consumer that spreads `typography.xxx` through
// `withFontFamily()` picks this up automatically.
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
  cardTitle:      { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  bodyLarge:      { fontSize: 17, fontWeight: '500', lineHeight: 24 },
  bodyMedium:     { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodySmall:      { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  caption:        { fontSize: 11, fontWeight: '500', lineHeight: 14 },
  captionBold:    { fontSize: 11, fontWeight: '700', lineHeight: 14 },
  micro:          { fontSize: 10, fontWeight: '500', lineHeight: 13 },
  cellPrimary:    { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  cellSecondary:  { fontSize: 10, fontWeight: '400', lineHeight: 13 },
  cellTag:        { fontSize: 9,  fontWeight: '500', lineHeight: 12 },
} satisfies Record<string, TypeStyle>;

export type Typography = typeof typography;
export type TypographyKey = keyof Typography;

/**
 * Helper for consumers: spreads a typography step plus (optionally) the
 * global FONT_FAMILY into a single object, ready to drop into
 * `StyleSheet.create`. This is the recommended way to consume a step so that
 * flipping FONT_FAMILY to Heebo later requires no changes at call sites.
 *
 * Example:
 *   const styles = StyleSheet.create({
 *     title: { ...withFontFamily(typography.cardTitle), color: colors.textPrimary },
 *   });
 */
export function withFontFamily(step: TypeStyle): TypeStyle & { fontFamily?: string } {
  return FONT_FAMILY ? { ...step, fontFamily: FONT_FAMILY } : step;
}
