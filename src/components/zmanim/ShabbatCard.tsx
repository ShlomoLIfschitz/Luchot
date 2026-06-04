// src/components/zmanim/ShabbatCard.tsx
// Phase 5 — Shabbat summary card shown on Friday and Saturday in the Day screen.
// Friday: candle-lighting time. Saturday: tzeis + Rabbeinu Tam.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatZmanTime } from '../../services/ZmanimService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';

interface Props {
  selectedDate: Date;
  candleLightingTime: Date | null;
  tzaisTime: Date | null;
  rabbeinuTamTime: Date | null;
  locationName: string | null;
  use24h: boolean;
}

export function ShabbatCard({
  selectedDate,
  candleLightingTime,
  tzaisTime,
  rabbeinuTamTime,
  locationName,
  use24h,
}: Props) {
  // All hooks must run before any early return (Rules of Hooks — see
  // DECISIONS.md "Drawer.tsx: all hook calls before any early return").
  const colors = useThemeColors();

  const day = selectedDate.getDay();
  if (day !== 5 && day !== 6) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.tagShabbat }]}>שבת קודש</Text>

      {/* Location row — only when locationName is provided */}
      {!!locationName && (
        <View style={styles.row}>
          {/* label on the right (first child in row-reverse) */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {`מיקום: ${locationName}`}
          </Text>
        </View>
      )}

      {day === 5 ? (
        /* Friday — candle lighting */
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>הדלקת נרות</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {formatZmanTime(candleLightingTime, use24h)}
          </Text>
        </View>
      ) : (
        /* Saturday — tzeis + Rabbeinu Tam */
        <>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>צאת השבת</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {formatZmanTime(tzaisTime, use24h)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>ר״ת</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {formatZmanTime(rabbeinuTamTime, use24h)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    gap: 12,
  },
  label: {
    fontSize: 14,
    textAlign: 'right',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },
});
