// src/components/calendar/MonthGrid.tsx
// Phase 3.4 — mode made required; useRouter wired; second-tap and viewDay
// quick action now navigate to the Day tab.
// Phase 3.7a-2 — addNote and addRecurring quick actions wired to NoteEditor.
// Phase 4.2-2 — useDatesNotes wired; user notes now appear as tags.
// Phase 4.6-C — FlatList replaced with View grid; mode prop drives RTL/LTR
//               direction. Hebrew mode: row-reverse (Sunday right, Shabbat left).
//               Gregorian mode: row (Sunday left, Saturday right).

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import BottomSheet from '@gorhom/bottom-sheet';
import { useCalendarStore } from '../../providers/CalendarProvider';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { useThemeColors } from '../../hooks/useThemeColors';
import { DayCell } from './DayCell';
import { MonthYearPicker } from './MonthYearPicker';
import { QuickActionSheet, QuickAction } from './QuickActionSheet';
import { DayData, toHebrewNumeral, toHebrewYear } from '../../services/DateService';
import { buildDayTags } from '../../utils/tagMapper';
import { NoteEditor } from '../notes/NoteEditor';
import { useNotes } from '../../hooks/useNotes';
import { useDatesNotes } from '../../hooks/useDatesNotes';
import { dateService } from '../../services/DateService';
import { formatDateKey } from '../../utils/dateUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MonthGridMode = 'hebrew' | 'gregorian';

interface MonthGridProps {
  /** Determines primary/secondary date label assignment and grid direction.
   *  Pass 'hebrew' for the עברי tab (RTL, Sunday right), 'gregorian' for
   *  the לועזי tab (LTR, Sunday left). */
  mode: MonthGridMode;
}

// ── Day name headers ───────────────────────────────────────────────────────────
// Arrays are in logical Sunday-first order. The visual order is flipped for
// Hebrew mode by flexDirection: 'row-reverse' on the header and week rows.

const DAY_NAMES_HE_SUN_FIRST = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAY_NAMES_HE_MON_FIRST = ['ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳', 'א׳'];
const DAY_NAMES_EN_SUN_FIRST = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_EN_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Component ─────────────────────────────────────────────────────────────────

