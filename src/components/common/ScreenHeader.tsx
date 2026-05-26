// src/components/common/ScreenHeader.tsx
// Universal screen header. Currently minimal — hamburger button + optional title.
// A richer version (with universal date display) is post-MVP (Phase 3.7c).
//
// Padding note: uses StatusBar.currentHeight for Android status-bar clearance.
// iOS: currentHeight is null → falls back to 0. Safe area handling via
// SafeAreaProvider at the root covers iOS notches separately.

import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { Menu } from 'lucide-react-native';
import { useDrawerStore } from '../../providers/DrawerProvider';
import { useThemeColors } from '../../hooks/useThemeColors';

interface ScreenHeaderProps {
  title?: string;
}

export function ScreenHeader({ title }: ScreenHeaderProps) {
  const colors = useThemeColors();
  const openDrawer = useDrawerStore((s) => s.open);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingTop: (StatusBar.currentHeight ?? 0) + 8,
        },
      ]}
    >
      <Pressable
        onPress={openDrawer}
        hitSlop={12}
        style={styles.menuButton}
        accessibilityLabel="פתח תפריט"
      >
        <Menu size={24} color={colors.textPrimary} />
      </Pressable>

      {title ? (
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
      ) : null}

      {/* Right-side spacer keeps the title visually centred when present.
          Reserved for a "today" shortcut button in Phase 3.7c. */}
      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  rightSpacer: {
    width: 32, // matches menuButton area (24px icon + 4px padding each side) for centred title
  },
});
