// src/components/calendar/WeekTimeline.tsx
//
// Redesign — replaces WeekGrid/WeekRow with a real hourly week timeline
// (day-columns header + all-day/span row + scrollable hourly grid with
// absolutely-positioned timed-event blocks and a live current-time line).
//
// Geometry: the header row, all-day row and hourly grid all share one
// coordinate system, measured once via onLayout on the outer container.
// See weekTimelineLayout.ts for the pure geometry/clustering math.
//
// RTL: day index 0 (first day of the displayed week) sits at the RIGHT
// edge; day index 6 sits adjacent to the left gutter. flexDirection is
// never relied on here — every child is absolutely positioned or laid out
// in natural (LTR) order using explicit `left` coordinates derived from
// columnLeft(), which is what actually encodes the RTL reading order.

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useCalendarStore } from '../../providers/CalendarProvider';
import { useThemeColors, type ThemeColors } from '../../hooks/useThemeColors';
import { useDatesNotes } from '../../hooks/useDatesNotes';
import { dateService, toHebrewNumeral, type DayData } from '../../services/DateService';
import { formatDateKey } from '../../utils/dateUtils';
import { resolveEventColor } from '../../utils/colorResolver';
import type { TagCategory } from './DayCell';
import { radius } from '../../constants/radius';
import { typography, withFontFamily } from '../../constants/typography';
import { swipeDirection } from '../../constants/layout';
import {
  HOUR_START,
  HOUR_END,
  HOUR_COUNT,
  HOUR_HEIGHT,
  GUTTER_WIDTH,
  DAY_HEADER_HEIGHT,
  TODAY_CIRCLE_SIZE,
  NOW_DOT_SIZE,
  ALLDAY_CHIP_HEIGHT,
  ALLDAY_CHIP_GAP,
  ALLDAY_ROW_VPAD,
  HEBREW_DAY_LETTERS,
  DAYS_PER_WEEK,
  columnWidth,
  columnLeft,
  buildWeekAllDayItems,
  allDayRowHeight,
  layoutDayTimedEvents,
  type TimedEventInput,
  type PositionedTimedEvent,
  type PositionedAllDayItem,
} from './weekTimelineLayout';

