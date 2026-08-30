// src/components/icons/CandleIcon.tsx
// Two-candle silhouette icon for Friday candle-lighting indicator in DayCell.
// viewBox 0 0 24 18 — scales cleanly at small sizes.

import React from 'react';
import Svg, { Rect, Path } from 'react-native-svg';
import { useThemeColors } from '../../hooks/useThemeColors';

interface Props {
  width?: number;
  height?: number;
  color?: string;
}

export default function CandleIcon({ width = 16, height = 12, color }: Props) {
  // Default from the theme (honors dark mode) when the caller doesn't pass
  // an explicit color; previously hardcoded '#E8A33D' which duplicated
  // Colors.light.candle and silently ignored dark mode.
  const themeColors = useThemeColors();
  const resolvedColor = color ?? themeColors.candle;
  return (
    <Svg width={width} height={height} viewBox="0 0 24 18">
      {/* Tray — rounded horizontal base spanning full width */}
      <Rect x="0" y="15" width="24" height="3" rx="1.5" fill={resolvedColor} />

      {/* Left candle body */}
      <Rect x="3" y="7" width="7" height="8" rx="0.5" fill={resolvedColor} />

      {/* Right candle body — slightly shorter for natural variation */}
      <Rect x="14" y="9" width="6" height="6" rx="0.5" fill={resolvedColor} />

      {/* Left wick */}
      <Rect x="6" y="5.5" width="1" height="1.5" rx="0.25" fill={resolvedColor} />

      {/* Right wick */}
      <Rect x="16.5" y="7.5" width="1" height="1.5" rx="0.25" fill={resolvedColor} />

      {/* Left flame — teardrop, centered at x=6.5 */}
      <Path d="M 6.5 1 Q 10 3.5 6.5 5.5 Q 3 3.5 6.5 1 Z" fill={resolvedColor} />

      {/* Right flame — teardrop, centered at x=17 */}
      <Path d="M 17 3 Q 20.5 5.5 17 7.5 Q 13.5 5.5 17 3 Z" fill={resolvedColor} />

      {/* Inner flame highlights — white at 40% opacity for depth */}
      <Path d="M 6.5 2 Q 8.5 3.8 6.5 5 Q 4.5 3.8 6.5 2 Z" fill="rgba(255,255,255,0.4)" />
      <Path d="M 17 4 Q 19 5.8 17 7 Q 15 5.8 17 4 Z" fill="rgba(255,255,255,0.4)" />
    </Svg>
  );
}
