// app/(tabs)/index.tsx
// Phase 3.4 — Hebrew calendar tab. Primary tab per SCREENS.md.

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MonthGrid } from '../../src/components/calendar/MonthGrid';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';

export default function HebrewCalendarScreen() {
  const colors = useThemeColors();
  const refreshMonth = useCalendarStore((s) => s.refreshMonth);

  // Populate initial month data — store initialises with monthData: [].
  useEffect(() => { refreshMonth(); }, [refreshMonth]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MonthGrid mode="hebrew" />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
