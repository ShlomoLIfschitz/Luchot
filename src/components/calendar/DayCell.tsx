// src/components/calendar/DayCell.tsx
// Presentational v2 component — per docs/SCREENS.md and docs/DESIGN.md.
// Does NOT manage tap state, selection logic, or know about Hebrew/Gregorian mode.
// All interaction logic lives in the parent (MonthGrid / WeekGrid).
//
// Redesign (borderless grid) — the per-cell border box is gone; cells are
// separated only by a 1px top hairline. Selected is the one exception with
// a full border. Today is now a filled circle around the primary label
// instead of a border/background tint. See MonthGrid Task 2 for the header
// and grid-sizing half of this redesign.

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import CandleIcon from '../icons/CandleIcon';
import { radius } from '../../constants/radius';
import { typography, withFontFamily } from '../../constants/typography';

// ── Cell sizing ────────────────────────────────────────────────────────────
// Height is intentionally NOT fixed here — the cell fills whatever height
// its parent row gives it (MonthGrid now sets an explicit, deterministic
// height on every weekRow — see MonthGrid's MIN_ROW_HEIGHT/MAX_ROW_HEIGHT —
// or WeekGrid's intrinsic row). CELL_MIN_HEIGHT is a floor only, so DayCell
// can never collapse to ~0 in a parent with no bounded height (e.g.
// WeekGrid, which has no flex-bound row today) — the same class of Yoga
// circular-height bug that once collapsed MonthGrid's weekRow.
//
// This floor is deliberately kept EQUAL to MonthGrid's MIN_ROW_HEIGHT (88),
// not independent of it: MonthGrid never assigns a row a height below its
// own MIN_ROW_HEIGHT, so a cell floor at the same value can never exceed
// the height the row actually gives it — the cell fills the row it's given
// and never forces the row taller. If MonthGrid's MIN_ROW_HEIGHT ever
// changes, update this constant to match.
const CELL_MIN_HEIGHT = 88;

// ── Segment chip fixed height ──────────────────────────────────────────────
// Ensures blank middle/end span bars are the same height as the titled
// start bar. Matches tagChip's own fixed height (17) — kept as an explicit
// segment override (rather than relying solely on tagChip's height) so the
// two stay intentionally decoupled if either is tuned independently later.
const SEGMENT_CHIP_HEIGHT = 17;

// ── Types ─────────────────────────────────────────────────────────────────────

/** Must match the 5 token categories in colors.ts */
export type TagCategory = 'holiday' | 'shabbat' | 'special' | 'event' | 'personal';

export interface DayCellTag {
  category: TagCategory;
  label: string; // displayed text, max ~12 chars practical
  /** Populated by tagMapper for multi-day span segments. Absent on single-day chips. */
  segment?: { isStart: boolean; isEnd: boolean };
}

export interface DayCellProps {
  // Date display
  primaryLabel: string;   // e.g. "כ״ז" or "14" — large, top-right (RTL reading start)
  secondaryLabel: string; // e.g. "14" or "כ״ז" — small, top-left
  /** Gregorian grid (Figma): the Gregorian number sits top-LEFT and the
   *  Hebrew numeral top-right, so the primary label moves to the left. */
  primaryOnLeft?: boolean;

  // State
  isToday: boolean;    // primary label rendered inside a filled circle
  isSelected: boolean; // 1.5px selected border + selectedBg tint (wins over all)
  isShabbat: boolean;  // subtle purple bg tint
  isHoliday: boolean;  // subtle green bg tint
  isFriday: boolean;   // show candle icon next to secondary label
  isEmpty?: boolean;   // padding day from prev/next month — render transparent placeholder

  // Content
  tags: DayCellTag[]; // 0 or more; component slices to 3 visible + +N overflow

