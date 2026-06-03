// src/components/zmanim/ZmanimFullList.tsx
// Phase 3.6 — Full zmanim list component for the Zmanim screen.
// Shows all 14 standard zmanim plus candleLighting/havdalah,
// with side-by-side GRA + MGA display for shita-dependent times.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import type { ZmanimResult, ZmanimMethod } from '../../services/ZmanimService';
import { formatZmanTime } from '../../services/ZmanimService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { radius } from '../../constants/radius';

interface Props {
  zmanim: ZmanimResult;
  preferredMethod: ZmanimMethod;  // user's current selected shita
}

export function ZmanimFullList({ zmanim, preferredMethod }: Props) {
  const colors = useThemeColors();
  const use24h = useSettingsStore((s) => s.use24hTime);

  // Helper: render a single zmanim row
  const Row = ({ label, time, highlighted = false }: {
    label: string;
    time: Date | null;
    highlighted?: boolean;
  }) => (
    <View style={[styles.row, highlighted && { backgroundColor: colors.candle + '15' }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.time, { color: colors.textPrimary }]}>
        {formatZmanTime(time, use24h)}
      </Text>
    </View>
  );

  // Helper: render a shita-dependent row with both GRA and MGA side-by-side.
  // Highlights the preferred method, dims the other.
  const ShitaRow = ({ label, gra, mga }: {
    label: string;
    gra: Date | null;
    mga: Date | null;
  }) => {
    const graFocus = preferredMethod === 'GRA';
    return (
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <View style={styles.shitaTimes}>
          <View style={styles.shitaTime}>
            <Text style={[
              styles.time,
              { color: graFocus ? colors.textPrimary : colors.textTertiary },
              !graFocus && styles.dimmed,
            ]}>
              {formatZmanTime(gra, use24h)}
            </Text>
            <Text style={[styles.shitaLabel, { color: colors.textTertiary }]}>גר״א</Text>
          </View>
          <View style={styles.shitaTime}>
            <Text style={[
              styles.time,
              { color: !graFocus ? colors.textPrimary : colors.textTertiary },
              graFocus && styles.dimmed,
            ]}>
              {formatZmanTime(mga, use24h)}
            </Text>
            <Text style={[styles.shitaLabel, { color: colors.textTertiary }]}>מג״א</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Friday-only: candle lighting prominent at top if present */}
      {zmanim.candleLighting && (
        <View style={[styles.candleBanner, { backgroundColor: colors.candle + '20', borderColor: colors.candle }]}>
          <Flame size={20} color={colors.candle} />
          <Text style={[styles.candleLabel, { color: colors.textPrimary }]}>הדלקת נרות</Text>
          {/* Wrap time + optional offset hint in a column so the hint sits
              directly below the time without disturbing the banner layout. */}
          <View style={{ alignItems: 'flex-start' }}>
            <Text style={[styles.candleTime, { color: colors.candle }]}>
              {formatZmanTime(zmanim.candleLighting, use24h)}
            </Text>
            {!!zmanim.candleLightingOffsetMinutes &&
             zmanim.candleLightingOffsetMinutes !== 18 && (
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

      {/* Morning zmanim */}
      <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>זמני בוקר</Text>
      <Row label="עלות השחר"  time={zmanim.alotHashachar} />
      <Row label="משיכיר"     time={zmanim.misheyakir} />
      <Row label="נץ החמה"    time={zmanim.netz} />

      {/* Shita-dependent — both schools side-by-side */}
      <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>
        סוף זמני קריאת שמע ותפילה
      </Text>
      <ShitaRow
        label='סוף זמן ק״ש'
        gra={zmanim.sofZmanShmaGRA}
        mga={zmanim.sofZmanShmaMGA}
      />
      <ShitaRow
        label="סוף זמן תפילה"
        gra={zmanim.sofZmanTfillaGRA}
        mga={zmanim.sofZmanTfillaMGA}
      />

      {/* Midday + mincha */}
      <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>זמני יום</Text>
      <Row label="חצות"          time={zmanim.chatzot} />
      <Row label="מנחה גדולה"    time={zmanim.minchaGedola} />
      <Row label="מנחה קטנה"     time={zmanim.minchaKetana} />
      <Row label="פלג המנחה"     time={zmanim.plagHamincha} />

      {/* Evening */}
      <Text style={[styles.sectionHeader, { color: colors.textTertiary }]}>זמני ערב</Text>
      <Row label="שקיעה"          time={zmanim.shkia} />
      <Row label="צאת הכוכבים"   time={zmanim.tzeitHakochavim} />
      <Row label='צאת רבינו תם'  time={zmanim.tzeitRabbeinu} />

      {/* Saturday-only: havdalah prominent at bottom if present */}
      {zmanim.havdalah && (
        <View style={[styles.havdalahBanner, { backgroundColor: colors.candle + '20', borderColor: colors.candle }]}>
          <Text style={[styles.candleLabel, { color: colors.textPrimary }]}>הבדלה</Text>
          <Text style={[styles.candleTime, { color: colors.candle }]}>
            {formatZmanTime(zmanim.havdalah, use24h)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'right',
  },

  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginVertical: 1,
    gap: 12,  // guarantees breathing room between label and time value
  },
  label: { fontSize: 15, fontWeight: '500', flex: 1, textAlign: 'right' },
  time:  { fontSize: 15, fontWeight: '600' },
  dimmed: { opacity: 0.5 },

  shitaTimes: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  shitaTime:  { alignItems: 'flex-end' },
  shitaLabel: { fontSize: 10, marginTop: 2 },

  candleBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 16,
  },
  candleLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  candleTime:  { fontSize: 18, fontWeight: '700' },

  havdalahBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 16,
  },

  // Phase 4.3 — shown below candle lighting time when offset is non-default
  offsetHint: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
});
