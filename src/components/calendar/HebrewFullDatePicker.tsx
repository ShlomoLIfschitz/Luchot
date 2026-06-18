// src/components/calendar/HebrewFullDatePicker.tsx
// Bottom-sheet modal for selecting a full Hebrew date (day + month + year).
// Used by NoteEditor to pick the end date of a multi-day all-day event.
// Mirrors HebrewDatePicker structure; does NOT modify HebrewDatePicker.

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { HDate } from '@hebcal/core';
import { dateService, toHebrewNumeral, toHebrewYear } from '../../services/DateService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';
import { overlay } from '../../constants/overlay';
import { HebrewDateWheel } from './HebrewDateWheel';

// ── Column widths ──────────────────────────────────────────────────────────────

const DAY_COLUMN_WIDTH   = 80;
const MONTH_COLUMN_WIDTH = 140;
const YEAR_COLUMN_WIDTH  = 120;

// ── Props ──────────────────────────────────────────────────────────────────────

interface HebrewFullDatePickerProps {
  visible: boolean;
  /** Gregorian Date used to seed the initial Hebrew selection on open. */
  initialDate: Date;
  /** Called with the selected Gregorian Date when the user confirms. */
  onConfirm: (greg: Date) => void;
  onDismiss: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function HebrewFullDatePicker({
  visible,
  initialDate,
  onConfirm,
  onDismiss,
}: HebrewFullDatePickerProps) {
  // ── All hooks at the top, before any early return ──────────────────────────

  const colors = useThemeColors();

  const [selectedHYear,  setSelectedHYear]  = useState<number>(() => {
    const hd = dateService.getDayData(initialDate).hebrewDate;
    return hd.year ?? new HDate(initialDate).getFullYear();
  });
  const [selectedHMonth, setSelectedHMonth] = useState<number>(() => {
    return dateService.getDayData(initialDate).hebrewDate.month;
  });
  const [selectedHDay,   setSelectedHDay]   = useState<number>(() => {
    return dateService.getDayData(initialDate).hebrewDate.day;
  });

  // Re-seed from initialDate each time the picker opens.
  useEffect(() => {
    if (visible) {
      const hd = dateService.getDayData(initialDate).hebrewDate;
      setSelectedHYear(hd.year ?? new HDate(initialDate).getFullYear());
      setSelectedHMonth(hd.month);
      setSelectedHDay(hd.day);
    }
  }, [visible]); // intentionally omit initialDate — seed only on open, not on every prop change

  // Year range: initialDate's hYear ± 50 (101 entries). Built once at mount.
  const baseHYear = useMemo(
    () => {
      const hd = dateService.getDayData(initialDate).hebrewDate;
      return hd.year ?? new HDate(initialDate).getFullYear();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // fixed at mount — scroll range is centered on the date when the picker was first rendered
  );

  const years = useMemo(
    () => Array.from({ length: 101 }, (_, i) => baseHYear - 50 + i),
    [baseHYear],
  );

  // Month list for the currently selected year (Tishrei-first, 12 or 13 months).
  const monthList = useMemo(
    () => dateService.getHebrewMonthsForYear(selectedHYear),
    [selectedHYear],
  );

  // Days in the currently selected month.
  const daysInMonth = useMemo(
    () => dateService.getHebrewDaysInMonth(selectedHMonth, selectedHYear),
    [selectedHMonth, selectedHYear],
  );

  // ── Derived column data ────────────────────────────────────────────────────

  // Day items: 1..daysInMonth
  const dayItems = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => ({
      label: toHebrewNumeral(i + 1),
      value: i + 1,
    })),
    [daysInMonth],
  );
  const daySelectedIndex = Math.max(0, Math.min(selectedHDay - 1, daysInMonth - 1));

  // Month items
  const monthItems = monthList.map((m) => ({ label: m.nameHe, value: m.month }));
  const rawMonthIdx = monthList.findIndex((m) => m.month === selectedHMonth);
  const monthSelectedIndex = rawMonthIdx < 0 ? 0 : rawMonthIdx;

  // Year items
  const yearItems = years.map((y) => ({ label: toHebrewYear(y), value: y }));
  const rawYearIdx = years.indexOf(selectedHYear);
  const yearSelectedIndex = rawYearIdx < 0 ? 50 : rawYearIdx;

