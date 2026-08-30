// src/components/ui/Card.tsx
// Generic card-grouping container used by settings.tsx, locationPicker.tsx,
// and details.tsx (redesign). Auto-injects `isLast` into row children so
// conditionally-rendered rows (e.g. `{cond && <Row ... />}`, which
// React.Children.toArray drops entirely when `cond` is false) never leave a
// stray hairline on what is actually the last visible row.
//
// Row components used inside a Card should accept an optional `isLast?:
// boolean` prop and render their own bottom hairline only when it is false.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { radius } from '../../constants/radius';
import type { ThemeColors } from '../../hooks/useThemeColors';

interface IsLastProp {
  isLast?: boolean;
}

export function Card({
  children,
  colors,
}: {
  children: React.ReactNode;
  colors: ThemeColors;
}) {
  const items = React.Children.toArray(children);
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
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
    marginHorizontal: 16,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
