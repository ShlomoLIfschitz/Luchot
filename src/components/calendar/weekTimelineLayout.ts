// src/components/calendar/weekTimelineLayout.ts
//
// Pure (no-React) geometry + data-shaping helpers for WeekTimeline.
// Kept separate from the component so the layout math and event-clustering
// algorithms are easy to reason about and cheap to memoize.
//
// RTL geometry note: the hourly grid + all-day row share ONE coordinate
// system. A left gutter (GUTTER_WIDTH) is pinned at x=0 (hour labels /
// "כל היום" label). The 7 day columns fill the remainder, with day index 0
// (first day of the displayed week) flush against the RIGHT edge and day
// index 6 (last day) adjacent to the gutter on the left — this is what
// makes Sunday-start weeks render "Sunday rightmost, Shabbat leftmost"
// while staying generic for any firstDayOfWeek setting.

import type { DayData } from '../../services/DateService';
import type { CalendarNote } from '../../hooks/useNotes';
import type { TagCategory } from './DayCell';
import { resolveEventColor } from '../../utils/colorResolver';
import { formatDateKey } from '../../utils/dateUtils';

// ── Named constants (no magic numbers) ──────────────────────────────────────

/** First hour rendered in the scrollable grid (06:00). */
export const HOUR_START = 6;
/** Hour AFTER the last rendered row's end (22:00 — last row is 21:00-22:00). */
export const HOUR_END = 22;
/** Number of hourly rows in the grid. */
export const HOUR_COUNT = HOUR_END - HOUR_START;
/** Pixel height of one hour row. */
export const HOUR_HEIGHT = 52;
/** Width of the left gutter (hour labels / "כל היום" label). */
export const GUTTER_WIDTH = 34;
/** Height of the pinned day-columns header. */
export const DAY_HEADER_HEIGHT = 58;
/** Diameter of the filled "today" circle around the Hebrew numeral. */
export const TODAY_CIRCLE_SIZE = 28;
/** Minimum height of the pinned all-day row (grows if a day stacks 2+ items). */
export const ALLDAY_ROW_MIN_HEIGHT = 42;
/** Height of a single all-day / span chip. */
export const ALLDAY_CHIP_HEIGHT = 17; // Figma multi-day bar
/** Vertical gap between stacked all-day chip lanes. */
export const ALLDAY_CHIP_GAP = 3;
/** Vertical padding (top+bottom, applied once each) inside the all-day row. */
export const ALLDAY_ROW_VPAD = 4;
/** Fallback duration (minutes) for a timed event with no real end time. */
export const DEFAULT_EVENT_DURATION_MINUTES = 60;
/** Diameter of the current-time indicator dot. */
export const NOW_DOT_SIZE = 8;

export const DAYS_PER_WEEK = 7;

// ── Local Hebrew string tables (Hermes/Android Intl for he-IL month/weekday
// names is unreliable — see CLAUDE.md/DECISIONS.md incident history. Never
// use toLocaleDateString('he-IL', {month:.. / weekday:..}) for these.) ──────

/** Single-letter Hebrew weekday abbreviations, index 0=Sunday..6=Saturday. */
export const HEBREW_DAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

/** Hebrew Gregorian month names (bare, no "ב" prefix), index 0=January. */
export const GREG_MONTHS_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

/** "5 באוקטובר" style day+month string, built from the local table above. */
export function formatGregDayMonth(d: Date): string {
  return `${d.getDate()} ב${GREG_MONTHS_HE[d.getMonth()]}`;
}

// ── Column geometry ──────────────────────────────────────────────────────────

/** Width of a single day column given the total measured container width. */
export function columnWidth(containerWidth: number): number {
  return Math.max(0, containerWidth - GUTTER_WIDTH) / DAYS_PER_WEEK;
}

/**
 * Left (x) offset of day column `i` (0-indexed from the first displayed day).
 * i=0 sits flush against the right edge (RTL reading start); i=6 sits flush
 * against the gutter's right edge (x = GUTTER_WIDTH) on the left.
 */
