// src/components/converter/ConverterField.tsx
// One input of the date converter (Figma `converter/field`): a label above
// a 48px box. Day and month are pressable boxes that open a picker sheet
// (chevron shown); the year is a numeric TextInput (no chevron).

import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { typography, withFontFamily } from '../../constants/typography';
import type { ThemeColors } from '../../hooks/useThemeColors';

interface BaseProps {
  label: string;
  colors: ThemeColors;
  /** Fixed width; omit to flex across the remaining row width. */
  width?: number;
}

interface PickerFieldProps extends BaseProps {
  value: string;
  onPress: () => void;
}

export function PickerField({ label, value, onPress, colors, width }: PickerFieldProps) {
  return (
    <View style={[styles.field, width ? { width } : styles.flex]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={[styles.box, { backgroundColor: colors.background, borderColor: colors.border }]}
      >
        {/* row-reverse: value on the right, chevron on the left */}
        <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
          {value}
        </Text>
        <ChevronDown size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

interface YearFieldProps extends BaseProps {
  value: string;
  onChangeText: (text: string) => void;
  error: boolean;
}

export function YearField({ label, value, onChangeText, error, colors, width }: YearFieldProps) {
  return (
    <View style={[styles.field, width ? { width } : styles.flex]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View
        style={[
          styles.box,
          { backgroundColor: colors.background, borderColor: colors.border },
          error && { borderColor: colors.error, borderWidth: 1.5 },
        ]}
      >
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={4}
          accessibilityLabel={label}
          style={[styles.value, styles.input, { color: colors.textPrimary }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: 6 },
  label: {
    // Figma: 12 Medium / 17.
    ...withFontFamily(typography.subtitle),
    lineHeight: 17,
    textAlign: 'right',
  },
  box: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  value: {
    // Figma: 16 Medium / 24.
    ...withFontFamily(typography.emphasis),
    lineHeight: 24,
    flex: 1,
    textAlign: 'right',
  },
  input: { padding: 0, height: 24 },
});
