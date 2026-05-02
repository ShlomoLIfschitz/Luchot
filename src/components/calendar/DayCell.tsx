// src/components/calendar/DayCell.tsx

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DayData, toHebrewNumeral } from '../../services/DateService';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { useThemeColors } from '../../hooks/useThemeColors';

interface DayCellProps {
  dayData: DayData;
  isToday: boolean;
  isSelected: boolean;
  isAfterSunset: boolean;      // Global sunset state
  onPress: (dayData: DayData) => void;
}

export const DayCell = memo(({ dayData, isToday, isSelected, isAfterSunset, onPress }: DayCellProps) => {
  const colors = useThemeColors();
  const { showHebrew, showGregorian, hebrewOnTop, diagonalDirection } = useSettingsStore();

  const { gregorianDate, hebrewDate, holidays, isYomTov, omerDay } = dayData;
  const gregDay = gregorianDate.getDate();
  const hebrewDay = toHebrewNumeral(hebrewDate.day);
  const isShabbat = hebrewDate.isShabbat;
  const isRoshChodesh = hebrewDate.isRoshChodesh;

  // Color logic
  let accentColor = colors.textPrimary;
  if (isToday) accentColor = colors.today;
  else if (isYomTov || holidays.length > 0) accentColor = colors.holiday;
  else if (isShabbat) accentColor = colors.shabbat;

  // Diagonal: top-left = Greg, bottom-right = Hebrew (or flipped)
  // diagonalDirection: 'tl-br' | 'tr-bl'
  const isRTL = diagonalDirection === 'tr-bl';

  const primaryText = hebrewOnTop ? hebrewDay : gregDay.toString();
  const secondaryText = hebrewOnTop ? gregDay.toString() : hebrewDay;

  // Is this today after sunset? Show sunset indicator
  const showSunsetIndicator = isToday && isAfterSunset;

  return (
    <Pressable
      onPress={() => onPress(dayData)}
      style={[
        styles.cell,
        isSelected && { backgroundColor: colors.accentLight },
        isToday && { backgroundColor: colors.todayLight },
      ]}
    >
      {/* Holiday dot */}
      {(holidays.length > 0 || isYomTov) && (
        <View style={[styles.holidayDot, { backgroundColor: accentColor }]} />
      )}

      {/* Primary date — top position */}
      <Text style={[
        styles.primaryDate,
        { color: accentColor },
        isRTL ? styles.alignRight : styles.alignLeft,
      ]}>
        {showHebrew && hebrewOnTop ? hebrewDay : ''}
        {showGregorian && !hebrewOnTop ? gregDay.toString() : ''}
        {!showHebrew && !showGregorian ? '' : !hebrewOnTop && !showGregorian ? '' : ''}
        {/* Simplified: show primary based on settings */}
        {primaryText}
      </Text>

      {/* Sunset indicator badge */}
      {showSunsetIndicator && (
        <Text style={styles.sunsetBadge}>✶</Text>
      )}

      {/* Secondary date — bottom, diagonal, smaller + faded */}
      <Text style={[
        styles.secondaryDate,
        { color: colors.textTertiary },
        isRTL ? styles.alignLeft : styles.alignRight,
      ]}>
        {secondaryText}
      </Text>

      {/* Rosh Chodesh indicator */}
      {isRoshChodesh && (
        <View style={[styles.roshChodeshBar, { backgroundColor: colors.accent }]} />
      )}
    </Pressable>
  );
}, (prev, next) => {
  // Custom comparison for memo — only re-render if meaningful change
  return (
    prev.isToday === next.isToday &&
    prev.isSelected === next.isSelected &&
    prev.isAfterSunset === next.isAfterSunset &&
    prev.dayData.gregorianDate.getTime() === next.dayData.gregorianDate.getTime()
  );
});

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 0.85,
    margin: 1,
    borderRadius: 8,
    padding: 4,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  primaryDate: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  secondaryDate: {
    fontSize: 9,           // ~60% of primary
    fontWeight: '400',
    opacity: 0.55,
    fontFamily: 'System',
  },
  sunsetBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 7,
    color: '#C4A882',
  },
  holidayDot: {
    position: 'absolute',
    bottom: 5,
    alignSelf: 'center',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  roshChodeshBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  alignLeft: { textAlign: 'left' },
  alignRight: { textAlign: 'right' },
});
