// app/(tabs)/zmanim.tsx
// Phase 3.6 — Full Zmanim screen per docs/SCREENS.md.
// Phase 4.5 — Location chip now shows real city name + GPS indicator.

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { PinIcon, GpsIcon } from '../../src/components/icons/FigmaIcons';
import { weekdayNameHe, hebrewDayMonth } from '../../src/utils/hebrewLabels';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import type { ThemeColors } from '../../src/hooks/useThemeColors';
import { useZmanim } from '../../src/hooks/useZmanim';
import { useSettingsStore } from '../../src/providers/SettingsProvider';
import { useLocationStore } from '../../src/providers/LocationProvider';
import type { LocationSource } from '../../src/providers/LocationProvider';
import { ZmanimFullList } from '../../src/components/zmanim/ZmanimFullList';
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
  { value: 'GRA', label: 'הגר״א' },
  { value: 'MGA', label: 'מגן אברהם' },
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

  // Day data for header
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
        <ScreenHeader
          title="זמני היום"
          subtitle={`${weekdayNameHe(selectedDate)} · ${hebrewDayMonth(selectedDate)}`}
          subtitleAbove
          onTitlePress={openPicker}
          titleAccessibilityLabel="זמני היום, בחר תאריך"
          onJumpToToday={() => setSelectedDate(new Date())}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
            <PinIcon size={24} color={colors.accent} />
            <View style={styles.locationTextBlock}>
              <Text style={[styles.locationName, { color: colors.textPrimary }]}>
                {currentCityName}
              </Text>
              <View style={[styles.sourceBadge, { backgroundColor: badge.bg }]}>
                {/* Figma: the GPS glyph sits to the RIGHT of the text —
                    JSX order: glyph first (right) → text (left). */}
                {badge.showIcon && <GpsIcon size={12} color={badge.fg} />}
                <Text style={[styles.sourceBadgeText, { color: badge.fg }]}>{badge.label}</Text>
              </View>
            </View>
            <Text style={[styles.chevron, { color: colors.textTertiary }]}>‹</Text>
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
                  hitSlop={{ top: 8, bottom: 8 }}
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
                    { color: active ? colors.textPrimary : colors.textTertiary },
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
  // Figma: content padding 14 / 16, items 14 apart.
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 },

  locationCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 14,
    minHeight: 48,
  },
  locationTextBlock: { flex: 1, gap: 4 },
  locationName: { ...withFontFamily(typography.cardTitle), textAlign: 'right' },
  chevron: { ...withFontFamily(typography.glyph), width: 20, textAlign: 'center' },
  sourceBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  sourceBadgeText: { ...withFontFamily(typography.micro, '700') },

  // Figma: segments 33 tall (padding 7); hitSlop keeps 48 dp targets.
  shitaTrack: {
    flexDirection: 'row-reverse',
    borderRadius: radius.full,
    padding: 3,
    marginBottom: 14,
  },
  shitaSegment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  shitaSegmentActive: {
    ...elevation.sm,
  },
  shitaSegmentText: { ...withFontFamily(typography.bodySmall, '500') },
  shitaSegmentTextActive: { ...withFontFamily(typography.bodySmall, '700') },
});
