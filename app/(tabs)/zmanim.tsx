// app/(tabs)/zmanim.tsx
// Phase 3.6 — Full Zmanim screen per docs/SCREENS.md.
// Phase 4.5 — Location chip now shows real city name + GPS indicator.

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { MapPin, ChevronLeft, Navigation } from 'lucide-react-native';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import type { ThemeColors } from '../../src/hooks/useThemeColors';
import { useZmanim } from '../../src/hooks/useZmanim';
import { useSettingsStore } from '../../src/providers/SettingsProvider';
import { useLocationStore } from '../../src/providers/LocationProvider';
import type { LocationSource } from '../../src/providers/LocationProvider';
import { ZmanimFullList } from '../../src/components/zmanim/ZmanimFullList';
import { dateService, toHebrewNumeral, toHebrewYear } from '../../src/services/DateService';
import type { ZmanimMethod } from '../../src/services/ZmanimService';
import { radius } from '../../src/constants/radius';
import { typography, withFontFamily } from '../../src/constants/typography';
import { elevation } from '../../src/constants/elevation';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';
import { useDatePicker } from '../../src/hooks/useDatePicker';
import { swipeDirection } from '../../src/constants/layout';
import { findCityByKey } from '../../src/constants/cities';
import { findNearestCity } from '../../src/utils/locationLookup';

/** Source badge visual config — labels + tokens per docs/DESIGN.md. */
function sourceBadge(source: LocationSource, colors: ThemeColors) {
  switch (source) {
    case 'gps':
      return { label: 'מיקום המכשיר', bg: colors.successBg, fg: colors.success, showIcon: true };
    case 'manual':
      return { label: 'נבחר ידנית', bg: colors.accentLight, fg: colors.accent, showIcon: false };
    default:
      return { label: 'ברירת מחדל', bg: colors.surfaceMuted, fg: colors.textTertiary, showIcon: false };
  }
}

const SHITA_OPTIONS: { value: ZmanimMethod; label: string }[] = [
  { value: 'GRA', label: 'גר״א' },
  { value: 'MGA', label: 'מג״א' },
];

