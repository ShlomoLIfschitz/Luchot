// app/week.tsx
// Phase 3.7b-3 — Standalone Week screen. Accessible from the
// hamburger drawer.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { WeekGrid } from '../src/components/calendar/WeekGrid';
import { useSettingsStore } from '../src/providers/SettingsProvider';
import {
  dateService,
  toHebrewNumeral,
  toHebrewYear,
} from '../src/services/DateService';
import { radius } from '../src/constants/radius';
import type { FirstDayOfWeek } from '../src/providers/SettingsProvider';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the Date of the first day of the week containing `anchor`.
 * Respects firstDayOfWeek (0=Sunday, 1=Monday).
 */
function getWeekStart(anchor: Date, firstDayOfWeek: FirstDayOfWeek): Date {
  const anchorDay = anchor.getDay();
  const offset = firstDayOfWeek === 0
    ? anchorDay
    : (anchorDay === 0 ? 6 : anchorDay - 1);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - offset);
  return start;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function WeekScreen() {
  const colors = useThemeColors();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const hebrewOnTop = useSettingsStore((s) => s.hebrewOnTop);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);

  // Derive week start + end
  const { weekStart, weekEnd } = useMemo(() => {
    const start = getWeekStart(selectedDate, firstDayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { weekStart: start, weekEnd: end };
  }, [selectedDate, firstDayOfWeek]);

  // Parasha for the week — look up the Saturday of the displayed week.
  // Parasha field on DayData is only populated on Shabbat, so we
  // find the Saturday (getDay() === 6) in the 7-day window.
  const parasha = useMemo(() => {
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (d.getDay() === 6) {
        return dateService.getDayData(d).parasha;
      }
    }
    return undefined;
  }, [weekStart]);

  // Bilingual week range header
  const weekStartHeb = dateService.getDayData(weekStart).hebrewDate;
  const weekEndHeb   = dateService.getDayData(weekEnd).hebrewDate;

  const hebrewRange =
    weekStartHeb.monthName === weekEndHeb.monthName
      ? `${toHebrewNumeral(weekStartHeb.day)}–${toHebrewNumeral(weekEndHeb.day)} ${weekStartHeb.monthName} ${toHebrewYear(weekStartHeb.year)}`
      : `${toHebrewNumeral(weekStartHeb.day)} ${weekStartHeb.monthName} – ${toHebrewNumeral(weekEndHeb.day)} ${weekEndHeb.monthName}`;

  const gregRange =
    weekStart.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) +
    ' – ' +
    weekEnd.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });

  const primaryRange   = hebrewOnTop ? hebrewRange : gregRange;
  const secondaryRange = hebrewOnTop ? gregRange   : hebrewRange;

  // Day column labels — short weekday names above the cells
  const dayLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      labels.push(d.toLocaleDateString('he-IL', { weekday: 'short' }));
    }
    return labels;
  }, [weekStart]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="שבוע" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Week range header */}
        <View style={styles.header}>
          <Text style={[styles.primaryRange, { color: colors.textPrimary }]}>
            {primaryRange}
          </Text>
          <Text style={[styles.secondaryRange, { color: colors.textSecondary }]}>
            {secondaryRange}
          </Text>
        </View>

        {/* Parasha banner — only on weeks that have a parasha */}
        {parasha && (
          <View style={[
            styles.parashaBanner,
            { backgroundColor: colors.tagHolidayBg, borderColor: colors.tagHoliday },
          ]}>
            <Text style={[styles.parashaLabel, { color: colors.textTertiary }]}>
              פרשת השבוע
            </Text>
            <Text style={[styles.parashaName, { color: colors.tagHoliday }]}>
              {parasha}
            </Text>
          </View>
        )}

        {/* Day name labels above the 7 cells */}
        <View style={styles.dayLabelsRow}>
          {dayLabels.map((label, idx) => (
            <Text
              key={idx}
              style={[styles.dayLabel, { color: colors.textTertiary }]}
            >
              {label}
            </Text>
          ))}
        </View>

        {/* WeekGrid — owns swipe gesture, QuickActionSheet, NoteEditor */}
        <WeekGrid mode={hebrewOnTop ? 'hebrew' : 'gregorian'} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  header:         { alignItems: 'center', marginBottom: 16 },
  primaryRange:   { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  secondaryRange: { fontSize: 13, marginTop: 4 },

  parashaBanner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  parashaLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  parashaName: {
    fontSize: 16,
    fontWeight: '700',
  },

  dayLabelsRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
  },
});
