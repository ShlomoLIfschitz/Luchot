// src/constants/elevation.ts
// Shadow / elevation tokens — matches docs/DESIGN.md Elevation section.
// Flat design preferred; use sparingly. Each step is a ready-to-spread
// ViewStyle fragment for StyleSheet.create.

import type { ViewStyle } from 'react-native';

interface ElevationStyle {
  shadowColor: ViewStyle['shadowColor'];
  shadowOffset: ViewStyle['shadowOffset'];
  shadowOpacity: ViewStyle['shadowOpacity'];
  shadowRadius: ViewStyle['shadowRadius'];
  elevation: ViewStyle['elevation'];
}

export const elevation = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    // Selected day cell, slight lift
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    // Cards, modals
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    // Floating buttons (FAB)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} satisfies Record<string, ElevationStyle>;

export type Elevation = typeof elevation;
export type ElevationKey = keyof Elevation;
