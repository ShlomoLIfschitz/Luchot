// src/components/calendar/MonthGrid.tsx
// Phase 3.4 — mode made required; useRouter wired; second-tap and viewDay
// quick action now navigate to the Day tab.
// Phase 3.7a-2 — addNote and addRecurring quick actions wired to NoteEditor.
//
// Known limitations (intentional, deferred to later phases):
//   1. User notes do not appear as tags — buildDayTags receives empty
//      userNotes array. Batching strategy for per-cell notes deferred
//      to Phase 4.
//   2. addNote and addRecurring both open NoteEditor with default state
//      (noteType: 'note'). The user selects the specific type via the
//      editor's type chips. A direct preset would require a defaultNoteType
//      prop on NoteEditor; deferred to Phase 4 polish.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
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
import { dateService } from '../../services/DateService';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MonthGridMode = 'hebrew' | 'gregorian';

interface MonthGridProps {
  /** Determines primary/secondary date label assignment.
   *  Pass 'hebrew' for the עברי tab, 'gregorian' for the לועזי tab. */
  mode: MonthGridMode;
}

// ── Day name headers ───────────────────────────────────────────────────────────

const DAYS_HE_SUN_FIRST = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAYS_HE_MON_FIRST = ['ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳', 'א׳'];

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
  // Both actions currently open the editor with default state; the user
  // selects the specific type via the editor's type chips (see limitation #2).
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);

  // Use actionSheetDate when set (the long-pressed day); fall back to
  // selectedDate so useNotes always receives a valid Date.
  const editorDate = actionSheetDate ?? selectedDate;
  const editorHebrewDate = useMemo(
    () => dateService.getDayData(editorDate).hebrewDate,
    [editorDate],
  );
  const { saveNote } = useNotes(editorDate);

  // ── Grid construction ──────────────────────────────────────────────────────
  // Prepend empty cells to align the first day of the month correctly.
  const gridData = useMemo(() => {
    if (!monthData.length) return [];
    const firstDay = monthData[0].gregorianDate.getDay();
    const offset = firstDayOfWeek === 1 ? (firstDay + 6) % 7 : firstDay;
    const empties = Array(offset).fill(null);
    return [...empties, ...monthData];
  }, [monthData, firstDayOfWeek]);

  // ── Date helpers ───────────────────────────────────────────────────────────
  const isSameDay = useCallback((a: Date, b: Date) => {
    return a.toDateString() === b.toDateString();
  }, []);

  // ── Label computation ──────────────────────────────────────────────────────
  // Determines which date (Hebrew or Gregorian) is primary vs secondary
  // based on the mode prop passed by the tab screen.
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

  // First tap → select day. Second tap on already-selected day → navigate.
  // Navigation is a TODO until the Day tab exists (Phase 3.4).
  const handleDayPress = useCallback(
    (dayData: DayData) => {
      if (isSameDay(dayData.gregorianDate, selectedDate)) {
        router.push('/(tabs)/day');
      } else {
        setSelectedDate(dayData.gregorianDate);
      }
    },
    [selectedDate, isSameDay, setSelectedDate],
  );

  // Long-press → select day + open quick action sheet.
  const handleDayLongPress = useCallback(
    (dayData: DayData) => {
      setSelectedDate(dayData.gregorianDate);
      setActionSheetDate(dayData.gregorianDate);
      actionSheetRef.current?.expand();
    },
    [setSelectedDate],
  );

  // Quick action dispatch — no-ops until Phase 3.4–3.5 wires the targets.
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
    [],
  );

  // ── Swipe gesture ──────────────────────────────────────────────────────────
  const swipeGesture = Gesture.Pan().onEnd((e) => {
    if (Math.abs(e.velocityX) > 400) {
      navigateMonth(e.velocityX < 0 ? 1 : -1);
    }
  });

  // ── Cell renderer ──────────────────────────────────────────────────────────
  // User notes are passed as [] — see file-level "Known limitations" comment.
  const renderItem = useCallback(
    ({ item, index }: { item: DayData | null; index: number }) => {
      if (!item) {
        return <View style={styles.emptyCell} />;
      }

      const { primary, secondary } = getLabels(item);
      const isToday    = isSameDay(item.gregorianDate, today);
      const isSelected = isSameDay(item.gregorianDate, selectedDate);
      const isFriday   = item.gregorianDate.getDay() === 5;
      const tags       = buildDayTags(item, []); // userNotes deferred to Phase 4

      return (
        <View style={styles.cellWrapper}>
          <DayCell
            primaryLabel={primary}
            secondaryLabel={secondary}
            isToday={isToday}
            isSelected={isSelected}
            isShabbat={item.hebrewDate.isShabbat}
            isHoliday={item.isYomTov || item.holidays.length > 0}
            isFriday={isFriday}
            tags={tags}
            onPress={() => handleDayPress(item)}
            onLongPress={() => handleDayLongPress(item)}
          />
        </View>
      );
    },
    [today, selectedDate, getLabels, isSameDay, handleDayPress, handleDayLongPress],
  );

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

  // Header titles respect mode — primary (large) matches mode priority.
  const primaryTitle   = mode === 'hebrew' ? hebrewMonthTitle : gregMonthName;
  const secondaryTitle = mode === 'hebrew' ? gregMonthName    : hebrewMonthTitle;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Month Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigateMonth(-1)} hitSlop={12}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>‹</Text>
          </Pressable>

          {/* Tap (not long-press) now opens the month/year picker — per SCREENS.md */}
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

          <Pressable onPress={() => navigateMonth(1)} hitSlop={12}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>›</Text>
          </Pressable>
        </View>

        {/* Day Name Headers */}
        <View style={styles.dayNames}>
          {(firstDayOfWeek === 1 ? DAYS_HE_MON_FIRST : DAYS_HE_SUN_FIRST).map((d, i) => (
            <Text key={i} style={[styles.dayName, { color: colors.textTertiary }]}>
              {d}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <FlatList
          data={gridData}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item ? item.gregorianDate.toISOString() : `empty-${index}`
          }
          numColumns={7}
          scrollEnabled={false}
          initialNumToRender={42}
          maxToRenderPerBatch={42}
          windowSize={1}
          removeClippedSubviews={false}
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

        {/* NoteEditor — opened by addNote / addRecurring quick actions.
            Modal-based (not BottomSheet); controlled via visible prop.
            colors injected because NoteEditor does not call useThemeColors
            internally. */}
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
  monthTitle:     { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  monthSubtitle:  { fontSize: 12, marginTop: 1 },
  navArrow:       { fontSize: 28, fontWeight: '300' },
  dayNames:       { flexDirection: 'row', paddingBottom: 8 },
  dayName: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  cellWrapper: { flex: 1 },
  emptyCell:   { flex: 1, height: 110 }, // matches CELL_HEIGHT in DayCell
});
