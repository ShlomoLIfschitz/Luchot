import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ZmanimResult } from '../../services/ZmanimService';
import { formatZmanTime } from '../../services/ZmanimService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { Card } from '../ui/Card';
import { SectionLabel } from '../ui/SectionLabel';
import { typography, withFontFamily } from '../../constants/typography';

interface Props {
  zmanim: ZmanimResult;
}

/** A single zmanim row. `isLast` is auto-injected by the enclosing <Card>
 *  (via React.Children.toArray) so the bottom hairline is correctly
 *  suppressed on the last visible row — including the conditionally
 *  rendered candle-lighting row on non-Friday dates. */
function ZmanRow({
  label, time, isLast = false, colors,
}: {
  label: string;
  time: Date | null;
  isLast?: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const use24h = useSettingsStore((s) => s.use24hTime);

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
      ]}
    >
      {/* row-reverse, JSX order: label (flex:1, right) → time (left) */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.time, { color: colors.textPrimary }]}>
        {formatZmanTime(time, use24h)}
      </Text>
    </View>
  );
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
      <SectionLabel title="זמנים" colors={colors} />
      <Card colors={colors}>
        {rows.map(([label, d]) => (
          <ZmanRow key={label} label={label} time={d} colors={colors} />
        ))}

        {/* Candle lighting — shown on Fridays only (candleLighting is null on
            other days). Highlighted with candleBg / candle text, matching
            ZmanimFullList. Card auto-computes `isLast` correctly even though
            this row is conditionally rendered. */}
        {zmanim.candleLighting && (
          <View
            style={[
              styles.row,
              { backgroundColor: colors.candleBg },
            ]}
          >
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
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 12 },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 12,
  },
  label: { ...withFontFamily(typography.bodyMedium), flex: 1, textAlign: 'right' },
  time:  { ...withFontFamily(typography.bodyLarge), fontWeight: '700' },
  candleValueBlock: { alignItems: 'flex-start' },
  offsetHint: { ...withFontFamily(typography.micro), marginTop: 1, textAlign: 'right' },
});