export function columnLeft(i: number, containerWidth: number): number {
  const w = columnWidth(containerWidth);
  return containerWidth - (i + 1) * w;
}

// ── Time helpers ─────────────────────────────────────────────────────────────

/** Minutes since HOUR_START, clamped to [0, HOUR_COUNT*60] for on-grid geometry. */
function clampedMinutesSinceGridStart(d: Date): number {
  const mins = (d.getHours() - HOUR_START) * 60 + d.getMinutes();
  return Math.min(Math.max(mins, 0), HOUR_COUNT * 60);
}

export interface TimedBlockGeometry {
  top: number;
  height: number;
}

/**
 * Computes top/height (px, relative to the grid body) for a timed event.
 * Falls back to DEFAULT_EVENT_DURATION_MINUTES when there is no real end
 * (end <= start, e.g. a note saved without an explicit end time).
 */
export function computeTimedBlockGeometry(start: Date, end: Date | null): TimedBlockGeometry {
  const startMin = clampedMinutesSinceGridStart(start);
  let endMin: number;
  if (end && end.getTime() > start.getTime()) {
    endMin = clampedMinutesSinceGridStart(end);
  } else {
    endMin = clampedMinutesSinceGridStart(
      new Date(start.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60000),
    );
  }
  const MIN_HEIGHT_MIN = 24; // never render a sliver too thin to read
  const height = Math.max((endMin - startMin) / 60 * HOUR_HEIGHT, MIN_HEIGHT_MIN / 60 * HOUR_HEIGHT);
  const top = startMin / 60 * HOUR_HEIGHT;
  return { top, height };
}

// ── Timed-event per-day overlap layout (side-by-side lanes) ─────────────────

export interface TimedEventInput {
  key: string;
  note: CalendarNote;
  start: Date;
  end: Date | null;
}

export interface PositionedTimedEvent extends TimedEventInput {
  lane: number;
  totalLanes: number;
  geometry: TimedBlockGeometry;
}

/**
 * Assigns non-overlapping side-by-side lanes to a day's timed events using
 * a standard cluster+greedy-lane sweep (same family of algorithm used by
 * most calendar UIs for concurrent-event layout).
 */
export function layoutDayTimedEvents(events: TimedEventInput[]): PositionedTimedEvent[] {
  if (events.length === 0) return [];

  const withRange = events
    .map((ev) => {
      const geometry = computeTimedBlockGeometry(ev.start, ev.end);
      return { ev, startMin: geometry.top, endMin: geometry.top + geometry.height, geometry };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const positioned: PositionedTimedEvent[] = [];
  let cluster: typeof withRange = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOfIndex: number[] = [];
    for (const item of cluster) {
      let lane = laneEnds.findIndex((end) => end <= item.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.endMin);
      } else {
        laneEnds[lane] = item.endMin;
      }
      laneOfIndex.push(lane);
    }
    const totalLanes = laneEnds.length;
    cluster.forEach((item, idx) => {
      positioned.push({
        ...item.ev,
        lane: laneOfIndex[idx],
        totalLanes,
        geometry: item.geometry,
      });
    });
    cluster = [];
  };

  for (const item of withRange) {
    if (cluster.length === 0 || item.startMin < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMin);
    } else {
      flushCluster();
      cluster.push(item);
      clusterEnd = item.endMin;
    }
  }
  flushCluster();

  return positioned;
}

// ── All-day / span row layout ────────────────────────────────────────────────

export interface WeekAllDayItem {
  key: string;
  startIdx: number; // 0..6, index into the displayed week's days
  endIdx: number;   // 0..6, startIdx <= endIdx
  label: string;
  category: TagCategory;
  roundStart: boolean; // true = draw the reading-start (RTL: right) cap
  roundEnd: boolean;   // true = draw the reading-end (RTL: left) cap
  onPressDayIdx: number; // which day's date to navigate to on tap
  external?: boolean; // Google/device-calendar event (live overlay): outlined bar
}