export function MonthGrid({ mode }: MonthGridProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const {
    monthData,
    selectedDate,
    today,
    navigateMonth,
    navigateToMonth,
    setSelectedDate,
    currentMonth,
    currentYear,
  } = useCalendarStore();
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [actionSheetDate, setActionSheetDate] = useState<Date | null>(null);
  const actionSheetRef = useRef<BottomSheet>(null);

  // NoteEditor state — opened by addNote / addRecurring quick actions.
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);

  // Use actionSheetDate when set (the long-pressed day); fall back to
  // selectedDate so useNotes always receives a valid Date.
  const editorDate = actionSheetDate ?? selectedDate;
  const editorHebrewDate = useMemo(
    () => dateService.getDayData(editorDate).hebrewDate,
    [editorDate],
  );
  const { saveNote, refreshKey } = useNotes(editorDate);

  // ── Layout direction ───────────────────────────────────────────────────────
  // Hebrew mode: row-reverse → Sunday at right edge, Shabbat at left edge.
  // Gregorian mode: row (LTR) → Sunday at left edge, Saturday at right edge.
  const isRtl = mode === 'hebrew';

  // ── Day name selection ─────────────────────────────────────────────────────
  const dayNames = mode === 'hebrew'
    ? (firstDayOfWeek === 0 ? DAY_NAMES_HE_SUN_FIRST : DAY_NAMES_HE_MON_FIRST)
    : (firstDayOfWeek === 0 ? DAY_NAMES_EN_SUN_FIRST : DAY_NAMES_EN_MON_FIRST);

  // ── Grid construction ──────────────────────────────────────────────────────
  // Compute the number of empty leading cells to align the first day of
  // the month to the correct column. The visual direction (RTL/LTR) is
  // handled by flexDirection on the row container — the offset itself is
  // the same for both modes.
  const startDayOffset = useMemo(() => {
    if (!monthData.length) return 0;
    const firstDay = monthData[0].gregorianDate.getDay();
    return firstDayOfWeek === 1 ? (firstDay + 6) % 7 : firstDay;
  }, [monthData, firstDayOfWeek]);

  // Build a 2-D array of weeks: each inner array has exactly 7 entries
  // (null for padding cells, DayData for real days).
  const weeks = useMemo<(DayData | null)[][]>(() => {
    if (!monthData.length) return [];
    const result: (DayData | null)[][] = [];
    let currentWeek: (DayData | null)[] = [];

    // Leading empty cells
    for (let i = 0; i < startDayOffset; i++) {
      currentWeek.push(null);
    }
    // Days of the month
    for (const day of monthData) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    // Trailing empty cells to complete the last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length === 7) result.push(currentWeek);

    return result;
  }, [monthData, startDayOffset]);

  // ── Notes for the displayed month ─────────────────────────────────────────
  const gridStart = useMemo(
    () => (monthData.length ? monthData[0].gregorianDate : new Date()),
    [monthData],
  );
  const gridEnd = useMemo(
    () => (monthData.length ? monthData[monthData.length - 1].gregorianDate : new Date()),
    [monthData],
  );
  const notesByDate = useDatesNotes(gridStart, gridEnd, refreshKey);

  // ── Date helpers ───────────────────────────────────────────────────────────
  const isSameDay = useCallback((a: Date, b: Date) => {
    return a.toDateString() === b.toDateString();
  }, []);

  // ── Label computation ──────────────────────────────────────────────────────
  const getLabels = useCallback(
    (d: DayData): { primary: string; secondary: string } => {
      const greg   = d.gregorianDate.getDate().toString();
      const hebrew = toHebrewNumeral(d.hebrewDate.day);
      return mode === 'hebrew'
        ? { primary: hebrew, secondary: greg }
        : { primary: greg,   secondary: hebrew };
    },
    [mode],
  );

  // ── Interaction handlers ───────────────────────────────────────────────────

  const handleDayPress = useCallback(
    (dayData: DayData) => {
      if (isSameDay(dayData.gregorianDate, selectedDate)) {
        router.push('/(tabs)/day');
      } else {
        setSelectedDate(dayData.gregorianDate);
      }
    },
    [selectedDate, isSameDay, setSelectedDate, router],
  );

  const handleDayLongPress = useCallback(
    (dayData: DayData) => {
      setSelectedDate(dayData.gregorianDate);
      setActionSheetDate(dayData.gregorianDate);
      actionSheetRef.current?.expand();
    },
    [setSelectedDate],
  );

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      switch (action) {
        case 'addNote':
          setNoteEditorVisible(true);
          break;
        case 'addRecurring':
          setNoteEditorVisible(true);
          break;
        case 'viewDay':
          router.push('/(tabs)/day');
          break;
      }
    },
    [router],
  );

  // ── Swipe gesture ──────────────────────────────────────────────────────────
  const swipeGesture = Gesture.Pan().onEnd((e) => {
    if (Math.abs(e.velocityX) > 400) {
      runOnJS(navigateMonth)(e.velocityX < 0 ? 1 : -1);
    }
  });

  // ── Month title computation ────────────────────────────────────────────────
  const gregMonthName = useMemo(() => {
    const d = new Date(currentYear, currentMonth - 1, 1);
    return d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  }, [currentMonth, currentYear]);

  const hebrewMonthTitle = useMemo(() => {
    if (!monthData.length) return '';
    const anchor = monthData[Math.min(14, monthData.length - 1)];
    return `${anchor.hebrewDate.monthName} ${toHebrewYear(anchor.hebrewDate.year)}`;
  }, [monthData]);

  const primaryTitle   = mode === 'hebrew' ? hebrewMonthTitle : gregMonthName;
  const secondaryTitle = mode === 'hebrew' ? gregMonthName    : hebrewMonthTitle;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Month Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>‹</Text>
          </Pressable>

          <Pressable
            onPress={() => setPickerVisible(true)}
            style={styles.headerCenter}
          >
            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
              {primaryTitle}
            </Text>
            <Text style={[styles.monthSubtitle, { color: colors.textSecondary }]}>
              {secondaryTitle}
            </Text>
          </Pressable>

          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>›</Text>
          </Pressable>
        </View>

        {/* Day Name Headers — direction driven by mode */}
        <View style={[styles.dayNames, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          {dayNames.map((name, i) => (
            <Text key={i} style={[styles.dayName, { color: colors.textTertiary }]}>
              {name}
            </Text>
          ))}
        </View>

        {/* Calendar Grid — View-based 7-column layout.
            Each week row uses the same direction as the day-name header.
            DayCell is unchanged — flex: 1 on the wrapper distributes width. */}
        <View>
          {weeks.map((week, wIdx) => (
            <View
              key={wIdx}
              style={[styles.weekRow, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}
            >
              {week.map((day, dIdx) => {
                if (!day) {
                  return <View key={`e-${wIdx}-${dIdx}`} style={styles.emptyCell} />;
                }

                const { primary, secondary } = getLabels(day);
                const isToday    = isSameDay(day.gregorianDate, today);
                const isSelected = isSameDay(day.gregorianDate, selectedDate);
                const isFriday   = day.gregorianDate.getDay() === 5;
                const dayKey     = formatDateKey(day.gregorianDate);
                const dayNotes   = notesByDate.get(dayKey) ?? [];
                const tags       = buildDayTags(day, dayNotes);

                return (
                  <View key={day.gregorianDate.toISOString()} style={styles.cellWrapper}>
                    <DayCell
                      primaryLabel={primary}
                      secondaryLabel={secondary}
                      isToday={isToday}
                      isSelected={isSelected}
                      isShabbat={day.hebrewDate.isShabbat}
                      isHoliday={day.isYomTov || day.holidays.length > 0}
                      isFriday={isFriday}
                      tags={tags}
                      onPress={() => handleDayPress(day)}
                      onLongPress={() => handleDayLongPress(day)}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Month/Year Picker */}
        <MonthYearPicker
          visible={pickerVisible}
          currentYear={currentYear}
          currentMonth={currentMonth}
          colors={colors}
          onSelect={navigateToMonth}
          onClose={() => setPickerVisible(false)}
        />

        {/* NoteEditor — opened by addNote / addRecurring quick actions */}
        <NoteEditor
          visible={noteEditorVisible}
          date={editorDate}
          hebrewDate={editorHebrewDate}
          colors={colors}
          onClose={() => setNoteEditorVisible(false)}
          onSave={saveNote}
        />

        {/* Quick Action Sheet — opened on day long-press */}
        <QuickActionSheet
          ref={actionSheetRef}
          date={actionSheetDate}
          onAction={handleQuickAction}
          onClose={() => actionSheetRef.current?.close()}
        />

      </View>
    </GestureDetector>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, paddingHorizontal: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  headerCenter:   { alignItems: 'center' },
  monthTitle:     { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  monthSubtitle:  { fontSize: 12, marginTop: 1, textAlign: 'center' },
  navArrow:       { fontSize: 28, fontWeight: '300' },

  // Day name header row — flexDirection set inline based on mode
  dayNames: { paddingBottom: 8 },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Week rows — flexDirection set inline based on mode.
  // Explicit height breaks the Yoga circular-height dependency that occurs
  // when every cell is a cellWrapper (no emptyCell with explicit height to
  // anchor the row). Without this, rows containing only DayCell children
  // (weeks 2–5 of most months) collapse to ~8 px tall.
  weekRow: { height: 110 }, // matches CELL_HEIGHT in DayCell

  // Cell containers — flex: 1 distributes each cell to 1/7 of row width.
  // alignItems: 'stretch' (default on weekRow) makes cellWrapper fill the
  // row height (110 px) so DayCell's flex:1 inside it expands correctly.
  cellWrapper: { flex: 1 },
  emptyCell:   { flex: 1 }, // height comes from weekRow stretch
});
