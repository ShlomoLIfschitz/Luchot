// app/(tabs)/gregorian.tsx
// Phase 3.4 — Gregorian calendar tab.

import { View, StyleSheet } from 'react-native';
import { MonthGrid } from '../../src/components/calendar/MonthGrid';
import { useThemeColors } from '../../src/hooks/useThemeColors';

export default function GregorianCalendarScreen() {
  const colors = useThemeColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MonthGrid mode="gregorian" />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
