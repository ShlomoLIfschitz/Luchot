import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  visible?: boolean;
}

export function SunsetBadge({ visible = true }: Props) {
  const colors = useThemeColors();
  if (!visible) return null;
  return <Text style={[styles.badge, { color: colors.candle }]}>✶</Text>;
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 8,
  },
});
