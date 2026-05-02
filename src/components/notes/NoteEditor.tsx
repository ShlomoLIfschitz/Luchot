import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

/** Roadmap: full CRUD for calendar notes */
export function NoteEditor() {
  const colors = useThemeColors();
  return (
    <View style={styles.box}>
      <Text style={{ color: colors.textTertiary }}>עורך הערות — בהמשך</Text>
    </View>
  );
}

const styles = StyleSheet.create({ box: { padding: 12 } });
