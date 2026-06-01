// src/components/calendar/DayCell.tsx
// Presentational v2 component — per docs/SCREENS.md and docs/DESIGN.md.
// Does NOT manage tap state, selection logic, or know about Hebrew/Gregorian mode.
// All interaction logic lives in the parent (MonthGrid).

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import CandleIcon from '../icons/CandleIcon';
import { radius } from '../../constants/radius';

// ── Cell height — per docs/DESIGN.md ──────────────────────────────────────────
const CELL_HEIGHT = 110; // px, locked per DESIGN.md spec

// ── Types ─────────────────────────────────────────────────────────────────────

/** Must match the 5 token categories in colors.ts */
export type TagCategory = 'holiday' | 'shabbat' | 'special' | 'event' | 'personal';

export interface DayCellTag {
  category: TagCategory;
  label: string; // displayed text, max ~12 chars practical
}

export interface DayCellProps {
  // Date display
  primaryLabel: string;   // e.g. "כ״ז" or "14" — large, top, writing-direction start
  secondaryLabel: string; // e.g. "14" or "כ״ז" — small, opposite corner

  // State
  isToday: boolean;    // 2px today border + todayBg tint
  isSelected: boolean; // 2px selected border + selectedBg tint
  isShabbat: boolean;  // subtle purple bg tint
  isHoliday: boolean;  // subtle green bg tint
  isFriday: boolean;   // show candle icon opposite primary label
  isEmpty?: boolean;   // padding day from prev/next month — render transparent placeholder

  // Content
  tags: DayCellTag[]; // 0 or more; component slices to 2 visible + +N overflow

  // Interaction — parent owns all logic; parent should useCallback these
  onPress: () => void;
  onLongPress: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

function DayCellInner({
  primaryLabel,
  secondaryLabel,
  isToday,
  isSelected,
  isShabbat,
  isHoliday,
  isFriday,
  isEmpty,
  tags,
  onPress,
  onLongPress,
}: DayCellProps) {
  const colors = useThemeColors();

  // Empty cell — transparent placeholder occupying grid space, no interaction
  if (isEmpty) {
    return <View style={styles.emptyCell} />;
  }

  // ── Border resolution (priority: selected > today > default) ───────────────
  const borderColor = isSelected
    ? colors.selected
    : isToday
    ? colors.today
    : colors.borderSubtle;
  const borderWidth = isSelected || isToday ? 2 : 0.5;

  // ── Background resolution (priority: selected > today > holiday > shabbat > default) ─
  const backgroundColor = isSelected
    ? colors.selectedBg
    : isToday
    ? colors.todayBg
    : isHoliday
    ? colors.tagHolidayBg
    : isShabbat
    ? colors.tagShabbatBg
    : colors.surface;

  // ── Tag color map — type-safe, avoids template literal string indexing ─────
  const TAG_COLORS: Record<TagCategory, { bg: string; fg: string }> = {
    holiday:  { bg: colors.tagHolidayBg,  fg: colors.tagHoliday  },
    shabbat:  { bg: colors.tagShabbatBg,  fg: colors.tagShabbat  },
    special:  { bg: colors.tagSpecialBg,  fg: colors.tagSpecial  },
    event:    { bg: colors.tagEventBg,    fg: colors.tagEvent    },
    personal: { bg: colors.tagPersonalBg, fg: colors.tagPersonal },
  };

  // ── Tags slicing ───────────────────────────────────────────────────────────
  const visibleTags = tags.slice(0, 2);
  const overflowCount = Math.max(0, tags.length - 2);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350} // RN sweet spot for distinguishing tap vs long-press
      style={[
        styles.cell,
        { backgroundColor, borderColor, borderWidth },
      ]}
    >
      {/* ── Date area ───────────────────────────────────────────────────────── */}
      {/* Row: primary label (writing-direction start) + candle (end, Fridays only) */}
      <View style={styles.dateRow}>
        <Text style={[styles.primaryLabel, { color: colors.textPrimary }]}>
          {primaryLabel}
        </Text>
        {isFriday && (
          <CandleIcon width={16} height={12} color={colors.candle} />
        )}
      </View>

      {/* Secondary label — opposite corner from primary (writing-direction end) */}
      {/* writingDirection: 'ltr' ensures Gregorian digit renders LTR in RTL container */}
      <View style={styles.secondaryRow}>
        <Text
          style={[styles.secondaryLabel, { color: colors.textTertiary, writingDirection: 'ltr' }]}
        >
          {secondaryLabel}
        </Text>
      </View>

      {/* ── Tags area (2px gap below date area — see comment in styles) ─────── */}
      <View style={styles.tagsArea}>
        {visibleTags.map((tag, i) => {
          const { bg, fg } = TAG_COLORS[tag.category];
          return (
            <View key={i} style={[styles.tagChip, { backgroundColor: bg }]}>
              <Text
                style={[styles.tagText, { color: fg }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tag.label}
              </Text>
            </View>
          );
        })}
        {overflowCount > 0 && (
          <View style={[styles.tagChip, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.tagText, { color: colors.textSecondary }]}>
              +{overflowCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Memoization ───────────────────────────────────────────────────────────────
// Custom comparator avoids re-renders when parent re-renders with same values.
// onPress/onLongPress are intentionally NOT compared — parent should useCallback
// them; stable references should not cause cell re-renders.

export const DayCell = memo(DayCellInner, (prev, next) => {
  return (
    prev.primaryLabel   === next.primaryLabel   &&
    prev.secondaryLabel === next.secondaryLabel &&
    prev.isToday        === next.isToday        &&
    prev.isSelected     === next.isSelected     &&
    prev.isShabbat      === next.isShabbat      &&
    prev.isHoliday      === next.isHoliday      &&
    prev.isFriday       === next.isFriday       &&
    prev.isEmpty        === next.isEmpty        &&
    prev.tags.length    === next.tags.length    &&
    prev.tags.every(
      (t, i) =>
        t.category === next.tags[i].category &&
        t.label    === next.tags[i].label
    )
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyCell: {
    flex: 1,
    height: CELL_HEIGHT, // still occupies grid space
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,   // per docs/DESIGN.md — 110px locked
    borderRadius: radius.sm, // = 6, per DESIGN.md "Day cells"
    padding: 4,
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryLabel: {
    fontSize: 18,
    fontWeight: '700',
    // textAlign defaults to 'auto' — respects I18nManager.isRTL
  },
  secondaryRow: {
    // 2px gap below the date row before the secondary label
    marginTop: 2,
    alignItems: 'flex-end', // opposite corner from primary (which is at flex-start in RTL)
  },
  secondaryLabel: {
    fontSize: 11,
    fontWeight: '400',
  },
  tagsArea: {
    // 2px gap below the date area before tags
    marginTop: 2,
    gap: 2,
    flex: 1,
  },
  tagChip: {
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: radius.xs, // = 4, per DESIGN.md "Tags, small badges"
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