export default function ZmanimScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);

  const zmanim = useZmanim(selectedDate);

  // Location card data
  const { cityHebcalKey, latitude, longitude, source, placeName } = useLocationStore();
  const currentCityName = useMemo(() => {
    if (placeName) return placeName;
    if (cityHebcalKey) {
      const entry = findCityByKey(cityHebcalKey);
      if (entry) return entry.nameHe;
    }
    const { city } = findNearestCity(latitude, longitude);
    return city.nameHe;
  }, [placeName, cityHebcalKey, latitude, longitude]);
  const badge = useMemo(() => sourceBadge(source, colors), [source, colors]);

  // Date picker — Phase 4.4
  const { openPicker, picker } = useDatePicker(selectedDate, setSelectedDate);

  const zmanimMethod = useSettingsStore((s) => s.zmanimMethod);
  const setZmanimMethod = useSettingsStore((s) => s.setZmanimMethod);
  const hebrewOnTop = useSettingsStore((s) => s.hebrewOnTop);

  // Day data for header
  const dayData = useMemo(
    () => dateService.getDayData(selectedDate),
    [selectedDate],
  );

  const hebrewFormatted = `${toHebrewNumeral(dayData.hebrewDate.day)} ${dayData.hebrewDate.monthName} ${toHebrewYear(dayData.hebrewDate.year)}`;
  const gregFormatted = selectedDate.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Day navigation — swipe left/right (consistent with Day screen)
  const navigateDay = useCallback(
    (direction: 1 | -1) => {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + direction);
      setSelectedDate(next);
    },
    [selectedDate, setSelectedDate],
  );

  const onSwipe = useCallback((vx: number) => navigateDay(swipeDirection(vx)), [navigateDay]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 400) runOnJS(onSwipe)(e.velocityX);
    });

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader date={selectedDate} onDatePress={openPicker} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — date */}
          <View style={styles.header}>
            <Text style={[styles.hebrewDate, { color: colors.textPrimary }]}>
              {hebrewOnTop ? hebrewFormatted : gregFormatted}
            </Text>
            <Text style={[styles.gregDate, { color: colors.textSecondary }]}>
              {hebrewOnTop ? gregFormatted : hebrewFormatted}
            </Text>
          </View>

          {/* Location card — tappable; opens picker. Shows a source badge
              (gps / manual / default) so users always know where the shown
              zmanim are computed for. */}
          <Pressable
            onPress={() => router.push('/locationPicker' as any)}
            style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`מיקום נוכחי: ${currentCityName}, לחיצה לשינוי מיקום`}
          >
            {/* row-reverse, JSX order: pin (right) → text block (flex:1) → chevron (left) */}
            <MapPin size={20} color={colors.accent} />
            <View style={styles.locationTextBlock}>
              <Text style={[styles.locationName, { color: colors.textPrimary }]}>
                {currentCityName}
              </Text>
              <View style={[styles.sourceBadge, { backgroundColor: badge.bg }]}>
                {/* JSX order: text first (right) → glyph last (left) */}
                <Text style={[styles.sourceBadgeText, { color: badge.fg }]}>{badge.label}</Text>
                {badge.showIcon && <Navigation size={10} color={badge.fg} />}
              </View>
            </View>
            <ChevronLeft size={18} color={colors.textTertiary} />
          </Pressable>

          {/* Shita segmented control — selecting persists via SettingsProvider.
              Track = surfaceMuted pill; active segment = surface pill w/ elevation. */}
          <View style={[styles.shitaTrack, { backgroundColor: colors.surfaceMuted }]}>
            {SHITA_OPTIONS.map(({ value, label }) => {
              const active = zmanimMethod === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setZmanimMethod(value)}
                  style={[
                    styles.shitaSegment,
                    active && [styles.shitaSegmentActive, { backgroundColor: colors.surface }],
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[
                    styles.shitaSegmentText,
                    { color: active ? colors.textPrimary : colors.textSecondary },
                    active && styles.shitaSegmentTextActive,
                  ]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Full zmanim list — all 14 times + candle/havdalah banners */}
          <ZmanimFullList zmanim={zmanim} preferredMethod={zmanimMethod} />
        </ScrollView>

        {/* Date picker — Phase 4.4; rendered outside ScrollView */}
        {picker}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

  // Header
  header: { alignItems: 'center', marginBottom: 16 },
  hebrewDate: { ...withFontFamily(typography.displayMedium), letterSpacing: -0.5, textAlign: 'center' },
  gregDate:   { ...withFontFamily(typography.bodyMedium), marginTop: 4, textAlign: 'center' },

  // Location card — row-reverse: pin (right) → text block (flex:1) → chevron (left)
  locationCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    minHeight: 48,
  },
  locationTextBlock: { flex: 1, gap: 4 },
  locationName: { ...withFontFamily(typography.cardTitle), textAlign: 'right' },
  // Source badge pill — right-aligned under the location name (column parent,
  // so alignSelf controls horizontal position).
  sourceBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  sourceBadgeText: { ...withFontFamily(typography.micro, '700') },

  // Shita selector — surfaceMuted track, surface pill for the active segment.
  shitaTrack: {
    flexDirection: 'row-reverse',
    borderRadius: radius.full,
    padding: 3,
    marginBottom: 16,
  },
  shitaSegment: {
    flex: 1,
    paddingVertical: 13, // combined with typography.bodyMedium lineHeight → ≥48dp touch target
    borderRadius: radius.full,
    alignItems: 'center',
  },
  shitaSegmentActive: {
    ...elevation.sm,
  },
  shitaSegmentText: { ...withFontFamily(typography.bodyMedium) },
  shitaSegmentTextActive: { ...withFontFamily(typography.bodyMedium, '700') },
});
