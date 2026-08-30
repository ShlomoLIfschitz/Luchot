import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';
import { typography, withFontFamily } from '../../constants/typography';

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
  // Nearest token: typography.captionBold (11/700/14) — fontSize delta 12→11
  // (1px), fontWeight delta 600→700. No 12px step exists in the scale.
  text: { ...withFontFamily(typography.captionBold) },
});