export interface PositionedAllDayItem extends WeekAllDayItem {
  lane: number;
}

export interface AllDayLayoutResult {
  items: PositionedAllDayItem[];
  laneCount: number;
}

/**
 * Builds the all-day row's items for a displayed week:
 *  - one non-spanning chip per (day, holiday-name) pair
 *  - one item per all-day CalendarNote, deduplicated by id and widened to
 *    cover every day-in-week it touches (multi-day notes carry `segment`
 *    metadata per day from useDatesNotes; this collapses those per-day
 *    copies back into a single spanning bar).
 * Then assigns non-overlapping vertical lanes (interval graph colouring)
 * so overlapping items stack instead of visually colliding.
 */
export function buildWeekAllDayItems(
  weekDays: DayData[],
  notesByDate: Map<string, CalendarNote[]>,
): AllDayLayoutResult {
  const items: WeekAllDayItem[] = [];

  // 1. Holiday chips — per day, non-spanning (DayData carries no cross-day
  //    grouping for multi-day holidays like Chol HaMoed; each day shows its
  //    own label(s), consistent with how MonthGrid/DayCell already render
  //    holidays elsewhere in the app).
  weekDays.forEach((day, i) => {
    day.holidays.forEach((label, hIdx) => {
      items.push({
        key: `holiday-${i}-${hIdx}`,
        startIdx: i,
        endIdx: i,
        label,
        category: 'holiday',
        roundStart: true,
        roundEnd: true,
        onPressDayIdx: i,
      });
    });
  });

  // 2. All-day CalendarNotes — dedupe by id, widen the range as we encounter
  //    the same id on later days (useDatesNotes emits one shallow copy per
  //    covered day for multi-day spans).
  const byNoteId = new Map<string, WeekAllDayItem>();
  weekDays.forEach((day, i) => {
    const dayKey = formatDateKey(day.gregorianDate);
    const notes = notesByDate.get(dayKey) ?? [];
    for (const note of notes) {
      if (!note.isAllDay) continue;
      const category = resolveEventColor(note.noteType, note.colorId);
      const existing = byNoteId.get(note.id);
      const roundStart = note.segment ? note.segment.isStart : true;
      const roundEnd = note.segment ? note.segment.isEnd : true;
      if (!existing) {
        byNoteId.set(note.id, {
          key: `note-${note.id}`,
          startIdx: i,
          endIdx: i,
          label: note.summary,
          category,
          roundStart,
          roundEnd,
          onPressDayIdx: i,
          external: note.external ? true : undefined,
        });
      } else {
        existing.endIdx = i;
        existing.roundEnd = roundEnd;
      }
    }
  });

  items.push(...byNoteId.values());

  // 3. Lane assignment (greedy interval colouring) sorted by start, then span length.
  const sorted = [...items].sort(
    (a, b) => a.startIdx - b.startIdx || (b.endIdx - b.startIdx) - (a.endIdx - a.startIdx),
  );
  const laneEnds: number[] = []; // last occupied endIdx per lane
  const positioned: PositionedAllDayItem[] = [];
  for (const item of sorted) {
    let lane = laneEnds.findIndex((end) => end < item.startIdx);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endIdx);
    } else {
      laneEnds[lane] = item.endIdx;
    }
    positioned.push({ ...item, lane });
  }

  return { items: positioned, laneCount: Math.max(laneEnds.length, 1) };
}

/** Computed pixel height of the all-day row for a given lane count. */
export function allDayRowHeight(laneCount: number): number {
  const contentHeight =
    laneCount * ALLDAY_CHIP_HEIGHT + Math.max(laneCount - 1, 0) * ALLDAY_CHIP_GAP;
  return Math.max(ALLDAY_ROW_MIN_HEIGHT, contentHeight + ALLDAY_ROW_VPAD * 2);
}
