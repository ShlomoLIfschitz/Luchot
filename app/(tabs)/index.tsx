import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MonthGrid } from '../../src/components/calendar/MonthGrid';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';

export default function MonthScreen() {
  const colors = useThemeColors();
  const refreshMonth = useCalendarStore((s) => s.refreshMonth);
  useEffect(() => {
    refreshMonth();
  }, [refreshMonth]);
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MonthGrid />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
