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
import { Card } from '../ui/Card';
import { SectionLabel } from '../ui/SectionLabel';
import { radius } from '../../constants/radius';
import { typography, withFontFamily } from '../../constants/typography';

interface Props {
  zmanim: ZmanimResult;
  preferredMethod: ZmanimMethod;  // user's current selected shita
}

export function ZmanimFullList({ zmanim, preferredMethod }: Props) {
  const colors = useThemeColors();
  const use24h = useSettingsStore((s) => s.use24hTime);

  // Helper: render a single zmanim row. `isLast` is auto-injected by the
  // enclosing <Card> (via React.Children.toArray) so the bottom hairline is
  // suppressed correctly on the last visible row of a section.
  const Row = ({ label, time, highlighted = false, isLast = false }: {
    label: string;
    time: Date | null;
    highlighted?: boolean;
    isLast?: boolean;
  }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
        highlighted && { backgroundColor: colors.candleBg },
      ]}
    >
      {/* row-reverse, JSX order: label (flex:1, right) → time (left) */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.time, { color: highlighted ? colors.candle : colors.textPrimary }]}>
        {formatZmanTime(time, use24h)}
      </Text>
    </View>
  );

  // Helper: render a shita-dependent row with both GRA and MGA side-by-side.
  // Highlights the preferred method, dims the other.
  const ShitaRow = ({ label, gra, mga, isLast = false }: {
    label: string;
    gra: Date | null;
    mga: Date | null;
    isLast?: boolean;
  }) => {
    const graFocus = preferredMethod === 'GRA';
    return (
      <View
        style={[
          styles.row,
          { backgroundColor: colors.surface },
          !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
        ]}
      >
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
        <View style={[styles.candleBanner, { backgroundColor: colors.candleBg, borderColor: colors.candle }]}>
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
      <SectionLabel title="זמני בוקר" colors={colors} />
      <Card colors={colors}>
        <Row label="עלות השחר"  time={zmanim.alotHashachar} />
        <Row label="משיכיר"     time={zmanim.misheyakir} />
        <Row label="נץ החמה"    time={zmanim.netz} />
      </Card>

      {/* Shita-dependent — both schools side-by-side */}
      <SectionLabel title="סוף זמני קריאת שמע ותפילה" colors={colors} />
      <Card colors={colors}>
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
      </Card>

      {/* Midday + mincha */}
      <SectionLabel title="זמני יום" colors={colors} />
      <Card colors={colors}>
        <Row label="חצות"          time={zmanim.chatzot} />
        <Row label="מנחה גדולה"    time={zmanim.minchaGedola} />
        <Row label="מנחה קטנה"     time={zmanim.minchaKetana} />
        <Row label="פלג המנחה"     time={zmanim.plagHamincha} />
      </Card>

      {/* Evening */}
      <SectionLabel title="זמני ערב" colors={colors} />
      <Card colors={colors}>
        <Row label="שקיעה"          time={zmanim.shkia} />
        <Row label="צאת הכוכבים"   time={zmanim.tzeitHakochavim} />
        <Row label='צאת רבינו תם'  time={zmanim.tzeitRabbeinu} />
      </Card>

      {/* Saturday-only: havdalah prominent at bottom if present */}
      {zmanim.havdalah && (
        <View style={[styles.havdalahBanner, { backgroundColor: colors.candleBg, borderColor: colors.candle }]}>
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

  // row-reverse, JSX order: label (flex:1, right) → time (left). Bottom
  // hairline is applied conditionally per-row (suppressed on the last row of
  // each Card via the `isLast` prop Card auto-injects); explicit gap keeps
  // label/time from ever touching.
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 12,  // guarantees breathing room between label and time value
  },
  label: { ...withFontFamily(typography.bodyMedium), flex: 1, textAlign: 'right' },
  time:  { ...withFontFamily(typography.bodyLarge, '700') },
  dimmed: { opacity: 0.5 },

  shitaTimes: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  shitaTime:  { alignItems: 'flex-end' },
  shitaLabel: { ...withFontFamily(typography.micro), marginTop: 2 },

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
  candleLabel: { ...withFontFamily(typography.cellPrimary), flex: 1 },
  candleTime:  { ...withFontFamily(typography.cardTitle) },

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
    ...withFontFamily(typography.micro),
    marginTop: 2,
    textAlign: 'right',
  },
});
