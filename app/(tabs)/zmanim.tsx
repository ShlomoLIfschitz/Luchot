// app/(tabs)/zmanim.tsx
// Phase 3.6 — Full Zmanim screen per docs/SCREENS.md.
// Phase 4.5 — Location chip now shows real city name + GPS indicator.

import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { MapPin, Navigation } from 'lucide-react-native';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useZmanim } from '../../src/hooks/useZmanim';
import { useSettingsStore } from '../../src/providers/SettingsProvider';
import { useLocationStore } from '../../src/providers/LocationProvider';
import { ZmanimFullList } from '../../src/components/zmanim/ZmanimFullList';
import { dateService, toHebrewNumeral, toHebrewYear } from '../../src/services/DateService';
import type { ZmanimMethod } from '../../src/services/ZmanimService';
import { radius } from '../../src/constants/radius';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';
import { useDatePicker } from '../../src/hooks/useDatePicker';
import { findCityByKey } from '../../src/constants/cities';
import { findNearestCity } from '../../src/utils/locationLookup';

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

  // Location chip data
  const { cityHebcalKey, latitude, longitude, source } = useLocationStore();
  const currentCityName = useMemo(() => {
    if (cityHebcalKey) {
      const entry = findCityByKey(cityHebcalKey);
      if (entry) return entry.nameHe;
    }
    const { city } = findNearestCity(latitude, longitude);
    return city.nameHe;
  }, [cityHebcalKey, latitude, longitude]);

  // Date picker — Phase 4.4
  const { openPicker, picker } = useDatePicker(selectedDate, setSelectedDate);

  const zmanimMethod = useSettingsStore((s) => s.zmanimMethod);
  const setZmanimMethod = useSettingsStore((s) => s.setZmanimMethod);

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

  const swipeGesture = Gesture.Pan().onEnd((e) => {
    if (Math.abs(e.velocityX) > 400) {
      navigateDay(e.velocityX < 0 ? 1 : -1);
    }
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
              {hebrewFormatted}
            </Text>
            <Text style={[styles.gregDate, { color: colors.textSecondary }]}>
              {gregFormatted}
            </Text>
          </View>

          {/* Location chip — tappable; opens picker; shows GPS indicator when
              source is 'gps' so users can see when auto-detected. */}
          <Pressable
            onPress={() => router.push('/locationPicker' as any)}
            style={[styles.locationRow, { backgroundColor: colors.surfaceElevated }]}
            accessibilityLabel="שנה מיקום"
          >
            <MapPin size={16} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {currentCityName}
            </Text>
            {source === 'gps' && (
              <Navigation size={12} color={colors.textTertiary} />
            )}
          </Pressable>

          {/* Shita segmented control — selecting persists via SettingsProvider */}
          <View style={styles.shitaSelector}>
            {SHITA_OPTIONS.map(({ value, label }) => {
              const active = zmanimMethod === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setZmanimMethod(value)}
                  style={[
                    styles.shitaButton,
                    {
                      backgroundColor: active ? colors.accent : colors.surface,
                      borderColor:     active ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text style={[
                    styles.shitaButtonText,
                    { color: active ? colors.textInverse : colors.textPrimary },
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
  hebrewDate: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  gregDate:   { fontSize: 14, marginTop: 4 },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    marginBottom: 16,
  },
  locationText: { fontSize: 14, fontWeight: '500', flex: 1 },

  // Shita selector
  shitaSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  shitaButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  shitaButtonText: { fontSize: 14, fontWeight: '600' },
});
