// app/locationPicker.tsx
// Phase 4.5 — Location picker screen. Lists curated cities grouped
// by country (Israel / International). User can also press a GPS
// button to use device location.
//
// Selecting a city or confirming GPS updates LocationProvider and
// pops back to the previous screen.
//
// Redesign (Wave — GPS status UI): acquireFromDeviceGps() now returns a
// typed, never-throwing GpsResult. Replaced the old Alert-only feedback
// with an inline status strip reflecting the exact acquisition state
// (acquiring / ok / each failure reason) — this is what the user actually
// asked for ("עם חיווי").

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GpsIcon, PinIcon, SearchIcon } from '../src/components/icons/FigmaIcons';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useLocationStore, type GpsResult } from '../src/providers/LocationProvider';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { Card } from '../src/components/ui/Card';
import { SectionLabel } from '../src/components/ui/SectionLabel';
import { CITIES, type CityEntry } from '../src/constants/cities';
import { radius } from '../src/constants/radius';
import { typography, withFontFamily } from '../src/constants/typography';
import type { ThemeColors } from '../src/hooks/useThemeColors';

// ─── GPS acquisition UI state ──────────────────────────────────────────────────
// Nothing renders until the first attempt (`idle`).

type GpsUiState =
  | { phase: 'idle' }
  | { phase: 'acquiring' }
  | { phase: 'done'; result: GpsResult };

