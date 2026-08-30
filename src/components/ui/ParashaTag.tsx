import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';

interface Props {
  name: string;
}

export function ParashaTag({ name }: Props) {
  const colors = useThemeColors();
  return (
    <View style={[styles.tag, { backgroundColor: colors.accentLight }]}>
      <Text style={[styles.text, { color: colors.accent }]}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.md, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});
