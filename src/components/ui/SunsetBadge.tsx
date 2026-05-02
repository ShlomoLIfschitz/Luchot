import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface Props {
  visible?: boolean;
}

export function SunsetBadge({ visible = true }: Props) {
  if (!visible) return null;
  return <Text style={styles.badge}>✶</Text>;
}

const styles = StyleSheet.create({
  badge: {
    fontSize: 8,
    color: '#C4A882',
  },
});
