// app/(tabs)/day.tsx
// Phase 3.4 — Day view tab. Placeholder until Phase 3.5 implements the full DayScreen.

import { View, Text, StyleSheet } from 'react-native';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';

export default function DayScreen() {
  const colors = useThemeColors();
  const selectedDate = useCalendarStore((s) => s.selectedDate);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {selectedDate.toLocaleDateString('he-IL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        פרטי יום — בקרוב (שלב 3.5)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  sub:   { fontSize: 14 },
});