// ── Small pure helpers ───────────────────────────────────────────────────────

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function categoryColors(colors: ThemeColors, category: TagCategory): { bg: string; fg: string } {
  switch (category) {
    case 'holiday':  return { bg: colors.tagHolidayBg,  fg: colors.tagHoliday };
    case 'shabbat':  return { bg: colors.tagShabbatBg,  fg: colors.tagShabbat };
    case 'special':  return { bg: colors.tagSpecialBg,  fg: colors.tagSpecial };
    case 'event':    return { bg: colors.tagEventBg,    fg: colors.tagEvent };
    case 'personal': return { bg: colors.tagPersonalBg, fg: colors.tagPersonal };
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface WeekTimelineProps {
  /** First day of the displayed week (local midnight-ish Date; only Y/M/D used). */
  weekStart: Date;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WeekTimeline({ weekStart }: WeekTimelineProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const today = useCalendarStore((s) => s.today);
  const notesVersion = useCalendarStore((s) => s.notesVersion);

  const [containerWidth, setContainerWidth] = useState(0);
  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  // 7 DayData objects for the displayed week (index 0 = weekStart).
  const weekDays: DayData[] = useMemo(() => {
    const days: DayData[] = [];
    for (let i = 0; i < DAYS_PER_WEEK; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(dateService.getDayData(d));
    }
    return days;
  }, [weekStart]);

  const weekEnd = weekDays[DAYS_PER_WEEK - 1].gregorianDate;
  // notesVersion as refreshKey: keeps the timeline fresh when a note is
  // created/edited/deleted from another screen (e.g. Day view) while this
  // week is on screen. useDatesNotes swallows its own load errors and
  // resolves to an empty Map on failure — every lookup below defensively
  // falls back to `?? []`, so a data-layer failure degrades to an empty
  // (but still fully-drawn) week rather than a crash.
  const notesByDate = useDatesNotes(weekStart, weekEnd, notesVersion);

  const todayIdx = useMemo(
    () => weekDays.findIndex((d) => isSameDay(d.gregorianDate, today)),
    [weekDays, today],
  );
  const shabbatIdx = useMemo(
    () => weekDays.findIndex((d) => d.hebrewDate.isShabbat),
    [weekDays],
  );

  const colWidth = columnWidth(containerWidth);

  // ── All-day / span row ───────────────────────────────────────────────────
  const { items: allDayItems, laneCount } = useMemo(
    () => buildWeekAllDayItems(weekDays, notesByDate),
    [weekDays, notesByDate],
  );
  const allDayHeight = allDayRowHeight(laneCount);

  // ── Timed events per day, laid out into side-by-side lanes ───────────────
  const timedByDay: PositionedTimedEvent[][] = useMemo(() => {
    return weekDays.map((day) => {
      const dayKey = formatDateKey(day.gregorianDate);
      const notes = notesByDate.get(dayKey) ?? [];
      const inputs: TimedEventInput[] = [];
      for (const note of notes) {
        if (note.isAllDay || !note.startDateTime) continue;
        inputs.push({
          key: note.id,
          note,
          start: new Date(note.startDateTime),
          end: note.endDateTime ? new Date(note.endDateTime) : null,
        });
      }
      return layoutDayTimedEvents(inputs);
    });
  }, [weekDays, notesByDate]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleDayPress = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      router.push('/(tabs)/day');
    },
    [setSelectedDate, router],
  );

  const navigateWeek = useCallback(
    (direction: 1 | -1) => {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + 7 * direction);
      setSelectedDate(next);
    },
    [selectedDate, setSelectedDate],
  );
  const onSwipe = useCallback((vx: number) => navigateWeek(swipeDirection(vx)), [navigateWeek]);
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-15, 15])
        .onEnd((e) => {
          if (Math.abs(e.velocityX) > 400) runOnJS(onSwipe)(e.velocityX);
        }),
    [onSwipe],
  );

  const hourLines = useMemo(
    () => Array.from({ length: HOUR_COUNT + 1 }, (_, i) => HOUR_START + i),
    [],
  );
  const columnBoundaries = useMemo(
    () => Array.from({ length: DAYS_PER_WEEK }, (_, i) => i),
    [],
  );

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.root, { backgroundColor: colors.surface }]} onLayout={onContainerLayout}>
        {/* ── Day-columns header (pinned) ──────────────────────────────────────
            Single geometry path: every cell is absolutely positioned via the
            SAME columnLeft(i, containerWidth) used by the all-day row and the
            hourly grid below, so all three bands can never disagree on where
            day index i sits. (Previously this used flexDirection, which
            diverged from the grid's columnLeft math — see incident notes.) */}
        <View style={[styles.dayHeaderRow, { borderBottomColor: colors.border }]}>
          {containerWidth > 0 &&
            weekDays.map((day, i) => {
              const isToday = i === todayIdx;
              const isShabbat = day.hebrewDate.isShabbat;
              const letterColor = isShabbat ? colors.tagShabbat : colors.textTertiary;
              return (
                <Pressable
                  key={i}
                  onPress={() => handleDayPress(day.gregorianDate)}
                  style={[
                    styles.dayHeaderCell,
                    {
                      left: columnLeft(i, containerWidth),
                      width: colWidth,
                      backgroundColor: isShabbat ? colors.shabbatTint : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${toHebrewNumeral(day.hebrewDate.day)} ${day.hebrewDate.monthName}, ${day.gregorianDate.getDate()}`}
                >
                  <Text style={[styles.dayLetter, { color: letterColor }]}>
                    {HEBREW_DAY_LETTERS[day.gregorianDate.getDay()]}
                  </Text>
                  {isToday ? (
                    <View style={[styles.todayCircle, { backgroundColor: colors.today }]}>
                      <Text style={[styles.todayNumeral, { color: colors.textInverse }]}>
                        {toHebrewNumeral(day.hebrewDate.day)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.hebrewNumeral, { color: colors.textPrimary }]}>
                      {toHebrewNumeral(day.hebrewDate.day)}
                    </Text>
                  )}
                  <Text style={[styles.gregNumber, { color: colors.textTertiary }]}>
                    {day.gregorianDate.getDate()}
                  </Text>
                </Pressable>
              );
            })}
        </View>

        {/* ── All-day / span row (pinned) ─────────────────────────────────────
            The row itself (not a flex sibling past a gutter column) is the
            full-width relative coordinate space — exactly like gridBody below
            — so columnLeft(i, containerWidth) lands on the same x here as it
            does in the header and the hourly grid. The gutter label is an
            absolutely-positioned overlay at x=0, not a layout-shifting sibling. */}
        <View
          style={[
            styles.allDayRow,
            { height: allDayHeight, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.gutterOverlay} pointerEvents="none">
            <Text style={[styles.gutterLabel, { color: colors.textTertiary }]}>כל היום</Text>
          </View>
          {shabbatIdx >= 0 && containerWidth > 0 && (
            <View
              pointerEvents="none"
              style={[
                styles.columnTint,
                {
                  left: columnLeft(shabbatIdx, containerWidth),
                  width: colWidth,
                  backgroundColor: colors.shabbatTint,
                },
              ]}
            />
          )}
          {containerWidth > 0 &&
            allDayItems.map((item) => (
              <AllDayBar
                key={item.key}
                item={item}
                containerWidth={containerWidth}
                colWidth={colWidth}
                colors={colors}
                onPress={() => handleDayPress(weekDays[item.onPressDayIdx].gregorianDate)}
              />
            ))}
        </View>

        {/* ── Hourly grid (scrollable) ─────────────────────────────────────── */}
        <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.gridBody, { height: HOUR_COUNT * HOUR_HEIGHT }]}>
            {/* Shabbat column tint, full grid height */}
            {shabbatIdx >= 0 && containerWidth > 0 && (
              <View
                pointerEvents="none"
                style={[
                  styles.columnTint,
                  {
                    left: columnLeft(shabbatIdx, containerWidth),
                    width: colWidth,
                    backgroundColor: colors.shabbatTint,
                  },
                ]}
              />
            )}

            {/* Hour lines + labels */}
            {hourLines.map((hour, idx) => (
              <View
                key={hour}
                pointerEvents="none"
                style={[
                  styles.hourLine,
                  { top: idx * HOUR_HEIGHT, backgroundColor: colors.borderSubtle },
                ]}
              />
            ))}
            {hourLines.map((hour, idx) => (
              <Text
                key={`label-${hour}`}
                style={[
                  styles.hourLabel,
                  { top: idx * HOUR_HEIGHT - 6, color: colors.textTertiary },
                ]}
              >
                {String(hour).padStart(2, '0')}:00
              </Text>
            ))}

            {/* Vertical column separators (incl. the gutter boundary) */}
            {containerWidth > 0 &&
              columnBoundaries.map((i) => (
                <View
                  key={`sep-${i}`}
                  pointerEvents="none"
                  style={[
                    styles.verticalSeparator,
                    { left: columnLeft(i, containerWidth), backgroundColor: colors.borderSubtle },
                  ]}
                />
              ))}

            {/* Timed event blocks */}
            {containerWidth > 0 &&
              weekDays.map((day, i) =>
                timedByDay[i].map((ev) => (
                  <TimedEventBlock
                    key={ev.key}
                    event={ev}
                    colLeft={columnLeft(i, containerWidth)}
                    colWidth={colWidth}
                    colors={colors}
                    onPress={() => handleDayPress(day.gregorianDate)}
                  />
                )),
              )}

            {/* Current-time indicator (only when the displayed week contains today) */}
            {todayIdx >= 0 && containerWidth > 0 && (
              <NowIndicator
                colLeft={columnLeft(todayIdx, containerWidth)}
                colWidth={colWidth}
                color={colors.error}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </GestureDetector>
  );
}

// ── All-day bar ───────────────────────────────────────────────────────────────

interface AllDayBarProps {
  item: PositionedAllDayItem;
  containerWidth: number;
  colWidth: number;
  colors: ThemeColors;
  onPress: () => void;
}

const AllDayBar = React.memo(function AllDayBar({
  item,
  containerWidth,
  colWidth,
  colors,
  onPress,
}: AllDayBarProps) {
  const { bg, fg } = categoryColors(colors, item.category);
  const rightEdge = columnLeft(item.startIdx, containerWidth) + colWidth;
  const leftEdge = columnLeft(item.endIdx, containerWidth);
  const top = item.lane * (ALLDAY_CHIP_HEIGHT + ALLDAY_CHIP_GAP) + ALLDAY_ROW_VPAD;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={[
        styles.allDayBar,
        {
          top,
          left: leftEdge,
          width: rightEdge - leftEdge,
          backgroundColor: bg,
          borderTopRightRadius: item.roundStart ? radius.xs : 0,
          borderBottomRightRadius: item.roundStart ? radius.xs : 0,
          borderTopLeftRadius: item.roundEnd ? radius.xs : 0,
          borderBottomLeftRadius: item.roundEnd ? radius.xs : 0,
        },
      ]}
    >
      <Text style={[styles.allDayLabel, { color: fg }]} numberOfLines={1} ellipsizeMode="tail">
        {item.label}
      </Text>
    </Pressable>
  );
});

// ── Timed event block ────────────────────────────────────────────────────────

interface TimedEventBlockProps {
  event: PositionedTimedEvent;
  colLeft: number;
  colWidth: number;
  colors: ThemeColors;
  onPress: () => void;
}

const EVENT_INSET = 2;

const TimedEventBlock = React.memo(function TimedEventBlock({
  event,
  colLeft,
  colWidth,
  colors,
  onPress,
}: TimedEventBlockProps) {
  const category = resolveEventColor(event.note.noteType, event.note.colorId);
  const { bg, fg } = categoryColors(colors, category);
  const laneWidth = colWidth / event.totalLanes;
  const left = colLeft + event.lane * laneWidth + EVENT_INSET;
  const width = Math.max(laneWidth - EVENT_INSET * 2, 4);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={2}
      style={[
        styles.timedBlock,
        {
          top: event.geometry.top,
          height: event.geometry.height,
          left,
          width,
          backgroundColor: bg,
        },
      ]}
    >
      <View style={[styles.timedStripe, { backgroundColor: fg }]} />
      <Text
        style={[styles.timedTitle, { color: fg }]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {event.note.summary}
      </Text>
    </Pressable>
  );
}, (prev, next) => {
  return (
    prev.event.key === next.event.key &&
    prev.event.note.summary === next.event.note.summary &&
    prev.event.note.colorId === next.event.note.colorId &&
    prev.event.lane === next.event.lane &&
    prev.event.totalLanes === next.event.totalLanes &&
    prev.event.geometry.top === next.event.geometry.top &&
    prev.event.geometry.height === next.event.geometry.height &&
    prev.colLeft === next.colLeft &&
    prev.colWidth === next.colWidth &&
    prev.colors === next.colors
  );
});

// ── Current-time indicator ───────────────────────────────────────────────────
// Isolated into its own component with its own 60s-refresh timer so the
// per-minute re-render doesn't cascade into the (much larger) static grid.

interface NowIndicatorProps {
  colLeft: number;
  colWidth: number;
  color: string;
}

function NowIndicator({ colLeft, colWidth, color }: NowIndicatorProps) {
  const [now, setNow] = useState(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const minutesSinceStart = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
  if (minutesSinceStart < 0 || minutesSinceStart > (HOUR_END - HOUR_START) * 60) return null;

  const top = (minutesSinceStart / 60) * HOUR_HEIGHT;

  return (
    <View pointerEvents="none" style={[styles.nowLineWrap, { top, left: colLeft, width: colWidth }]}>
      <View style={[styles.nowLine, { backgroundColor: color }]} />
      <View style={[styles.nowDot, { backgroundColor: color }]} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Absolutely-positioned overlay for the "כל היום" label — sits at x=0 over
  // the all-day row's full-width coordinate space (does NOT shift the origin
  // the way a flex sibling would; see Bug 2 fix notes above).
  gutterOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: GUTTER_WIDTH,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 4,
  },
  // Figma: all-day gutter label = 8 Medium (typography.nano).
  gutterLabel: {
    ...withFontFamily(typography.nano),
  },

  // Day-columns header — full-width relative coordinate space; cells are
  // absolutely positioned via columnLeft(), the same function the all-day
  // row and hourly grid use. No flexDirection here — see Bug 1 fix notes.
  dayHeaderRow: {
    height: DAY_HEADER_HEIGHT,
    borderBottomWidth: 1,
    position: 'relative',
  },
  dayHeaderCell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayLetter: {
    ...withFontFamily(typography.micro),
  },
  hebrewNumeral: {
    ...withFontFamily(typography.cellPrimary),
  },
  todayCircle: {
    width: TODAY_CIRCLE_SIZE,
    height: TODAY_CIRCLE_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Figma: today numeral = 14 Bold.
  todayNumeral: {
    ...withFontFamily(typography.label, '700'),
  },
  // Figma: Gregorian day number = 9 Regular.
  gregNumber: {
    ...withFontFamily(typography.cellTag, '400'),
    writingDirection: 'ltr',
  },

  // All-day row — full-width relative coordinate space (mirrors gridBody),
  // NOT [gutter, body] flex siblings — see Bug 2 fix notes above.
  allDayRow: {
    position: 'relative',
    borderBottomWidth: 1,
  },
  // Figma multi-day bar: 17 tall, r4, text inset 5.
  allDayBar: {
    position: 'absolute',
    height: ALLDAY_CHIP_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  allDayLabel: {
    ...withFontFamily(typography.cellTag),
    textAlign: 'right',
  },

  // Hourly grid
  gridScroll: { flex: 1 },
  gridBody: {
    position: 'relative',
  },
  hourLine: {
    position: 'absolute',
    left: GUTTER_WIDTH,
    right: 0,
    height: 1,
  },
  hourLabel: {
    position: 'absolute',
    left: 0,
    width: GUTTER_WIDTH,
    textAlign: 'right',
    paddingRight: 4,
    writingDirection: 'ltr',
    // Figma: hour labels 9 Regular.
    ...withFontFamily(typography.cellTag, '400'),
  },
  verticalSeparator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
  },
  columnTint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },

  // Figma: event block r5, text inset 3, 3 px stripe on the right edge.
  timedBlock: {
    position: 'absolute',
    borderRadius: radius.event,
    padding: 3,
    paddingRight: 5, // clears the 3 px stripe (Figma text box ends 5 from the edge)
    overflow: 'hidden',
  },
  timedStripe: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 3,
    borderTopRightRadius: radius.event,
    borderBottomRightRadius: radius.event,
  },
  // Figma: timed event title = 8 SemiBold (typography.nano).
  timedTitle: {
    ...withFontFamily(typography.nano, '600'),
    textAlign: 'right',
  },

  nowLineWrap: {
    position: 'absolute',
    justifyContent: 'center',
  },
  nowLine: {
    height: 2,
    width: '100%',
  },
  nowDot: {
    position: 'absolute',
    right: -NOW_DOT_SIZE / 2,
    top: -(NOW_DOT_SIZE - 2) / 2,
    width: NOW_DOT_SIZE,
    height: NOW_DOT_SIZE,
    borderRadius: radius.full,
  },
});
