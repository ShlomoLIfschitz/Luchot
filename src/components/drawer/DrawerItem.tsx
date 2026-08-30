// src/components/drawer/DrawerItem.tsx
// Single row inside the hamburger drawer.
// DrawerIcon is a generic shape that accepts any Lucide icon (or any future
// icon library) without importing a library-specific type.

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';
import { typography, withFontFamily } from '../../constants/typography';

// DrawerIcon uses ComponentType<any> because Lucide icons extend SvgProps
// whose size/strokeWidth accept string | number and color accepts
// ColorValue (which includes OpaqueColorValue, not just string). Narrowing
// the type creates an incompatible propTypes chain across several React
// Native SVG types. ComponentType<any> is the de-facto pattern for
// "renderable icon component" props in React Native (mirrors Icon: any
// in QuickActionSheet). All call sites pass known Lucide icons so runtime
// safety is preserved.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrawerIcon = React.ComponentType<any>;

interface DrawerItemProps {
  Icon: DrawerIcon;
  label: string;
  onPress: () => void;
  active?: boolean;
}

export function DrawerItem({ Icon, label, onPress, active = false }: DrawerItemProps) {
  const colors = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: active
            ? colors.accentLight
            : pressed
              ? colors.surfaceElevated
              : 'transparent',
        },
      ]}
    >
      {/* icon — JSX-first = rightmost (row-reverse), the reading start */}
      <Icon
        size={22}
        color={active ? colors.accent : colors.textSecondary}
      />
      {/* label — JSX-last = flex:1, fills toward the left */}
      <Text
        style={[
          styles.label,
          withFontFamily(typography.bodyLarge, active ? '700' : '500'),
          {
            color: active ? colors.accent : colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    marginVertical: 2,
  },
  label: {
    flex: 1,
    textAlign: 'right',
    ...withFontFamily(typography.bodyLarge),
  },
});
