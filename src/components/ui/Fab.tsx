// src/components/ui/Fab.tsx
// Quick-add floating action button — Figma: 56 px accent circle, white plus
// 24, bottom-LEFT (bottom-end in RTL) 16 px from the edge and 16 px above the
// tab bar. Used on the month, day and week screens.

import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';
import { elevation } from '../../constants/elevation';
import { PlusIcon } from '../icons/FigmaIcons';

export const FAB_SIZE = 56;

export function Fab({
  onPress,
  bottom = 16,
  accessibilityLabel = 'הוסף אירוע',
}: {
  onPress: () => void;
  /** Distance from the bottom of the parent (16 above the tab bar by default). */
  bottom?: number;
  accessibilityLabel?: string;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.fab, elevation.lg, { backgroundColor: colors.accent, bottom }]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <PlusIcon size={24} color={colors.textInverse} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    left: 16, // bottom-end in RTL = bottom-left
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
