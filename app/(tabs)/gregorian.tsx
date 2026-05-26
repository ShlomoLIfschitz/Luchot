// app/(tabs)/gregorian.tsx
// Phase 3.4 — Gregorian calendar tab.
// Phase 3.7a-1 — ScreenHeader added.

import { View, StyleSheet } from 'react-native';
import { MonthGrid } from '../../src/components/calendar/MonthGrid';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';

export default function GregorianCalendarScreen() {
  const colors = useThemeColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader />
      <MonthGrid mode="gregorian" />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