export default function LocationPickerScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const currentKey       = useLocationStore((s) => s.cityHebcalKey);
  const setFromCity      = useLocationStore((s) => s.setLocationFromCity);

  const [query, setQuery]     = useState('');
  const [gpsState, setGpsState] = useState<GpsUiState>({ phase: 'idle' });

  // Guards against setState-after-unmount if the screen pops (e.g. via
  // hardware back) while acquireFromDeviceGps() is still in flight.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Filter city list by Hebrew name or English key
  const filteredCities = useMemo(() => {
    const q = query.trim();
    if (!q) return CITIES;
    const lower = q.toLowerCase();
    return CITIES.filter(
      (c) =>
        c.nameHe.includes(q) ||
        c.hebcalKey.toLowerCase().includes(lower),
    );
  }, [query]);

  const israeli       = filteredCities.filter((c) => c.country === 'IL');
  const international = filteredCities.filter((c) => c.country === 'INTL');

  const handleUseGps = async () => {
    setGpsState({ phase: 'acquiring' });
    const result = await useLocationStore.getState().acquireFromDeviceGps();
    if (!mountedRef.current) return;
    setGpsState({ phase: 'done', result });
    if (result.ok) {
      router.back();
    }
  };

  const handlePickCity = (hebcalKey: string) => {
    const ok = setFromCity(hebcalKey);
    if (ok) {
      router.back();
    } else {
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את העיר הזו. נסה אחרת.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader leading="back" title="בחירת מיקום" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* GPS button — Figma: glyph first/right, label to its left */}
        <Pressable
          onPress={handleUseGps}
          disabled={gpsState.phase === 'acquiring'}
          style={[
            styles.gpsButton,
            { backgroundColor: colors.accent },
            gpsState.phase === 'acquiring' && styles.gpsButtonDisabled,
          ]}
          accessibilityLabel="השתמש במיקום המכשיר"
          accessibilityRole="button"
          accessibilityState={{ disabled: gpsState.phase === 'acquiring' }}
        >
          <GpsIcon size={19} color={colors.textInverse} />
          <Text style={[styles.gpsButtonText, { color: colors.textInverse }]}>
            השתמש במיקום המכשיר
          </Text>
        </Pressable>

        {/* Inline GPS status strip — nothing on first render */}
        <GpsStatusStrip state={gpsState} colors={colors} />

        {/* Search box */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <SearchIcon size={17} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="חפש עיר…"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            textAlign="right"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Israeli cities */}
        {israeli.length > 0 && (
          <>
            <SectionLabel title="ישראל" colors={colors} inset={0} gapAbove={0} gapBelow={12} />
            <Card colors={colors} inset={0} radius={radius.lg}>
              {israeli.map((city) => (
                <CityRow
                  key={city.hebcalKey}
                  city={city}
                  isSelected={city.hebcalKey === currentKey}
                  colors={colors}
                  onPress={() => handlePickCity(city.hebcalKey)}
                />
              ))}
            </Card>
          </>
        )}

        {/* International cities */}
        {international.length > 0 && (
          <>
            <SectionLabel title="חוץ לארץ" colors={colors} inset={0} gapAbove={12} gapBelow={12} />
            <Card colors={colors} inset={0} radius={radius.lg}>
              {international.map((city) => (
                <CityRow
                  key={city.hebcalKey}
                  city={city}
                  isSelected={city.hebcalKey === currentKey}
                  colors={colors}
                  onPress={() => handlePickCity(city.hebcalKey)}
                />
              ))}
            </Card>
          </>
        )}

        {filteredCities.length === 0 && (
          <Text style={[styles.emptyState, { color: colors.textTertiary }]}>
            {`לא נמצאו תוצאות עבור "${query}"`}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

// ─── GpsStatusStrip ─────────────────────────────────────────────────────────────

function GpsStatusStrip({ state, colors }: { state: GpsUiState; colors: ThemeColors }) {
  if (state.phase === 'idle') return null;

  if (state.phase === 'acquiring') {
    return (
      <StripRow
        iconNode={<ActivityIndicator size="small" color={colors.textSecondary} />}
        headline="מאתר מיקום…"
        detail="ממתין לקליטת GPS (עד 12 שניות)"
        bg={colors.surface}
        fg={colors.textSecondary}
        border={colors.border}
      />
    );
  }

  const { result } = state;

  if (result.ok) {
    return (
      <StripRow
        iconNode={<StatusGlyph glyph="✓" color={colors.success} />}
        headline={result.placeName ?? 'המיקום זוהה בהצלחה'}
        detail="המיקום זוהה בהצלחה"
        bg={colors.successBg}
        fg={colors.success}
      />
    );
  }

  switch (result.reason) {
    case 'servicesDisabled':
      return (
        <StripRow
          iconNode={<StatusGlyph glyph="!" color={colors.warning} />}
          headline="שירותי המיקום כבויים"
          detail="הפעל מיקום בהגדרות המכשיר"
          bg={colors.warningBg}
          fg={colors.warning}
        />
      );
    case 'permissionBlocked':
      return (
        <StripRow
          iconNode={<StatusGlyph glyph="✕" color={colors.error} />}
          headline="ההרשאה נחסמה"
          detail="יש לאשר גישה למיקום בהגדרות המערכת"
          bg={colors.errorBg}
          fg={colors.error}
        />
      );
    case 'permissionDenied':
      return (
        <StripRow
          iconNode={<StatusGlyph glyph="✕" color={colors.error} />}
          headline="לא ניתנה הרשאת מיקום"
          detail="נסה שוב ואשר את הבקשה"
          bg={colors.errorBg}
          fg={colors.error}
        />
      );
    case 'timeout':
      return (
        <StripRow
          iconNode={<StatusGlyph glyph="✕" color={colors.error} />}
          headline="לא הצלחנו לאתר מיקום"
          detail="נסה שוב או בחר עיר מהרשימה"
          bg={colors.errorBg}
          fg={colors.error}
        />
      );
    case 'error':
    default:
      return (
        <StripRow
          iconNode={<StatusGlyph glyph="✕" color={colors.error} />}
          headline="אירעה שגיאה באיתור המיקום"
          detail="נסה שוב או בחר עיר מהרשימה"
          bg={colors.errorBg}
          fg={colors.error}
        />
      );
  }
}

/** Rounded status row (Figma): glyph at the far RIGHT, two-line text block
 *  to its left (both lines right-aligned) — JSX order [iconNode, textBlock]
 *  inside a `row-reverse` container. Detail line at 80 % opacity. */
function StripRow({
  iconNode, headline, detail, bg, fg, detailColor, border,
}: {
  iconNode: React.ReactNode;
  headline: string;
  detail: string;
  bg: string;
  fg: string;
  detailColor?: string;
  border?: string;
}) {
  return (
    <View
      style={[
        stripStyles.strip,
        { backgroundColor: bg },
        border ? { borderWidth: StyleSheet.hairlineWidth, borderColor: border } : null,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${headline}. ${detail}`}
    >
      <View style={stripStyles.iconSlot}>{iconNode}</View>
      <View style={stripStyles.textBlock}>
        <Text style={[stripStyles.headline, { color: fg }]} numberOfLines={2}>
          {headline}
        </Text>
        <Text style={[stripStyles.detail, { color: detailColor ?? fg }]} numberOfLines={2}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

/** Figma draws the GPS state glyphs as 19 px text (✓ ! ✕). */
function StatusGlyph({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={[stripStyles.glyph, { color }]}>{glyph}</Text>;
}

// ─── CityRow ───────────────────────────────────────────────────────────────────

function CityRow({
  city,
  isSelected,
  isLast = false,
  colors,
  onPress,
}: {
  city: CityEntry;
  isSelected: boolean;
  isLast?: boolean;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      style={[
        styles.cityRow,
        { backgroundColor: isSelected ? colors.accentLight : colors.surface },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={city.nameHe}
      accessibilityState={{ selected: isSelected }}
    >
      <PinIcon
        size={18}
        color={isSelected ? colors.accent : colors.textTertiary}
      />
      <Text
        style={[
          styles.cityName,
          { color: isSelected ? colors.accent : colors.textPrimary },
          isSelected && styles.cityNameSelected,
        ]}
      >
        {city.nameHe}
      </Text>
      {isSelected && (
        <Text style={[styles.checkmark, { color: colors.accent }]}>✓</Text>
      )}
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1 },
  // Figma: content padding 14 / 16, items 12 apart.
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

  gpsButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 15,
    borderRadius: radius.lg,
    marginBottom: 12,
    minHeight: 52,
  },
  gpsButtonDisabled: { opacity: 0.6 },
  gpsButtonText: { ...withFontFamily(typography.bodyMedium, '700') },

  // Figma: r10, padding 11 / 12, gap 8, 14 Regular text.
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.item,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    ...withFontFamily(typography.label),
    paddingVertical: 11,
  },

  // Figma: padding 13 / 14, gap 11, 48 tall.
  cityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 11,
    minHeight: 48,
  },
  cityName: {
    flex: 1,
    ...withFontFamily(typography.bodyMedium),
    textAlign: 'right',
  },
  cityNameSelected: {
    ...withFontFamily(typography.bodyMedium, '700'),
  },
  checkmark: {
    ...withFontFamily(typography.glyphSmall),
    width: 18,
    textAlign: 'center',
  },

  emptyState: {
    ...withFontFamily(typography.bodySmall),
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
});

// Figma GPS state rows: padding 10 / 12, gap 10, headline 13 Bold,
// detail 10 Regular at 80 %, 20 px glyph slot.
const stripStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  textBlock: { flex: 1, gap: 1 },
  iconSlot: { width: 20, alignItems: 'center' },
  headline: { ...withFontFamily(typography.bodySmall, '700'), textAlign: 'right' },
  detail:   { ...withFontFamily(typography.micro, '400'), opacity: 0.8, textAlign: 'right' },
  glyph:    { ...withFontFamily(typography.screenTitle, '400'), textAlign: 'center' },
});
