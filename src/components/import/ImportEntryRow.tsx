// src/components/import/ImportEntryRow.tsx
// Settings entry for the .ics import (Figma B1, node 38:58). Self-contained
// row; sits inside <Card>, which injects `isLast`.

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Download, ChevronLeft } from 'lucide-react-native';
import { typography, withFontFamily } from '../../constants/typography';
import type { ThemeColors } from '../../hooks/useThemeColors';

export function ImportEntryRow({
  colors,
  isLast = false,
}: {
  colors: ThemeColors;
  isLast?: boolean;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/importIcs' as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
      android_ripple={{ color: colors.border }}
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="ייבוא מקובץ"
      accessibilityHint="קובץ יומן שיוצא מגוגל, מאאוטלוק ועוד"
    >
      <Download size={20} color={colors.textSecondary} />
      <View style={styles.labels}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>ייבוא מקובץ</Text>
        <Text style={[styles.sub, { color: colors.textTertiary }]}>
          קובץ יומן שיוצא מגוגל, מאאוטלוק ועוד
        </Text>
      </View>
      <ChevronLeft size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    minHeight: 48,
  },
  labels: { flex: 1, gap: 2 },
  label: { ...withFontFamily(typography.bodyMedium, '400'), textAlign: 'right' },
  sub: { ...withFontFamily(typography.subtitle, '400'), lineHeight: 17, textAlign: 'right' },
});
