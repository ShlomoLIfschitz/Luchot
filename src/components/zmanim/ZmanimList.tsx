import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ZmanimResult } from '../../services/ZmanimService';
import { formatZmanTime } from '../../services/ZmanimService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../providers/SettingsProvider';

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
      <Text style={[styles.title, { color: colors.textTertiary }]}>זמנים</Text>
      {rows.map(([label, d]) => (
        <View key={label} style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>{label}</Text>
          <Text style={{ color: colors.textPrimary }}>{formatZmanTime(d, use24h)}</Text>
        </View>
      ))}

      {/* Candle lighting — shown on Fridays only (candleLighting is null on other days) */}
      {zmanim.candleLighting && (
        <View style={styles.row}>
          <Text style={{ color: colors.textSecondary }}>הדלקת נרות</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.textPrimary }}>
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
  container:  { marginVertical: 12 },
  title:      { fontSize: 11, fontWeight: '600', marginBottom: 8 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginVertical: 4, gap: 12 },
  offsetHint: { fontSize: 11, marginTop: 1, textAlign: 'right' },
});
