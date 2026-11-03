// src/components/common/ScreenHeader.tsx
// Universal screen header — the one header every screen uses, built to the
// approved Figma frames (2026-11-03 parity pass):
//   [leading icon] ——— [title block, centred] ——— [jump-to-today | spacer]
// - Background `surface`, no bottom border (the border belongs to whatever
//   sits under the header: the weekday row, the week day-columns, …).
// - Leading: hamburger (tab screens) or a "‹" back glyph (stack screens).
// - Title block: a title plus an optional tertiary subtitle, above or below.
// - Trailing: the target icon (jump to today) when `onJumpToToday` is given,
//   otherwise an empty 24 px slot that keeps the title centred.
//
// The row is direction-neutral (symmetric 3 slots), so plain 'row' is
// correct here: the hamburger sits on the LEFT, where the drawer opens.
//
// Padding note: uses StatusBar.currentHeight for Android status-bar clearance.
// iOS: currentHeight is null → falls back to 0.

import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useDrawerStore } from '../../providers/DrawerProvider';
import { useThemeColors } from '../../hooks/useThemeColors';
import { typography, withFontFamily } from '../../constants/typography';
import { MenuIcon, TargetIcon } from '../icons/FigmaIcons';

/** Figma header paddings differ slightly per screen family. */
type HeaderVariant = 'month' | 'default' | 'week';

const VARIANT_PADDING: Record<HeaderVariant, { top: number; bottom: number }> = {
  month:   { top: 6, bottom: 12 },
  default: { top: 4, bottom: 12 },
  week:    { top: 4, bottom: 10 },
};

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Subtitle renders above the title (Day, Zmanim) instead of below it. */
  subtitleAbove?: boolean;
  /** Type step of the subtitle line; Figma uses 11, 12 or 13 Medium. */
  subtitleSize?: 'caption' | 'subtitle' | 'bodySmall';
  /** Week header: 17 Bold title instead of 19 Bold. */
  compactTitle?: boolean;
  leading?: 'menu' | 'back';
  variant?: HeaderVariant;
  /** Makes the title block tappable (opens a date / month picker). */
  onTitlePress?: () => void;
  titleAccessibilityLabel?: string;
  /** Shows the target icon on the right; tapping it jumps to today. */
  onJumpToToday?: () => void;
}

export function ScreenHeader({
  title,
  subtitle,
  subtitleAbove = false,
  subtitleSize = 'subtitle',
  compactTitle = false,
  leading = 'menu',
  variant = 'default',
  onTitlePress,
  titleAccessibilityLabel,
  onJumpToToday,
}: ScreenHeaderProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const openDrawer = useDrawerStore((s) => s.open);
  const pad = VARIANT_PADDING[variant];

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const subtitleNode = subtitle ? (
    <Text
      style={[
        withFontFamily(typography[subtitleSize], '500'),
        styles.centered,
        { color: colors.textTertiary },
      ]}
    >
      {subtitle}
    </Text>
  ) : null;

  const titleBlock = (
    <>
      {subtitleAbove && subtitleNode}
      <Text
        style={[
          compactTitle ? styles.titleCompact : styles.title,
          { color: colors.textPrimary },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {!subtitleAbove && subtitleNode}
    </>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          paddingTop: (StatusBar.currentHeight ?? 0) + pad.top,
          paddingBottom: pad.bottom,
        },
      ]}
    >
      {leading === 'menu' ? (
        <Pressable
          onPress={openDrawer}
          hitSlop={12}
          style={styles.iconSlot}
          accessibilityRole="button"
          accessibilityLabel="פתח תפריט"
        >
          <MenuIcon size={24} color={colors.textPrimary} />
        </Pressable>
      ) : (
        <Pressable
          onPress={goBack}
          hitSlop={12}
          style={styles.iconSlot}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
        >
          <Text style={[styles.backGlyph, { color: colors.textPrimary }]}>‹</Text>
        </Pressable>
      )}

      {onTitlePress ? (
        <Pressable
          onPress={onTitlePress}
          style={styles.titleBlock}
          accessibilityRole="button"
          accessibilityLabel={titleAccessibilityLabel ?? title}
        >
          {titleBlock}
        </Pressable>
      ) : (
        <View style={styles.titleBlock}>{titleBlock}</View>
      )}

      {onJumpToToday ? (
        <Pressable
          onPress={onJumpToToday}
          hitSlop={12}
          style={styles.iconSlot}
          accessibilityRole="button"
          accessibilityLabel="עבור להיום"
        >
          <TargetIcon size={24} color={colors.accent} />
        </Pressable>
      ) : (
        <View style={styles.iconSlot} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  // 24×24 like the Figma icon frames; hitSlop(12) brings the touch target to 48.
  iconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  title: {
    ...withFontFamily(typography.screenTitle),
    textAlign: 'center',
  },
  titleCompact: {
    ...withFontFamily(typography.cardTitle),
    textAlign: 'center',
  },
  centered: { textAlign: 'center' },
  backGlyph: {
    ...withFontFamily(typography.glyph),
    textAlign: 'center',
  },
});