  // ── Gregorian-equivalent caption ───────────────────────────────────────────
  const gregLabel = useMemo(() => {
    try {
      const greg = new HDate(selectedHDay, selectedHMonth, selectedHYear).greg();
      return greg.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  }, [selectedHDay, selectedHMonth, selectedHYear]);

  // ── Index-change handlers ──────────────────────────────────────────────────

  const handleDayIndexChange = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, daysInMonth - 1));
    setSelectedHDay(clamped + 1);
  };

  const handleMonthIndexChange = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, monthList.length - 1));
    const newMonth = monthList[clamped].month;
    setSelectedHMonth(newMonth);
    // Clamp day if the new month has fewer days.
    const newDaysInMonth = dateService.getHebrewDaysInMonth(newMonth, selectedHYear);
    if (selectedHDay > newDaysInMonth) {
      setSelectedHDay(newDaysInMonth);
    }
  };

  const handleYearIndexChange = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, years.length - 1));
    const newYear = years[clamped];
    const newMonths = dateService.getHebrewMonthsForYear(newYear);
    setSelectedHYear(newYear);

    // Clamp month if it no longer exists in the new year (e.g. Adar II in a common year).
    let newMonth = selectedHMonth;
    if (!newMonths.some((m) => m.month === selectedHMonth)) {
      const prevPos = monthList.findIndex((m) => m.month === selectedHMonth);
      const pos = Math.min(prevPos < 0 ? 0 : prevPos, newMonths.length - 1);
      newMonth = newMonths[pos].month;
      setSelectedHMonth(newMonth);
    }

    // Clamp day to the new month length.
    const newDaysInMonth = dateService.getHebrewDaysInMonth(newMonth, newYear);
    if (selectedHDay > newDaysInMonth) {
      setSelectedHDay(newDaysInMonth);
    }
  };

  // ── Column descriptors for HebrewDateWheel ────────────────────────────────
  // columns[0] renders RIGHTMOST (row-reverse inside the wheel).
  // Order: [day, month, year] → day rightmost, month center, year leftmost.

  const columns = [
    {
      items: dayItems,
      selectedIndex: daySelectedIndex,
      onIndexChange: handleDayIndexChange,
      width: DAY_COLUMN_WIDTH,
    },
    {
      items: monthItems,
      selectedIndex: monthSelectedIndex,
      onIndexChange: handleMonthIndexChange,
      width: MONTH_COLUMN_WIDTH,
    },
    {
      items: yearItems,
      selectedIndex: yearSelectedIndex,
      onIndexChange: handleYearIndexChange,
      width: YEAR_COLUMN_WIDTH,
    },
  ];

  // ── Confirm handler ────────────────────────────────────────────────────────
  const handleConfirm = () => {
    try {
      const greg = new HDate(selectedHDay, selectedHMonth, selectedHYear).greg();
      onConfirm(greg);
    } catch {
      // Defensive: if HDate throws for an edge case, dismiss without calling back.
      onDismiss();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={s.overlay}>
        {/* Sibling-Pressable backdrop — NEVER a TouchableWithoutFeedback wrapping
            the drums (causes Android scroll-steal). JSX-first so it sits behind
            the sheet in the stacking order. */}
        <Pressable onPress={onDismiss} style={StyleSheet.absoluteFill} />

        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          {/* Drag handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Drum wheels — day (right), month (center), year (left) */}
          <HebrewDateWheel columns={columns} />

          {/* Gregorian-equivalent caption */}
          <Text style={[s.gregCaption, { color: colors.textTertiary }]}>
            {gregLabel}
          </Text>

          {/* Action buttons — row-reverse so אישור (confirm) is on the right */}
          <View style={s.buttonRow}>
            <Pressable
              onPress={handleConfirm}
              style={[s.btn, s.btnConfirm, { backgroundColor: colors.accent }]}
              accessibilityLabel="אישור"
              accessibilityRole="button"
            >
              <Text style={[s.btnText, { color: colors.textInverse }]}>אישור</Text>
            </Pressable>
            <Pressable
              onPress={onDismiss}
              style={[s.btn, s.btnCancel, { borderColor: colors.border }]}
              accessibilityLabel="ביטול"
              accessibilityRole="button"
            >
              <Text style={[s.btnText, { color: colors.textSecondary }]}>ביטול</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: overlay.modal,
  },

  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 36,
  },

  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  gregCaption: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },

  // row-reverse: אישור (confirm) renders on the right, ביטול (cancel) on the left
  buttonRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 16,
  },

  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnConfirm: {
    // backgroundColor set inline from colors.accent
  },

  btnCancel: {
    borderWidth: 1,
    // borderColor set inline from colors.border
  },

  btnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
