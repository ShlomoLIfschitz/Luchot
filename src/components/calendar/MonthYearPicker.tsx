// src/components/calendar/MonthYearPicker.tsx

import React, { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { radius } from '../../constants/radius';
import { overlay } from '../../constants/overlay';
import { typography, withFontFamily } from '../../constants/typography';
import type { ThemeColors } from '../../hooks/useThemeColors';
import { toHebrewYear } from '../../services/DateService';

const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const MONTHS_PER_ROW = 3;

/** Splits `items` into consecutive groups of `size` (last group may be shorter). */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

interface Props {
  visible: boolean;
  currentYear: number;
  currentMonth: number;
  colors: ThemeColors;
  onSelect: (year: number, month: number) => void;
  onClose: () => void;
}

export function MonthYearPicker({ visible, currentYear, currentMonth, colors, onSelect, onClose }: Props) {
  const [pickerYear, setPickerYear] = useState(currentYear);

  const hebrewYearLabel = () => {
    // Show two possible Hebrew years for this Gregorian year
    const hYear1 = toHebrewYear(pickerYear + 3760);
    const hYear2 = toHebrewYear(pickerYear + 3761);
    return `${hYear1}-${hYear2}`;
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={pickerStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[pickerStyles.sheet, { backgroundColor: colors.surface }]}>
              {/* Year row */}
              <View style={pickerStyles.yearRow}>
                <Pressable onPress={() => setPickerYear(y => y + 1)} hitSlop={12} style={pickerStyles.yearArrow}>
                  <Text style={[pickerStyles.arrowText, { color: colors.accent }]}>‹</Text>
                </Pressable>
                <View style={pickerStyles.yearCenter}>
                  <Text style={[pickerStyles.yearGreg, { color: colors.textPrimary }]}>{pickerYear}</Text>
                  <Text style={[pickerStyles.yearHebrew, { color: colors.textSecondary }]}>{hebrewYearLabel()}</Text>
                </View>
                <Pressable onPress={() => setPickerYear(y => y - 1)} hitSlop={12} style={pickerStyles.yearArrow}>
                  <Text style={[pickerStyles.arrowText, { color: colors.accent }]}>›</Text>
                </Pressable>
              </View>

              {/* Months grid — plain 'row' + wrap, with the rendered array
                  pre-reversed (per-row chunks) so ינואר still lands top-right.
                  row-reverse + flexWrap is well-defined in the CSS spec, but
                  it was never verified against this Yoga version on-device;
                  reversing the array under plain 'row' gets the identical
                  visual result without depending on that interaction. See
                  ExportModal/HebrewDatePicker etc. for the row-reverse
                  convention used everywhere else — this is a narrow,
                  wrap-specific exception, not a general fallback. */}
              <View style={pickerStyles.monthGrid}>
                {chunk(MONTH_NAMES_HE.map((name, idx) => ({ name, idx })), MONTHS_PER_ROW).map((row, rowI) => (
                  <View key={rowI} style={pickerStyles.monthRow}>
                    {[...row].reverse().map(({ name, idx }) => {
                      const isSelected = pickerYear === currentYear && idx + 1 === currentMonth;
                      return (
                        <Pressable
                          key={idx}
                          style={[
                            pickerStyles.monthCell,
                            isSelected && { backgroundColor: colors.accent },
                          ]}
                          onPress={() => { onSelect(pickerYear, idx + 1); onClose(); }}
                          accessibilityRole="button"
                          accessibilityLabel={name}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text style={[
                            pickerStyles.monthText,
                            { color: isSelected ? colors.textInverse : colors.textPrimary },
                            isSelected && withFontFamily(typography.bodyMedium, '700'),
                          ]}>
                            {name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: overlay.modal, justifyContent: 'center', alignItems: 'center' },
  sheet: { width: 320, borderRadius: radius.xl, padding: 20, elevation: 10 },
  // Symmetric ‹ year › row — the chevrons encode their own direction; plain 'row' is correct here.
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  yearArrow: { padding: 8, minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  // '300' has no bundled Heebo static (only 400/500/600/700 are registered
  // — see resolveRegisteredWeight in typography.ts); nearest is '400'.
  arrowText: { ...withFontFamily(typography.displayLarge, '400') },
  yearCenter: { alignItems: 'center' },
  yearGreg: { ...withFontFamily(typography.displayMedium), textAlign: 'center' },
  yearHebrew: { ...withFontFamily(typography.bodySmall), marginTop: 2, textAlign: 'center' },
  // Column of rows — each row is plain 'row' over a pre-reversed array (see render comment above).
  monthGrid: { gap: 8 },
  monthRow: { flexDirection: 'row', gap: 8 },
  monthCell: {
    flex: 1, minHeight: 48, paddingVertical: 12, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  monthText: { ...withFontFamily(typography.bodyMedium) },
});
