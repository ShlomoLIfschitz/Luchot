// @ts-nocheck — pending DayCell API migration in Phase 3.3
// src/components/calendar/MonthGrid.tsx

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Platform } from 'react-native';
import { useCalendarStore } from '../../providers/CalendarProvider';
import { DayCell } from './DayCell';
import { DayModal } from './DayModal';
import { DayData, toHebrewYear } from '../../services/DateService';
import { MonthYearPicker } from './MonthYearPicker';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useZmanim } from '../../hooks/useZmanim';
import { isAfterSunset } from '../../services/ZmanimService';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import { useSettingsStore } from '../../providers/SettingsProvider';

const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAYS_HE_SUN_FIRST = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAYS_HE_MON_FIRST = ['ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳', 'א׳'];

export function MonthGrid() {
  const colors = useThemeColors();
  const { monthData, selectedDate, today, navigateMonth, navigateToMonth, setSelectedDate, currentMonth, currentYear } = useCalendarStore();
  const zmanim = useZmanim(today);
  const afterSunset = zmanim ? isAfterSunset(zmanim) : false;
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [modalDay, setModalDay] = React.useState<DayData | null>(null);
  const [pickerVisible, setPickerVisible] = React.useState(false);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);

  // Build grid with leading empty cells
  const gridData = useMemo(() => {
    if (!monthData.length) return [];
    const firstDay = monthData[0].gregorianDate.getDay();
    const offset = firstDayOfWeek === 1
      ? (firstDay + 6) % 7
      : firstDay;
    const empties = Array(offset).fill(null);
    return [...empties, ...monthData];
  }, [monthData, firstDayOfWeek]);

  const handleDayPress = useCallback((dayData: DayData) => {
    setSelectedDate(dayData.gregorianDate);
    setModalDay(dayData);
    bottomSheetRef.current?.expand();
  }, []);

  // Swipe gesture for month navigation
  const swipeGesture = Gesture.Pan()
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 400) {
        navigateMonth(e.velocityX < 0 ? 1 : -1);
      }
    });

  const renderItem = useCallback(({ item, index }: { item: DayData | null; index: number }) => {
    if (!item) return <View style={styles.emptyCell} />;
    const isToday = item.gregorianDate.toDateString() === today.toDateString();
    const isSelected = item.gregorianDate.toDateString() === selectedDate.toDateString();
    return (
      <DayCell
        dayData={item}
        isToday={isToday}
        isSelected={isSelected}
        isAfterSunset={isToday && afterSunset}
        onPress={handleDayPress}
      />
    );
  }, [today, selectedDate, afterSunset, handleDayPress]);

  const monthName = useMemo(() => {
    const d = new Date(currentYear, currentMonth - 1, 1);
    return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  }, [currentMonth, currentYear]);

  // Hebrew month title: use the 15th day of the Gregorian month as anchor
  const hebrewMonthTitle = useMemo(() => {
    if (!monthData.length) return '';
    const anchor = monthData[Math.min(14, monthData.length - 1)];
    return `${anchor.hebrewDate.monthName} ${toHebrewYear(anchor.hebrewDate.year)}`;
  }, [monthData]);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Month Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>‹</Text>
          </Pressable>
          <Pressable
            onLongPress={() => setPickerVisible(true)}
            delayLongPress={400}
            style={styles.headerCenter}
          >
            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>{hebrewMonthTitle}</Text>
            <Text style={[styles.monthSubtitle, { color: colors.textSecondary }]}>{monthName}</Text>
          </Pressable>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>›</Text>
          </Pressable>
        </View>

        {/* Day Names */}
        <View style={styles.dayNames}>
          {(firstDayOfWeek === 1 ? DAYS_HE_MON_FIRST : DAYS_HE_SUN_FIRST).map((d, i) => (
            <Text key={i} style={[styles.dayName, { color: colors.textTertiary }]}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <FlatList
          data={gridData}
          renderItem={renderItem}
          keyExtractor={(item, index) => item ? item.gregorianDate.toISOString() : `empty-${index}`}
          numColumns={7}
          scrollEnabled={false}
          initialNumToRender={42}
          maxToRenderPerBatch={42}
          windowSize={1}
          removeClippedSubviews={false}
        />

        {/* Day Modal */}
        <DayModal
          ref={bottomSheetRef}
          dayData={modalDay}
          onClose={() => bottomSheetRef.current?.close()}
        />

        {/* Month/Year Picker */}
        <MonthYearPicker
          visible={pickerVisible}
          currentYear={currentYear}
          currentMonth={currentMonth}
          colors={colors}
          onSelect={navigateToMonth}
          onClose={() => setPickerVisible(false)}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  headerCenter: { alignItems: 'center' },
  monthTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  monthSubtitle: { fontSize: 12, marginTop: 1 },
  navArrow: { fontSize: 28, fontWeight: '300' },
  dayNames: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  emptyCell: { flex: 1, aspectRatio: 0.85, margin: 1 },
});
