// src/components/ui/SectionLabel.tsx
// Small caption-bold section label rendered OUTSIDE a Card, above it.
// Shared by settings.tsx, locationPicker.tsx, and details.tsx (redesign).

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { typography, withFontFamily } from '../../constants/typography';
import type { ThemeColors } from '../../hooks/useThemeColors';

export function SectionLabel({ title, colors }: { title: string; colors: ThemeColors }) {
  return <Text style={[styles.label, { color: colors.accent }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...withFontFamily(typography.captionBold),
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    textAlign: 'right',
  },
});
