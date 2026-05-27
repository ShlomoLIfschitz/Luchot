// src/components/calendar/WeekGrid.tsx
// Phase 3.7b-3 — Minimal Week view. Renders 7 DayCells horizontally for
// the week containing selectedDate.
// Phase 4.2-2 — useDatesNotes wired; user notes now appear as tags.
//
// Differs from MonthGrid:
//   - 7 cells in one row (vs 5-6 rows of 7 in a month grid)
//   - onPress navigates directly to Day tab (no select-first)
//   - swipe gesture navigates BETWEEN WEEKS (not between days)
//   - mode prop determines primary/secondary label assignment

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import { useCalendarStore } from '../../providers/CalendarProvider';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useNotes } from '../../hooks/useNotes';
import { useDatesNotes } from '../../hooks/useDatesNotes';
import { DayCell } from './DayCell';
import { QuickActionSheet, QuickAction } from './QuickActionSheet';
import { NoteEditor } from '../notes/NoteEditor';
import {
  dateService,
  toHebrewNumeral,
  type DayData,
} from '../../services/DateService';
import { buildDayTags } from '../../utils/tagMapper';
import { formatDateKey } from '../../utils/dateUtils';
import type { FirstDayOfWeek } from '../../providers/SettingsProvider';

type WeekGridMode = 'hebrew' | 'gregorian';

interface WeekGridProps {
  mode: WeekGridMode;
}

/**
 * Returns 7 DayData objects covering the week containing `anchor`.
 * The first day depends on firstDayOfWeek (0=Sunday, 1=Monday).
 */
function getWeekDays(anchor: Date, firstDayOfWeek: FirstDayOfWeek): DayData[] {
  const anchorDayOfWeek = anchor.getDay(); // 0=Sun..6=Sat
  let offset: number;
  if (firstDayOfWeek === 0) {
    offset = anchorDayOfWeek; // back to Sunday
  } else {
    // Monday start: if anchor is Sunday (0), back 6 days; else back (day-1)
    offset = anchorDayOfWeek === 0 ? 6 : anchorDayOfWeek - 1;
  }

  const firstDay = new Date(anchor);
  firstDay.setDate(firstDay.getDate() - offset);

  const days: DayData[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(firstDay);
    d.setDate(firstDay.getDate() + i);
    days.push(dateService.getDayData(d));
  }
  return days;
}

export function WeekGrid({ mode }: WeekGridProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const today = useCalendarStore((s) => s.today);
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);

  // QuickActionSheet state
  const [actionSheetDate, setActionSheetDate] = useState<Date | null>(null);
  const actionSheetRef = useRef<BottomSheet>(null);

  // NoteEditor state
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const editorDate = actionSheetDate ?? selectedDate;
  const editorHebrewDate = useMemo(
    () => dateService.getDayData(editorDate).hebrewDate,
    [editorDate],
  );
  const { saveNote, refreshKey } = useNotes(editorDate);

  // 7 days of the current week
  const weekDays = useMemo(
    () => getWeekDays(selectedDate, firstDayOfWeek),
    [selectedDate, firstDayOfWeek],
  );

  // Notes for the 7-day range — refreshKey from useNotes triggers re-fetch
  // after save/delete so the week row updates immediately.
  const weekStart    = weekDays[0].gregorianDate;
  const weekEnd      = weekDays[6].gregorianDate;
  const notesByDate  = useDatesNotes(weekStart, weekEnd, refreshKey);

  // Helpers
  const isSameDay = useCallback((a: Date, b: Date) => {
    return a.toDateString() === b.toDateString();
  }, []);

  const getLabels = useCallback(
    (d: DayData): { primary: string; secondary: string } => {
      const greg = d.gregorianDate.getDate().toString();
      const hebrew = toHebrewNumeral(d.hebrewDate.day);
      return mode === 'hebrew'
        ? { primary: hebrew, secondary: greg }
        : { primary: greg, secondary: hebrew };
    },
    [mode],
  );

  // onPress → immediate navigation to Day tab (no select-first unlike MonthGrid)
  const handleDayPress = useCallback(
    (dayData: DayData) => {
      setSelectedDate(dayData.gregorianDate);
      router.push('/(tabs)/day');
    },
    [setSelectedDate, router],
  );

  // Long-press → QuickActionSheet (same pattern as MonthGrid)
  const handleDayLongPress = useCallback(
    (dayData: DayData) => {
      setSelectedDate(dayData.gregorianDate);
      setActionSheetDate(dayData.gregorianDate);
      actionSheetRef.current?.expand();
    },
    [setSelectedDate],
  );

  // QuickAction dispatch — same pattern as MonthGrid
  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      switch (action) {
        case 'addNote':
          setNoteEditorVisible(true);
          break;
        case 'addRecurring':
          setNoteEditorVisible(true); // user picks type via editor's type chips
          break;
        case 'viewDay':
          router.push('/(tabs)/day');
          break;
      }
    },
    [router],
  );

  // Swipe gesture — moves between WEEKS, not between days
  const swipeGesture = Gesture.Pan().onEnd((e) => {
    if (Math.abs(e.velocityX) > 400) {
      const direction = e.velocityX < 0 ? 1 : -1; // RTL: left swipe = next week
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + 7 * direction);
      setSelectedDate(next);
    }
  });

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.row}>
          {weekDays.map((day) => {
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

        {/* NoteEditor — Modal-based; controlled via visible prop */}
        <NoteEditor
          visible={noteEditorVisible}
          date={editorDate}
          hebrewDate={editorHebrewDate}
          colors={colors}
          onClose={() => setNoteEditorVisible(false)}
          onSave={saveNote}
        />

        {/* QuickActionSheet — opened on day long-press */}
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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
  },
  cellWrapper: {
    flex: 1, // 1/7 of available width per cell
  },
});
