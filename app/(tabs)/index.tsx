// app/(tabs)/index.tsx
// Phase 3.4 — Hebrew calendar tab. Primary tab per SCREENS.md.
// Phase 3.7a-1 — ScreenHeader added.

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MonthGrid } from '../../src/components/calendar/MonthGrid';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';

export default function HebrewCalendarScreen() {
  const colors = useThemeColors();
  const refreshHebrewMonth = useCalendarStore((s) => s.refreshHebrewMonth);

  // Populate initial Hebrew month data — store initialises with hebrewMonthData: [].
  useEffect(() => { refreshHebrewMonth(); }, [refreshHebrewMonth]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader />
      <MonthGrid mode="hebrew" />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
