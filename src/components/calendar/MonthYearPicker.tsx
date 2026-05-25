// src/components/calendar/MonthYearPicker.tsx

import React, { useState } from 'react';
import {
  Modal, View, Text, Pressable, StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import type { ThemeColors } from '../../hooks/useThemeColors';
import { toHebrewYear } from '../../services/DateService';

const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

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
                <Pressable onPress={() => setPickerYear(y => y - 1)} hitSlop={12} style={pickerStyles.yearArrow}>
                  <Text style={[pickerStyles.arrowText, { color: colors.accent }]}>‹</Text>
                </Pressable>
                <View style={pickerStyles.yearCenter}>
                  <Text style={[pickerStyles.yearGreg, { color: colors.textPrimary }]}>{pickerYear}</Text>
                  <Text style={[pickerStyles.yearHebrew, { color: colors.textSecondary }]}>{hebrewYearLabel()}</Text>
                </View>
                <Pressable onPress={() => setPickerYear(y => y + 1)} hitSlop={12} style={pickerStyles.yearArrow}>
                  <Text style={[pickerStyles.arrowText, { color: colors.accent }]}>›</Text>
                </Pressable>
              </View>

              {/* Months grid */}
              <View style={pickerStyles.monthGrid}>
                {MONTH_NAMES_HE.map((name, idx) => {
                  const isSelected = pickerYear === currentYear && idx + 1 === currentMonth;
                  return (
                    <Pressable
                      key={idx}
                      style={[
                        pickerStyles.monthCell,
                        isSelected && { backgroundColor: colors.accent },
                      ]}
                      onPress={() => { onSelect(pickerYear, idx + 1); onClose(); }}
                    >
                      <Text style={[
                        pickerStyles.monthText,
                        { color: isSelected ? colors.textInverse : colors.textPrimary },
                        isSelected && { fontWeight: '700' },
                      ]}>
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  sheet: { width: 320, borderRadius: 20, padding: 20, elevation: 10 },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  yearArrow: { padding: 8 },
  arrowText: { fontSize: 30, fontWeight: '300' },
  yearCenter: { alignItems: 'center' },
  yearGreg: { fontSize: 22, fontWeight: '700' },
  yearHebrew: { fontSize: 13, marginTop: 2 },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthCell: {
    width: '30%', paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    flexGrow: 1,
  },
  monthText: { fontSize: 14 },
});
