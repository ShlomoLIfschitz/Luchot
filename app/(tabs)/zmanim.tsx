// app/(tabs)/zmanim.tsx
// Phase 3.4 — Zmanim tab. Placeholder until Phase 3.6 implements the full ZmanimScreen.

import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../src/hooks/useThemeColors';

export default function ZmanimScreen() {
  const colors = useThemeColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>זמנים</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        זמני היום — בקרוב (שלב 3.6)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { fontSize: 22, fontWeight: '700' },
  sub:   { fontSize: 14 },
});
