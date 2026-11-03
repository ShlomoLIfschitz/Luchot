// src/components/ui/SectionLabel.tsx
// Small caption-bold section label rendered OUTSIDE a Card, above it.
// Shared by settings.tsx, zmanim, locationPicker.tsx, and details.tsx.
//
// Figma (2026-11-03 parity pass): 11 Bold accent, right-aligned flush with
// the card edge, separated from its neighbours by the screen's own gap
// (8 on Settings, 12 on Location, 10 on Details, 14 on Zmanim). `inset` is
// the horizontal inset (16 on screens whose content has no padding of its
// own, 0 inside an already-padded content column).

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { typography, withFontFamily } from '../../constants/typography';
import type { ThemeColors } from '../../hooks/useThemeColors';

export function SectionLabel({
  title,
  colors,
  inset = 16,
  gapAbove = 8,
  gapBelow = 8,
}: {
  title: string;
  colors: ThemeColors;
  inset?: number;
  gapAbove?: number;
  gapBelow?: number;
}) {
  return (
    <Text
      style={[
        styles.label,
        { color: colors.accent, paddingHorizontal: inset, paddingTop: gapAbove, paddingBottom: gapBelow },
      ]}
    >
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    ...withFontFamily(typography.captionBold),
    textAlign: 'right',
  },
});
