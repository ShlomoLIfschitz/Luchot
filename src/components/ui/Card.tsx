// src/components/ui/Card.tsx
// Generic card-grouping container used by settings.tsx, locationPicker.tsx,
// zmanim and day.tsx. Auto-injects `isLast` into row children so
// conditionally-rendered rows (e.g. `{cond && <Row ... />}`, which
// React.Children.toArray drops entirely when `cond` is false) never leave a
// stray hairline on what is actually the last visible row.
//
// Row components used inside a Card should accept an optional `isLast?:
// boolean` prop and render their own bottom hairline only when it is false.
//
// Figma (2026-11-03 parity pass): 1 px `border` stroke, radius 14 (12 on the
// location picker), `surface` fill. `inset` is the horizontal margin: 16 on
// screens whose content has no padding of its own, 0 inside a padded column.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { radius as radiusTokens } from '../../constants/radius';
import type { ThemeColors } from '../../hooks/useThemeColors';

interface IsLastProp {
  isLast?: boolean;
}

export function Card({
  children,
  colors,
  inset = 16,
  radius = radiusTokens.card,
}: {
  children: React.ReactNode;
  colors: ThemeColors;
  inset?: number;
  radius?: number;
}) {
  const items = React.Children.toArray(children);
  return (
    <View
      style={[
        styles.card,
        { borderColor: colors.border, backgroundColor: colors.surface, marginHorizontal: inset, borderRadius: radius },
      ]}
    >
      {items.map((child, idx) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<IsLastProp>,
              { isLast: idx === items.length - 1 },
            )
          : child,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
  },
});
