import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ZmanimResult } from '../../services/ZmanimService';
import { formatZmanTime } from '../../services/ZmanimService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { radius } from '../../constants/radius';
import { typography, withFontFamily } from '../../constants/typography';

interface Props {
  zmanim: ZmanimResult;
}

export function ZmanimList({ zmanim }: Props) {
  const colors = useThemeColors();
  const use24h = useSettingsStore((s) => s.use24hTime);
  const rows: [string, Date | null][] = [
    ['עלות השחר', zmanim.alotHashachar],
    ['נץ החמה', zmanim.netz],
    ['סוף זמן ק״ש (גר״א)', zmanim.sofZmanShmaGRA],
    ['חצות', zmanim.chatzot],
    ['מנחה גדולה', zmanim.minchaGedola],
    ['שקיעה', zmanim.shkia],
    ['צאת הכוכבים', zmanim.tzeitHakochavim],
  ];

  const showOffsetHint =
    !!zmanim.candleLightingOffsetMinutes &&
    zmanim.candleLightingOffsetMinutes !== 18;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.accent }]}>זמנים</Text>
      {rows.map(([label, d]) => (
        <View key={label} style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
          {/* row-reverse, JSX order: label (flex:1, right) → time (left) */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.time, { color: colors.textPrimary }]}>{formatZmanTime(d, use24h)}</Text>
        </View>
      ))}

      {/* Candle lighting — shown on Fridays only (candleLighting is null on other days).
          Highlighted with candleBg / candle text, matching ZmanimFullList. */}
      {zmanim.candleLighting && (
        <View style={[styles.row, { backgroundColor: colors.candleBg, borderBottomColor: colors.borderSubtle }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>הדלקת נרות</Text>
          <View style={styles.candleValueBlock}>
            <Text style={[styles.time, { color: colors.candle }]}>
              {formatZmanTime(zmanim.candleLighting, use24h)}
            </Text>
            {showOffsetHint && (
              <Text style={[styles.offsetHint, { color: colors.textTertiary }]}>
                {`${zmanim.candleLightingOffsetMinutes} דקות לפני שקיעה`}
                {zmanim.candleLightingCityNameHe
                  ? ` (מנהג ${zmanim.candleLightingCityNameHe})`
                  : ''}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  title:     { ...withFontFamily(typography.captionBold), marginBottom: 8, textAlign: 'right' },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  label: { ...withFontFamily(typography.bodyMedium), flex: 1, textAlign: 'right' },
  time:  { ...withFontFamily(typography.bodyLarge), fontWeight: '700' },
  candleValueBlock: { alignItems: 'flex-start' },
  offsetHint: { ...withFontFamily(typography.micro), marginTop: 1, textAlign: 'right' },
});
