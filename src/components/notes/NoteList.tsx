import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import type { CalendarNote } from '../../hooks/useNotes';

interface Props {
  notes: CalendarNote[];
  date: Date;
}

export function NoteList({ notes }: Props) {
  const colors = useThemeColors();
  if (notes.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={{ color: colors.textTertiary }}>אין הערות ליום זה</Text>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      {notes.map((n) => (
        <Text key={n.id} style={{ color: colors.textPrimary }}>{n.summary}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ section: { marginVertical: 12 } });
