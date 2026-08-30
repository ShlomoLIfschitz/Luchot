import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { typography, withFontFamily } from '../../constants/typography';

interface Props {
  visible?: boolean;
}

export function SunsetBadge({ visible = true }: Props) {
  const colors = useThemeColors();
  if (!visible) return null;
  return <Text style={[styles.badge, { color: colors.candle }]}>✶</Text>;
}

const styles = StyleSheet.create({
  // Nearest token: typography.cellTag (9/500/12) — smallest step in the
  // scale; fontSize delta 8→9 (1px), adds fontWeight 500 (previously unset/400).
  badge: {
    ...withFontFamily(typography.cellTag),
  },
});
