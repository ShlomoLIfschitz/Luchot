// src/components/common/ScreenHeader.tsx
// Universal screen header.
// Phase 3.7a-1: hamburger button + optional title + right spacer.
// Phase 3.7c: optional `date` prop. When passed, renders a compact bilingual
// date display (Hebrew + Gregorian) in place of the title. Line order
// is controlled by the hebrewOnTop setting from SettingsProvider.
//
// Padding note: uses StatusBar.currentHeight for Android status-bar clearance.
// iOS: currentHeight is null → falls back to 0. Safe area handling via
// SafeAreaProvider at the root covers iOS notches separately.

import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Menu } from 'lucide-react-native';
import { useDrawerStore } from '../../providers/DrawerProvider';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { useThemeColors } from '../../hooks/useThemeColors';
import {
  dateService,
  toHebrewNumeral,
  toHebrewYear,
} from '../../services/DateService';

interface ScreenHeaderProps {
  title?: string;
  date?: Date;  // When provided, replaces title with compact bilingual date
}

export function ScreenHeader({ title, date }: ScreenHeaderProps) {
  const colors = useThemeColors();
  const openDrawer = useDrawerStore((s) => s.open);
  const hebrewOnTop = useSettingsStore((s) => s.hebrewOnTop);

  // Build bilingual date strings when date prop is present.
  // dateService.getDayData is cached per month — cheap on repeated renders.
  let primaryLine: string | undefined;
  let secondaryLine: string | undefined;

  if (date) {
    const dayData = dateService.getDayData(date);
    const hebrew = `${toHebrewNumeral(dayData.hebrewDate.day)} ${dayData.hebrewDate.monthName} ${toHebrewYear(dayData.hebrewDate.year)}`;
    const greg = date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    primaryLine   = hebrewOnTop ? hebrew : greg;
    secondaryLine = hebrewOnTop ? greg   : hebrew;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: (StatusBar.currentHeight ?? 0) + 8,
        },
      ]}
    >
      <Pressable
        onPress={openDrawer}
        hitSlop={12}
        style={styles.menuButton}
        accessibilityLabel="פתח תפריט"
      >
        <Menu size={24} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.centerContent}>
        {date ? (
          // Bilingual date display — compact two-line stack
          <>
            <Text style={[styles.dateLineLarge, { color: colors.textPrimary }]}>
              {primaryLine}
            </Text>
            <Text style={[styles.dateLineSmall, { color: colors.textSecondary }]}>
              {secondaryLine}
            </Text>
          </>
        ) : title ? (
          // Plain title fallback (screens that don't pass a date)
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
        ) : null}
      </View>

      {/* Right-side spacer keeps content visually centred.
          Reserved for a "today" shortcut button in a future phase. */}
      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuButton: {
    padding: 4,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateLineLarge: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  dateLineSmall: {
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
  },
  rightSpacer: {
    width: 32, // matches menuButton footprint (24px icon + 2×4px padding) for centred content
  },
});
