// app/(tabs)/gregorian.tsx
// Phase 3.4 — Gregorian calendar tab.
// Phase 3.7a-1 — ScreenHeader added.
// Redesign (Task 2b) — ScreenHeader removed; MonthGrid now renders its own
// merged header (hamburger + title + jump-to-today) so there is exactly one
// header row instead of a duplicate/empty one stacked above the arrows-header.

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
