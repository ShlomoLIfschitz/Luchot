// src/components/calendar/HebrewDatePicker.tsx
// Bottom-sheet modal hosting the Hebrew drum-wheel date picker.
// Slice 1: month + year selection only.

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { HDate } from '@hebcal/core';
import { dateService, toHebrewYear } from '../../services/DateService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';
import { overlay } from '../../constants/overlay';
import { typography, withFontFamily } from '../../constants/typography';
import { HebrewDateWheel } from './HebrewDateWheel';

// ── Column widths ──────────────────────────────────────────────────────────────

const MONTH_COLUMN_WIDTH = 140;
const YEAR_COLUMN_WIDTH  = 120;

// ── Types ──────────────────────────────────────────────────────────────────────

interface HebrewDatePickerProps {
  visible: boolean;
  initialHYear: number;
  initialHMonth: number;
  onConfirm: (hYear: number, hMonth: number) => void;
  onDismiss: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function HebrewDatePicker({
  visible,
  initialHYear,
  initialHMonth,
  onConfirm,
  onDismiss,
}: HebrewDatePickerProps) {
  // ── All hooks at the top, before any early return ──────────────────────────

  const colors = useThemeColors();

  const [selectedHYear, setSelectedHYear]   = useState(initialHYear);
  const [selectedHMonth, setSelectedHMonth] = useState(initialHMonth);

  // Re-sync from props when the modal (re)opens
  useEffect(() => {
    if (visible) {
      setSelectedHYear(initialHYear);
      setSelectedHMonth(initialHMonth);
    }
  }, [visible, initialHYear, initialHMonth]);

  // Year range: initialHYear ± 50 (101 entries). Built once from initialHYear.
  const years = useMemo(
    () => Array.from({ length: 101 }, (_, i) => initialHYear - 50 + i),
    [initialHYear],
  );

  // Month list for the currently selected year (Tishrei-first, 12 or 13 months)
  const monthList = useMemo(
    () => dateService.getHebrewMonthsForYear(selectedHYear),
    [selectedHYear],
  );

  // ── Derived column data ────────────────────────────────────────────────────

  const monthItems = monthList.map((m) => ({ label: m.nameHe, value: m.month }));
  const rawMonthIdx = monthList.findIndex((m) => m.month === selectedHMonth);
  const monthSelectedIndex = rawMonthIdx < 0 ? 0 : rawMonthIdx;

  const yearItems = years.map((y) => ({ label: toHebrewYear(y), value: y }));
  const rawYearIdx = years.indexOf(selectedHYear);
  const yearSelectedIndex = rawYearIdx < 0 ? 50 : rawYearIdx;

  // ── Gregorian-equivalent caption ───────────────────────────────────────────
  // Use the 15th of the selected Hebrew month as a representative midpoint.
  const gregLabel = useMemo(() => {
    try {
      const greg = new HDate(15, selectedHMonth, selectedHYear).greg();
      return greg.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    } catch {
      return '';
    }
  }, [selectedHMonth, selectedHYear]);

  // ── Index-change handlers ──────────────────────────────────────────────────

  const handleMonthIndexChange = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, monthList.length - 1));
    setSelectedHMonth(monthList[clamped].month);
  };

  const handleYearIndexChange = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, years.length - 1));
    const newYear = years[clamped];
    const newMonths = dateService.getHebrewMonthsForYear(newYear);
    setSelectedHYear(newYear);
    // Clamp month if it no longer exists in the new year (e.g. Adar II=13
    // was selected but the new year is common — no month 13).
    if (!newMonths.some((m) => m.month === selectedHMonth)) {
      const prevPos = monthList.findIndex((m) => m.month === selectedHMonth);
      const pos = Math.min(prevPos < 0 ? 0 : prevPos, newMonths.length - 1);
      setSelectedHMonth(newMonths[pos].month);
    }
  };

  // ── Column descriptors passed to HebrewDateWheel ──────────────────────────
  // columns[0] = month (renders RIGHTMOST under row-reverse)
  // columns[1] = year  (renders to the left of month)

  const columns = [
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={s.overlay}>
        {/* Sibling-Pressable backdrop — NEVER a TouchableWithoutFeedback
            wrapping the drums (causes Android scroll-steal). JSX-first so it
            sits behind the sheet in the stacking order. */}
        <Pressable onPress={onDismiss} style={StyleSheet.absoluteFill} />

        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          {/* Drag handle */}
          <View style={[s.handle, { backgroundColor: colors.border }]} />

          {/* Drum wheels — month (right) + year (left) */}
          <HebrewDateWheel columns={columns} />

          {/* Gregorian-equivalent caption */}
          <Text style={[s.gregCaption, { color: colors.textTertiary }]}>
            {gregLabel}
          </Text>

          {/* Action buttons — row-reverse so אישור (confirm) is on the right */}
          <View style={s.buttonRow}>
            <Pressable
              onPress={() => onConfirm(selectedHYear, selectedHMonth)}
              style={[s.btn, s.btnConfirm, { backgroundColor: colors.accent }]}
              accessibilityLabel="אישור"
              accessibilityRole="button"
            >
              <Text style={[s.btnText, { color: colors.textInverse }]}>אישור</Text>
            </Pressable>
            <Pressable
              onPress={onDismiss}
              style={[s.btn, s.btnCancel, { backgroundColor: colors.surfaceElevated }]}
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
    width: 38,
    height: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
    marginBottom: 16,
  },

  gregCaption: {
    ...withFontFamily(typography.bodySmall),
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
    minHeight: 48,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnConfirm: {
    // backgroundColor set inline from colors.accent
  },

  btnCancel: {
    // backgroundColor set inline from colors.surfaceElevated
  },

  btnText: {
    ...withFontFamily(typography.bodyMedium, '600'),
  },
});