  // Interaction — parent owns all logic; parent should useCallback these
  onPress: () => void;
  onLongPress: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

function DayCellInner({
  primaryLabel,
  secondaryLabel,
  primaryOnLeft = false,
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

  // ── Background resolution (priority: selected > holiday > shabbat > default) ─
  const backgroundColor = isSelected
    ? colors.selectedBg
    : isHoliday
    ? colors.holidayTint
    : isShabbat
    ? colors.shabbatTint
    : colors.surface;

  // ── Border resolution ───────────────────────────────────────────────────────
  // Default: no border box at all, only a 1px top hairline (the "grid breathes"
  // change). Selected is the one exception: a full border on every side.
  const borderStyle = isSelected
    ? {
        borderWidth: 1.5,
        borderColor: colors.selected,
        borderRadius: radius.sm,
      }
    : {
        borderTopWidth: 1,
        borderTopColor: colors.borderSubtle,
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderRadius: 0,
      };

  // ── Tag color map — type-safe, avoids template literal string indexing ─────
  const TAG_COLORS: Record<TagCategory, { bg: string; fg: string }> = {
    holiday:  { bg: colors.tagHolidayBg,  fg: colors.tagHoliday  },
    shabbat:  { bg: colors.tagShabbatBg,  fg: colors.tagShabbat  },
    special:  { bg: colors.tagSpecialBg,  fg: colors.tagSpecial  },
    event:    { bg: colors.tagEventBg,    fg: colors.tagEvent    },
    personal: { bg: colors.tagPersonalBg, fg: colors.tagPersonal },
  };

  // ── Tags slicing ───────────────────────────────────────────────────────────
  const visibleTags = tags.slice(0, 3);
  const overflowCount = Math.max(0, tags.length - 3);

  // ── Accessibility ────────────────────────────────────────────────────────────
  // Combines both date labels (whichever is Hebrew/Gregorian is decided by the
  // parent's mode) plus every tag's text, so a screen-reader user gets the full
  // picture of the day in one label — this is the most-used control in the app
  // and previously had no accessibility support at all.
  const tagLabelsForA11y = tags.map((t) => t.label).filter(Boolean).join(', ');
  const accessibilityLabel = tagLabelsForA11y
    ? `${primaryLabel}, ${secondaryLabel}, ${tagLabelsForA11y}`
    : `${primaryLabel}, ${secondaryLabel}`;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350} // RN sweet spot for distinguishing tap vs long-press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isSelected }}
      style={[styles.cell, { backgroundColor }, borderStyle]}
    >
      {/* ── Top row ─────────────────────────────────────────────────────────── */}
      {/* row-reverse: primary label (first child) lands RIGHT — the RTL
          reading start; secondary label + Friday candle land LEFT. */}
      <View style={[styles.dateRow, primaryOnLeft && styles.dateRowLtr]}>
        {isToday ? (
          <View style={[styles.todayCircle, { backgroundColor: colors.today }]}>
            <Text style={[styles.primaryLabel, styles.todayLabel, { color: colors.textInverse }]}>
              {primaryLabel}
            </Text>
          </View>
        ) : (
          <Text style={[styles.primaryLabel, { color: colors.textPrimary }]}>
            {primaryLabel}
          </Text>
        )}

        <View style={styles.secondaryGroup}>
          {isFriday && (
            <CandleIcon width={12} height={9} color={colors.candle} />
          )}
          {/* writingDirection: 'ltr' ensures Gregorian digits render LTR in RTL container */}
          <Text
            style={[styles.secondaryLabel, { color: colors.textTertiary, writingDirection: 'ltr' }]}
          >
            {secondaryLabel}
          </Text>
        </View>
      </View>

      {/* ── Tags area ─────────────────────────────────────────────────────── */}
      <View style={styles.tagsArea}>
        {visibleTags.map((tag, i) => {
          const { bg, fg } = TAG_COLORS[tag.category];
          // Segment chips (multi-day span bars) use per-corner radii and a fixed
          // height so blank middle/end bars stay the same height as the titled start.
          // RTL: visual start = RIGHT edge, visual end = LEFT edge.
          const segmentStyle = tag.segment
            ? {
                // Round only the true outer corners of the span.
                borderRadius: 0,
                borderTopRightRadius:
                  tag.segment.isStart ? radius.chip : 0,
                borderBottomRightRadius:
                  tag.segment.isStart ? radius.chip : 0,
                borderTopLeftRadius:
                  tag.segment.isEnd ? radius.chip : 0,
                borderBottomLeftRadius:
                  tag.segment.isEnd ? radius.chip : 0,
                // Fix bar height so blank middle/end bars match the titled start bar.
                minHeight: SEGMENT_CHIP_HEIGHT,
              }
            : null;
          return (
            <View key={i} style={[styles.tagChip, { backgroundColor: bg }, segmentStyle]}>
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
          <Text style={[styles.overflowText, { color: colors.textTertiary }]}>
            +{overflowCount}
          </Text>
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
    prev.primaryOnLeft  === next.primaryOnLeft  &&
    prev.isToday        === next.isToday        &&
    prev.isSelected     === next.isSelected     &&
    prev.isShabbat      === next.isShabbat      &&
    prev.isHoliday      === next.isHoliday      &&
    prev.isFriday       === next.isFriday       &&
    prev.isEmpty        === next.isEmpty        &&
    prev.tags.length    === next.tags.length    &&
    prev.tags.every(
      (t, i) =>
        t.category                 === next.tags[i].category &&
        t.label                    === next.tags[i].label    &&
        t.segment?.isStart         === next.tags[i].segment?.isStart &&
        t.segment?.isEnd           === next.tags[i].segment?.isEnd
    )
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  emptyCell: {
    flex: 1,
    minHeight: CELL_MIN_HEIGHT, // still occupies grid space
  },
  cell: {
    flex: 1,
    minHeight: CELL_MIN_HEIGHT, // floor only — grows to fill the parent row's height
    // Figma: 4 vertical / 3 horizontal.
    paddingVertical: 4,
    paddingHorizontal: 3,
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 24,
  },
  // Gregorian grid: primary (first child) lands LEFT, Hebrew numeral right.
  dateRowLtr: {
    flexDirection: 'row',
  },
  primaryLabel: {
    ...withFontFamily(typography.cellPrimary),
    textAlign: 'right',
  },
  todayCircle: {
    width: 23,
    height: 23,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Today's circled numeral is a distinct, smaller weight (13 Bold) than the
  // regular primaryLabel (15 SemiBold) — overrides fontFamily/size by being
  // later in the style array alongside styles.primaryLabel at the call site.
  todayLabel: {
    ...withFontFamily(typography.bodySmall, '700'),
    textAlign: 'center',
  },
  secondaryGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  secondaryLabel: {
    ...withFontFamily(typography.cellSecondary),
  },
  tagsArea: {
    // 3px gap below the date area before tags, and between each chip — with
    // the row-height fix giving cells more vertical room, chips no longer
    // need to be packed edge-to-edge.
    marginTop: 3,
    gap: 3,
    flex: 1,
  },
  tagChip: {
    alignSelf: 'stretch',
    height: 17, // was 15 — a couple more px so a typical two-word Hebrew
                // holiday name (e.g. "ראש השנה") has room before truncating.
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderRadius: radius.chip, // = 3, the Figma day-cell chip
  },
  tagText: {
    ...withFontFamily(typography.cellTag),
    textAlign: 'right',
  },
  // Figma: "+N" is 9 Medium, same step as the chip text.
  overflowText: {
    ...withFontFamily(typography.cellTag),
    textAlign: 'right',
  },
});
