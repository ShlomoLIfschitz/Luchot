import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

export function WeekRow() {
  const colors = useThemeColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.textSecondary }}>תצוגה שבועית — בקרוב</Text>
    </View>
  );
}

const styles = StyleSheet.create({ center: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
