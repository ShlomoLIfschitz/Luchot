// app/week.tsx
// Redesign — Standalone Week screen. Accessible from the hamburger drawer.
// Header: hamburger (left) + centered bilingual week-range title + a
// "jump to today" button (right). Body: parasha banner (when applicable)
// + WeekTimeline (day-columns header, all-day/span row, hourly grid).

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Menu, CalendarDays, Plus } from 'lucide-react-native';
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { useDrawerStore } from '../src/providers/DrawerProvider';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { WeekTimeline } from '../src/components/calendar/WeekTimeline';
import { useSettingsStore } from '../src/providers/SettingsProvider';
import { useNotes } from '../src/hooks/useNotes';
import { NoteEditor } from '../src/components/notes/NoteEditor';
import {
  dateService,
  toHebrewNumeral,
  toHebrewYear,
} from '../src/services/DateService';
import { GREG_MONTHS_HE, formatGregDayMonth } from '../src/components/calendar/weekTimelineLayout';
import { radius } from '../src/constants/radius';
import { elevation } from '../src/constants/elevation';
import { typography, withFontFamily } from '../src/constants/typography';
import type { FirstDayOfWeek } from '../src/providers/SettingsProvider';
import { useDatePicker } from '../src/hooks/useDatePicker';

const FAB_SIZE = 56;

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
  const insets = useSafeAreaInsets();
  const openDrawer = useDrawerStore((s) => s.open);
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const hebrewOnTop = useSettingsStore((s) => s.hebrewOnTop);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);

  // Date picker — tapping the header title opens it (parity with other screens).
  const { openPicker, picker } = useDatePicker(selectedDate, setSelectedDate);

  const jumpToToday = useCallback(() => setSelectedDate(new Date()), [setSelectedDate]);

  // Quick-add FAB — opens NoteEditor for the currently selected day (same
  // wiring pattern MonthGrid uses for its addNote quick action; NoteEditor's
  // own onSave calls incrementNotesVersion(), which WeekTimeline picks up
  // automatically via its notesVersion selector — no extra plumbing needed).
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const editorHebrewDate = useMemo(
    () => dateService.getDayData(selectedDate).hebrewDate,
    [selectedDate],
  );
  const { saveNote } = useNotes(selectedDate);

  // Derive week start + end
  const { weekStart, weekEnd } = useMemo(() => {
    const start = getWeekStart(selectedDate, firstDayOfWeek);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { weekStart: start, weekEnd: end };
  }, [selectedDate, firstDayOfWeek]);

  // Parasha for the week — look up the Saturday of the displayed window.
  // Parasha field on DayData is only populated on Shabbat.
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

  // Bilingual week range header.
  // NOTE: Hebrew Gregorian month/weekday names must NOT come from
  // toLocaleDateString('he-IL', ...) — Hermes on Android has unreliable
  // Intl data for those. GREG_MONTHS_HE / formatGregDayMonth are local
  // constant tables (see weekTimelineLayout.ts).
  const weekStartHeb = dateService.getDayData(weekStart).hebrewDate;
  const weekEndHeb   = dateService.getDayData(weekEnd).hebrewDate;

  const hebrewRange = useMemo(() => {
    const sameMonth = weekStartHeb.monthName === weekEndHeb.monthName;
    const sameYear  = weekStartHeb.year === weekEndHeb.year;
    if (sameMonth) {
      return `${toHebrewNumeral(weekStartHeb.day)}–${toHebrewNumeral(weekEndHeb.day)} ב${weekStartHeb.monthName}`;
    }
    const startPart = `${toHebrewNumeral(weekStartHeb.day)} ב${weekStartHeb.monthName}`;
    const endPart   = `${toHebrewNumeral(weekEndHeb.day)} ב${weekEndHeb.monthName}`;
    if (sameYear) return `${startPart} – ${endPart}`;
    // Rare Hebrew-year boundary crossing (e.g. around Rosh Hashana): show both years.
    return `${startPart} ${toHebrewYear(weekStartHeb.year)} – ${endPart} ${toHebrewYear(weekEndHeb.year)}`;
  }, [weekStartHeb, weekEndHeb]);

  const gregRange = useMemo(() => {
    const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    if (sameMonth) {
      return `${weekStart.getDate()} – ${weekEnd.getDate()} ב${GREG_MONTHS_HE[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
    }
    return `${formatGregDayMonth(weekStart)} – ${formatGregDayMonth(weekEnd)} ${weekEnd.getFullYear()}`;
  }, [weekStart, weekEnd]);

  const primaryRange   = hebrewOnTop ? hebrewRange : gregRange;
  const secondaryRange = hebrewOnTop ? gregRange   : hebrewRange;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header: hamburger / title / jump-to-today ─────────────────────── */}
      <View
        style={[
          styles.header,
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
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="פתח תפריט"
        >
          <Menu size={24} color={colors.textPrimary} />
        </Pressable>

        <Pressable
          onPress={openPicker}
          style={styles.titleBlock}
          accessibilityRole="button"
          accessibilityLabel="בחר תאריך"
        >
          <Text style={[styles.primaryRange, { color: colors.textPrimary }]}>
            {primaryRange}
          </Text>
          <Text style={[styles.secondaryRange, { color: colors.textSecondary }]}>
            {secondaryRange}
          </Text>
        </Pressable>

        <Pressable
          onPress={jumpToToday}
          hitSlop={12}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="קפוץ להיום"
        >
          <CalendarDays size={22} color={colors.textPrimary} />
        </Pressable>
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

      {/* WeekTimeline — owns swipe gesture, day-columns header, all-day row,
          hourly grid (its own vertical ScrollView). */}
      <WeekTimeline weekStart={weekStart} />

      {/* Quick-add FAB — bottom-end (= bottom-LEFT in RTL). This screen has no
          bottom tab bar (it's a top-level Stack route, not under (tabs)), so
          the offset is anchored to the safe-area bottom inset instead. */}
      <Pressable
        onPress={() => setNoteEditorVisible(true)}
        style={[
          styles.fab,
          elevation.lg,
          { backgroundColor: colors.accent, bottom: insets.bottom + 20 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="הוסף אירוע"
      >
        <Plus size={26} color={colors.textInverse} />
      </Pressable>

      {/* NoteEditor — opened by the quick-add FAB, creates a note on selectedDate */}
      <NoteEditor
        visible={noteEditorVisible}
        date={selectedDate}
        hebrewDate={editorHebrewDate}
        colors={colors}
        onClose={() => setNoteEditorVisible(false)}
        onSave={saveNote}
      />

      {/* Date picker — rendered outside the timeline so it overlays everything */}
      {picker}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  // Figma: week-range title = 17 Bold; Gregorian sub-line = 11 Medium.
  primaryRange:   { ...withFontFamily(typography.cardTitle), textAlign: 'center' },
  secondaryRange: { ...withFontFamily(typography.caption), marginTop: 2, textAlign: 'center' },

  parashaBanner: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    alignItems: 'center',
  },
  parashaLabel: {
    ...withFontFamily(typography.caption),
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  parashaName: {
    ...withFontFamily(typography.cardTitle),
    textAlign: 'center',
  },

  fab: {
    position: 'absolute',
    left: 20, // bottom-end in RTL = bottom-left
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
