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
import {
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react-native';
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
      <ScreenHeader title="בחר מיקום" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* GPS button — label first/right, glyph last/left */}
        <Pressable
          onPress={handleUseGps}
          disabled={gpsState.phase === 'acquiring'}
          style={[
            styles.gpsButton,
            { backgroundColor: colors.accent },
            gpsState.phase === 'acquiring' && styles.gpsButtonDisabled,
          ]}
          accessibilityLabel="השתמש במיקום הנוכחי"
          accessibilityRole="button"
          accessibilityState={{ disabled: gpsState.phase === 'acquiring' }}
        >
          <Text style={[styles.gpsButtonText, { color: colors.textInverse }]}>
            השתמש במיקום הנוכחי
          </Text>
          <Navigation size={18} color={colors.textInverse} />
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
          <Search size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="חפש עיר..."
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
            <SectionLabel title="ישראל" colors={colors} />
            <Card colors={colors}>
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
            <SectionLabel title="חוץ לארץ" colors={colors} />
            <Card colors={colors}>
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
        iconNode={<ActivityIndicator color={colors.accent} />}
        headline="מאתר מיקום…"
        detail="ממתין לקליטת GPS"
        bg={colors.surface}
        fg={colors.textPrimary}
        detailColor={colors.textSecondary}
        border={colors.border}
      />
    );
  }

  const { result } = state;

  if (result.ok) {
    return (
      <StripRow
        iconNode={<CheckCircle2 size={20} color={colors.success} />}
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
          iconNode={<AlertTriangle size={20} color={colors.warning} />}
          headline="שירותי המיקום כבויים"
          detail="הפעל מיקום בהגדרות המכשיר"
          bg={colors.warningBg}
          fg={colors.warning}
        />
      );
    case 'permissionBlocked':
      return (
        <StripRow
          iconNode={<XCircle size={20} color={colors.error} />}
          headline="ההרשאה נחסמה"
          detail="יש לאשר גישה למיקום בהגדרות המערכת"
          bg={colors.errorBg}
          fg={colors.error}
        />
      );
    case 'permissionDenied':
      return (
        <StripRow
          iconNode={<XCircle size={20} color={colors.error} />}
          headline="לא ניתנה הרשאת מיקום"
          detail="נסה שוב ואשר את הבקשה"
          bg={colors.errorBg}
          fg={colors.error}
        />
      );
    case 'timeout':
      return (
        <StripRow
          iconNode={<XCircle size={20} color={colors.error} />}
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
          iconNode={<XCircle size={20} color={colors.error} />}
          headline="אירעה שגיאה באיתור המיקום"
          detail="נסה שוב או בחר עיר מהרשימה"
          bg={colors.errorBg}
          fg={colors.error}
        />
      );
  }
}

/** Rounded status row: icon/glyph at the LEFT, two-line text block at the
 *  RIGHT (both lines right-aligned) — JSX order [textBlock, iconNode]
 *  inside a `row-reverse` container puts the text block first (→ right)
 *  and the icon last (→ left). */
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
      <View style={stripStyles.textBlock}>
        <Text style={[stripStyles.headline, { color: fg }]} numberOfLines={2}>
          {headline}
        </Text>
        <Text style={[stripStyles.detail, { color: detailColor ?? fg }]} numberOfLines={2}>
          {detail}
        </Text>
      </View>
      <View style={stripStyles.iconSlot}>{iconNode}</View>
    </View>
  );
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
        { backgroundColor: colors.surface },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={city.nameHe}
      accessibilityState={{ selected: isSelected }}
    >
      <MapPin
        size={16}
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
  scrollContent: { padding: 16, paddingBottom: 40 },

  gpsButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.lg,
    marginBottom: 12,
    minHeight: 50,
  },
  gpsButtonDisabled: { opacity: 0.6 },
  // Figma: primary GPS button = 15 Bold.
  gpsButtonText: { ...withFontFamily(typography.bodyMedium, '700') },

  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  // Figma: search placeholder / input text = 14 Regular.
  searchInput: {
    flex: 1,
    ...withFontFamily(typography.label),
    paddingVertical: 8,
  },

  cityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 50,
  },
  cityName: {
    flex: 1,
    ...withFontFamily(typography.bodyMedium),
    textAlign: 'right',
  },
  cityNameSelected: {
    ...withFontFamily(typography.bodyMedium, '600'),
  },
  // No exact type-scale step matches the previous hand-picked 18 — nearest
  // is cardTitle (17), and its baked-in fontWeight (700) already matches.
  checkmark: {
    ...withFontFamily(typography.cardTitle),
  },

  emptyState: {
    ...withFontFamily(typography.bodySmall),
    textAlign: 'center',
    marginTop: 32,
    fontStyle: 'italic',
  },
});

const stripStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    minHeight: 50,
  },
  textBlock: { flex: 1 },
  iconSlot: { width: 24, alignItems: 'center' },
  // Figma: GPS status headline = 13 Bold; detail line = 10 Regular.
  headline: { ...withFontFamily(typography.bodySmall, '700'), textAlign: 'right' },
  detail:   { ...withFontFamily(typography.micro, '400'), marginTop: 2, textAlign: 'right' },
});
