// src/components/icons/FigmaIcons.tsx
// The icon set drawn in the approved Figma file ("Luchot — Design System &
// Screens"). Figma builds every icon from plain rectangles and ellipses, so
// each one is reproduced here from the frame's own geometry (x, y, width,
// height, radius, 1.6 px stroke) in that icon's native box. The SVG viewBox
// is the native box, so the icon scales to any `size` and the stroke scales
// with it, exactly as Figma scales the frame.

import React from 'react';
import Svg, { Rect, Ellipse, Path } from 'react-native-svg';
import { Settings } from 'lucide-react-native';

interface IconProps {
  size?: number;
  color: string;
}

type Shape =
  | { k: 'r'; x: number; y: number; w: number; h: number; r?: number; stroke?: number }
  | { k: 'e'; x: number; y: number; w: number; h: number; stroke?: number };

function makeIcon(box: number, shapes: Shape[]) {
  return function FigmaIcon({ size = box, color }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${box} ${box}`}>
        {shapes.map((s, i) => {
          const paint = s.stroke
            ? { fill: 'none', stroke: color, strokeWidth: s.stroke }
            : { fill: color };
          // Figma strokes are centred on the shape's edge, same as SVG.
          return s.k === 'r' ? (
            <Rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 0} {...paint} />
          ) : (
            <Ellipse key={i} cx={s.x + s.w / 2} cy={s.y + s.h / 2} rx={s.w / 2} ry={s.h / 2} {...paint} />
          );
        })}
      </Svg>
    );
  };
}

// ── Header ───────────────────────────────────────────────────────────────────
export const MenuIcon = makeIcon(24, [
  { k: 'r', x: 3, y: 5, w: 17, h: 2, r: 1 },
  { k: 'r', x: 3, y: 11, w: 17, h: 2, r: 1 },
  { k: 'r', x: 3, y: 17, w: 17, h: 2, r: 1 },
]);

/** Jump-to-today: two concentric rings. */
export const TargetIcon = makeIcon(24, [
  { k: 'e', x: 3.3, y: 3.3, w: 17.5, h: 17.5, stroke: 1.6 },
  { k: 'e', x: 8.7, y: 8.7, w: 6.5, h: 6.5, stroke: 1.6 },
]);

export const PlusIcon = makeIcon(24, [
  { k: 'r', x: 11, y: 4, w: 2, h: 15, r: 1 },
  { k: 'r', x: 4, y: 11, w: 15, h: 2, r: 1 },
]);

// ── Bottom tab bar (22 px box) ──────────────────────────────────────────────
export const ClockIcon = makeIcon(22, [
  { k: 'e', x: 2, y: 2, w: 18, h: 18, stroke: 1.6 },
  { k: 'r', x: 10, y: 6, w: 1.2, h: 6, r: 1 },
  { k: 'r', x: 10, y: 11, w: 5, h: 1.2, r: 1 },
]);

/** יום tab: a page with two text lines. */
export const DayPageIcon = makeIcon(22, [
  { k: 'r', x: 2, y: 3, w: 18, h: 17, r: 3, stroke: 1.6 },
  { k: 'r', x: 5, y: 8, w: 12, h: 1.2 },
  { k: 'r', x: 5, y: 12, w: 8, h: 1.2 },
]);

/** עברי tab / Settings / Note editor: calendar with a header line. */
export const CalendarIcon = makeIcon(22, [
  { k: 'r', x: 2, y: 4, w: 18, h: 16, r: 3, stroke: 1.6 },
  { k: 'r', x: 6, y: 1, w: 2, h: 5, r: 1 },
  { k: 'r', x: 14, y: 1, w: 2, h: 5, r: 1 },
  { k: 'r', x: 2, y: 9, w: 18, h: 1.2 },
]);

/** לועזי tab: calendar with one marked day. */
export const CalendarDayIcon = makeIcon(22, [
  { k: 'r', x: 2, y: 4, w: 18, h: 16, r: 3, stroke: 1.6 },
  { k: 'r', x: 6, y: 1, w: 2, h: 5, r: 1 },
  { k: 'r', x: 14, y: 1, w: 2, h: 5, r: 1 },
  { k: 'r', x: 5, y: 12, w: 4, h: 4, r: 1 },
]);

// ── Drawer (21 px box) ──────────────────────────────────────────────────────
export const WeekIcon = makeIcon(21, [
  { k: 'r', x: 1.9, y: 3.8, w: 17.2, h: 15.3, r: 3, stroke: 1.6 },
  { k: 'r', x: 7.6, y: 7.6, w: 1.3, h: 9.5 },
  { k: 'r', x: 12.9, y: 7.6, w: 1.3, h: 9.5 },
]);

/** Two filled pages — drawer "לימוד יומי" and every Details badge. */
export const BookIcon = makeIcon(21, [
  { k: 'r', x: 2.9, y: 2.9, w: 7.2, h: 16.2, r: 2 },
  { k: 'r', x: 11.5, y: 2.9, w: 6.7, h: 16.2, r: 2 },
]);

export const ShareIcon = makeIcon(21, [
  { k: 'e', x: 2.9, y: 7.6, w: 5.7, h: 5.7, stroke: 1.6 },
  { k: 'e', x: 12.4, y: 2.9, w: 5.7, h: 5.7, stroke: 1.6 },
  { k: 'e', x: 12.4, y: 12.4, w: 5.7, h: 5.7, stroke: 1.6 },
]);

/** Settings: a real cog (lucide `Settings`), not Figma's two concentric
 *  circles, which read as the jump-to-today target. Shlomo, 2026-11-03.
 *  Stroke 1.6 in the 21 box, like the other drawer icons. */
export function GearIcon({ size = 21, color }: IconProps) {
  return <Settings size={size} color={color} strokeWidth={(1.6 * 24) / 21} />;
}

export const InfoIcon = makeIcon(21, [
  { k: 'e', x: 1.9, y: 1.9, w: 17.2, h: 17.2, stroke: 1.6 },
  { k: 'r', x: 9.7, y: 8.6, w: 1.5, h: 6.7, r: 1 },
  { k: 'r', x: 9.7, y: 5.3, w: 1.5, h: 1.9, r: 1 },
]);

// ── Rows, cards, fields ─────────────────────────────────────────────────────
/** GPS crosshair (location picker button, zmanim source badge). */
export const GpsIcon = makeIcon(19, [
  { k: 'e', x: 3.5, y: 3.5, w: 12.1, h: 12.1, stroke: 1.8 },
  { k: 'e', x: 8.3, y: 8.3, w: 2.6, h: 2.6 },
  { k: 'r', x: 8.8, y: 0.4, w: 1.4, h: 3.5, r: 1 },
  { k: 'r', x: 8.8, y: 15.1, w: 1.4, h: 3.5, r: 1 },
  { k: 'r', x: 0.4, y: 8.8, w: 3.5, h: 1.4, r: 1 },
  { k: 'r', x: 15.1, y: 8.8, w: 3.5, h: 1.4, r: 1 },
]);

export const SearchIcon = makeIcon(17, [
  { k: 'e', x: 2.3, y: 2.3, w: 10, h: 10, stroke: 1.6 },
  { k: 'r', x: 10.8, y: 10.8, w: 4.6, h: 1.4, r: 1 },
]);

export const PinIcon = makeIcon(18, [
  { k: 'e', x: 4.9, y: 2, w: 8.2, h: 8.2, stroke: 1.8 },
  { k: 'e', x: 7.8, y: 4.9, w: 3.3, h: 3.3 },
  { k: 'r', x: 8.3, y: 10.6, w: 1.3, h: 5.3, r: 1 },
]);

export const RowClockIcon = makeIcon(19, [
  { k: 'e', x: 1.7, y: 1.7, w: 15.5, h: 15.5, stroke: 1.6 },
  { k: 'r', x: 8.8, y: 5.2, w: 1.2, h: 5.2, r: 1 },
  { k: 'r', x: 8.8, y: 9.2, w: 4.3, h: 1.2, r: 1 },
]);

/** Bell: dome (top corners only rounded), rim, clapper. */
export function BellIcon({ size = 19, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 19 19">
      <Path
        d="M4.3 13 V8.7 A5.2 5.2 0 0 1 14.7 8.7 V13"
        fill="none"
        stroke={color}
        strokeWidth={1.6}
      />
      <Rect x={3} y={13} width={13} height={1.4} rx={1} fill={color} />
      <Rect x={8.3} y={15.1} width={2.4} height={1.9} rx={1} fill={color} />
    </Svg>
  );
}

/** Day screen parasha card: two pages, back page at 35 %, front at 90 %. */
export function ParashaBookIcon({ size = 26, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 26 26">
      <Rect x={3} y={4} width={9} height={19} rx={2} fill={color} opacity={0.35} />
      <Rect x={14} y={4} width={9} height={19} rx={2} fill={color} opacity={0.9} />
    </Svg>
  );
}

/** Day screen Shabbat card: a candle (borderStrong body, candle-colour flame). */
export function CandleFlameIcon({ size = 20, bodyColor, flameColor }: {
  size?: number;
  bodyColor: string;
  flameColor: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Rect x={8.4} y={7.3} width={3.3} height={10} rx={1.4} fill={bodyColor} />
      <Ellipse cx={10} cy={4.8} rx={1.8} ry={2.5} fill={flameColor} />
    </Svg>
  );
}
