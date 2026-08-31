// src/components/calendar/MonthGrid.tsx
// Phase 3.4 — mode made required; useRouter wired; second-tap and viewDay
// quick action now navigate to the Day tab.
// Phase 3.7a-2 — addNote and addRecurring quick actions wired to NoteEditor.
// Phase 4.2-2 — useDatesNotes wired; user notes now appear as tags.
// Phase 4.6-C — FlatList replaced with View grid; mode prop drives RTL/LTR
//               direction. Hebrew mode: row-reverse (Sunday right, Shabbat left).
//               Gregorian mode: row (Sunday left, Saturday right).
// Redesign (Task 2) — merged header (hamburger + two-line tappable title +
//               jump-to-today) absorbed from ScreenHeader (index.tsx/gregorian.tsx
//               no longer render it, avoiding a duplicate/empty header bar); the
//               month arrows are removed (swipe + title-tap picker remain); the
//               Gregorian-tab subtitle is now a real month RANGE, computed from
//               local Hebrew month-name arrays (never toLocaleDateString — Hermes
//               on Android has unreliable Intl data); the grid now fills available
//               vertical space via flex instead of a hard 110px row height.
// Redesign hotfix — the flex:1 weekRow above was never actually deterministic:
//               React Native stretches flex:1 rows to fill a ScrollView's
//               content area whenever the content is shorter than the
//               viewport, so 6-week months rendered ~206px rows instead of
//               falling back to the intended ~92px floor. Replaced with a
//               single computed rowHeight (measured available height / week
//               count, clamped to [MIN_ROW_HEIGHT, MAX_ROW_HEIGHT]) applied
//               as an explicit height on every row — see the constants and
//               gridArea onLayout below.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, LayoutChangeEvent } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import BottomSheet from '@gorhom/bottom-sheet';
import { Menu, CalendarCheck } from 'lucide-react-native';
import { useCalendarStore } from '../../providers/CalendarProvider';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { useDrawerStore } from '../../providers/DrawerProvider';
import { useThemeColors } from '../../hooks/useThemeColors';
import { typography, withFontFamily } from '../../constants/typography';
import { DayCell } from './DayCell';
import { MonthYearPicker } from './MonthYearPicker';
import { QuickActionSheet, QuickAction } from './QuickActionSheet';
import { DayData, HebrewDateInfo, toHebrewNumeral, toHebrewYear } from '../../services/DateService';
import { HebrewDatePicker } from './HebrewDatePicker';
import { buildDayTags } from '../../utils/tagMapper';
import { NoteEditor } from '../notes/NoteEditor';
import { useNotes } from '../../hooks/useNotes';
import { useDatesNotes } from '../../hooks/useDatesNotes';
import { dateService } from '../../services/DateService';
import { formatDateKey } from '../../utils/dateUtils';
import { swipeDirection } from '../../constants/layout';

// ── Types ─────────────────────────────────────────────────────────────────────

export type MonthGridMode = 'hebrew' | 'gregorian';

interface MonthGridProps {
  /** Determines primary/secondary date label assignment and grid direction.
   *  Pass 'hebrew' for the עברי tab (RTL, Sunday right), 'gregorian' for
   *  the לועזי tab (LTR, Sunday left). */
  mode: MonthGridMode;
}

// ── Day name headers ───────────────────────────────────────────────────────────
// Arrays are in logical Sunday-first order. The visual order is flipped for
// Hebrew mode by flexDirection: 'row-reverse' on the header and week rows.

const DAY_NAMES_HE_SUN_FIRST = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAY_NAMES_HE_MON_FIRST = ['ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳', 'א׳'];
const DAY_NAMES_EN_SUN_FIRST = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_EN_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Gregorian month names (Hebrew-language labels) ─────────────────────────────
// Defined locally rather than via toLocaleDateString('he-IL', …) — Hermes on
// Android has unreliable/absent Intl data, so relying on it here would be a
// latent crash/garbage-output risk.
const MONTHS_HE_FULL = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];
const MONTHS_HE_ABBR = [
  'ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני',
  'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳',
];

/** e.g. "אוקטובר 2025" / "ספט׳ – אוק׳ 2025" / "דצמ׳ 2025 – ינו׳ 2026" */
function formatGregorianRange(start: Date, end: Date): string {
  const sm = start.getMonth();
  const sy = start.getFullYear();
  const em = end.getMonth();
  const ey = end.getFullYear();

  if (sm === em && sy === ey) return `${MONTHS_HE_FULL[sm]} ${sy}`;
  if (sy === ey) return `${MONTHS_HE_ABBR[sm]} – ${MONTHS_HE_ABBR[em]} ${sy}`;
  return `${MONTHS_HE_ABBR[sm]} ${sy} – ${MONTHS_HE_ABBR[em]} ${ey}`;
}

/** e.g. "תשרי תשפ״ו" / "תשרי – חשוון תשפ״ו" / "אלול תשפ״ה – תשרי תשפ״ו" */
function formatHebrewRange(start: HebrewDateInfo, end: HebrewDateInfo): string {
  const startYear = toHebrewYear(start.year);
  if (start.monthName === end.monthName && start.year === end.year) {
    return `${start.monthName} ${startYear}`;
  }
  if (start.year === end.year) {
    return `${start.monthName} – ${end.monthName} ${startYear}`;
  }
  return `${start.monthName} ${startYear} – ${end.monthName} ${toHebrewYear(end.year)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MonthGrid({ mode }: MonthGridProps) {
  const colors = useThemeColors();
  const router = useRouter();
  const openDrawer = useDrawerStore((s) => s.open);
  const {
    monthData,
    hebrewMonthData,
    selectedDate,
    today,
    navigateMonth,
    navigateHebrewMonth,
    navigateToMonth,
    navigateToHebrewMonth,
    setSelectedDate,
    currentMonth,
    currentYear,
    currentHebrewYear,
    currentHebrewMonth,
  } = useCalendarStore();

  // Mode-aware aliases — all grid construction and navigation use these.
  const isHebrew = mode === 'hebrew';
  const gridData = isHebrew ? hebrewMonthData : monthData;
  const navigate = isHebrew ? navigateHebrewMonth : navigateMonth;
  const firstDayOfWeek = useSettingsStore((s) => s.firstDayOfWeek);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [hebrewPickerVisible, setHebrewPickerVisible] = useState(false);
  const [actionSheetDate, setActionSheetDate] = useState<Date | null>(null);
  const actionSheetRef = useRef<BottomSheet>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Measured height of the grid-rows area (below the header + day-name row,
  // above the tab bar) — set once via onLayout on the wrapping View. Never
  // assume a screen size; this must be correct on any device and survive
  // rotation (onLayout fires again on size change).
  const [gridAreaHeight, setGridAreaHeight] = useState(0);
  const onGridAreaLayout = useCallback((e: LayoutChangeEvent) => {
    setGridAreaHeight(e.nativeEvent.layout.height);
  }, []);

  // NoteEditor state — opened by addNote / addRecurring quick actions.
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);

  // Use actionSheetDate when set (the long-pressed day); fall back to
  // selectedDate so useNotes always receives a valid Date.
  const editorDate = actionSheetDate ?? selectedDate;
  const editorHebrewDate = useMemo(
    () => dateService.getDayData(editorDate).hebrewDate,
    [editorDate],
  );
  const { saveNote, refreshKey } = useNotes(editorDate);

  // ── Layout direction ───────────────────────────────────────────────────────
  // Hebrew mode: row-reverse → Sunday at right edge, Shabbat at left edge.
  // Gregorian mode: row (LTR) → Sunday at left edge, Saturday at right edge.
  const isRtl = isHebrew;

  // ── Day name selection ─────────────────────────────────────────────────────
  const dayNames = mode === 'hebrew'
    ? (firstDayOfWeek === 0 ? DAY_NAMES_HE_SUN_FIRST : DAY_NAMES_HE_MON_FIRST)
    : (firstDayOfWeek === 0 ? DAY_NAMES_EN_SUN_FIRST : DAY_NAMES_EN_MON_FIRST);
  // Index of the Shabbat column within the (logical, pre-flip) dayNames array —
  // drives the bold/tinted Shabbat header cell (Task 2c).
  const shabbatIndex = firstDayOfWeek === 0 ? 6 : 5;

  // ── Grid construction ──────────────────────────────────────────────────────
  // Compute the number of empty leading cells to align the first day of
  // the month to the correct column. The visual direction (RTL/LTR) is
  // handled by flexDirection on the row container — the offset itself is
  // the same for both modes.
  const startDayOffset = useMemo(() => {
    if (!gridData.length) return 0;
    const firstDay = gridData[0].gregorianDate.getDay();
    return firstDayOfWeek === 1 ? (firstDay + 6) % 7 : firstDay;
  }, [gridData, firstDayOfWeek]);

  // Build a 2-D array of weeks: each inner array has exactly 7 entries
  // (null for padding cells, DayData for real days).
  const weeks = useMemo<(DayData | null)[][]>(() => {
    if (!gridData.length) return [];
    const result: (DayData | null)[][] = [];
    let currentWeek: (DayData | null)[] = [];

    // Leading empty cells
    for (let i = 0; i < startDayOffset; i++) {
      currentWeek.push(null);
    }
    // Days of the month
    for (const day of gridData) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }
    // Trailing empty cells to complete the last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length === 7) result.push(currentWeek);

    return result;
  }, [gridData, startDayOffset]);

  // ── Notes for the displayed month ─────────────────────────────────────────
  const gridStart = useMemo(
    () => (gridData.length ? gridData[0].gregorianDate : new Date()),
    [gridData],
  );
  const gridEnd = useMemo(
    () => (gridData.length ? gridData[gridData.length - 1].gregorianDate : new Date()),
    [gridData],
  );
  const notesByDate = useDatesNotes(gridStart, gridEnd, refreshKey);

  // ── Date helpers ───────────────────────────────────────────────────────────
  const isSameDay = useCallback((a: Date, b: Date) => {
    return a.toDateString() === b.toDateString();
  }, []);

  // ── Deterministic row height ────────────────────────────────────────────────
  // rowHeight is computed ONCE for the whole grid from the measured available
  // height, then applied as an explicit height on every row (see gridRows
  // below and the weekRow style comment). This replaces the old flex:1 /
  // minHeight approach, which produced a different, unpredictable row height
  // per month (the 206px 6-week bug).
  const weekCount = weeks.length;

  const rowHeight = useMemo(() => {
    // Pre-measurement guard: onLayout hasn't fired yet (gridAreaHeight is
    // still 0) or there's nothing to lay out. Fall back to a sensible fixed
    // default rather than rendering 0-height rows or flashing.
    if (!weekCount || gridAreaHeight <= 0) return DEFAULT_ROW_HEIGHT;
    const raw = gridAreaHeight / weekCount;
    return Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, raw));
  }, [gridAreaHeight, weekCount]);

  // Scroll only when the computed rows genuinely don't fit the measured
  // area (e.g. MIN_ROW_HEIGHT floor pushes total height past what's
  // available on a very short screen / many-week month). A small epsilon
  // absorbs float rounding from the height/weekCount division so an exact
  // fit never triggers a spurious scroll container.
  const needsScroll = gridAreaHeight > 0 && rowHeight * weekCount > gridAreaHeight + 0.5;

  const selectedRowIndex = useMemo(
    () => weeks.findIndex((week) => week.some((day) => day != null && isSameDay(day.gregorianDate, selectedDate))),
    [weeks, selectedDate, isSameDay],
  );

  useEffect(() => {
    if (needsScroll && selectedRowIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: selectedRowIndex * rowHeight, animated: true });
    }
  }, [needsScroll, selectedRowIndex, rowHeight]);

  // ── Label computation ──────────────────────────────────────────────────────
  const getLabels = useCallback(
    (d: DayData): { primary: string; secondary: string } => {
      const greg   = d.gregorianDate.getDate().toString();
      const hebrew = toHebrewNumeral(d.hebrewDate.day);
      return mode === 'hebrew'
        ? { primary: hebrew, secondary: greg }
        : { primary: greg,   secondary: hebrew };
    },
    [mode],
  );

  // ── Interaction handlers ───────────────────────────────────────────────────

  const handleDayPress = useCallback(
    (dayData: DayData) => {
      if (isSameDay(dayData.gregorianDate, selectedDate)) {
        router.push('/(tabs)/day');
      } else {
        setSelectedDate(dayData.gregorianDate);
      }
    },
    [selectedDate, isSameDay, setSelectedDate, router],
  );

  const handleDayLongPress = useCallback(
    (dayData: DayData) => {
      setSelectedDate(dayData.gregorianDate);
      setActionSheetDate(dayData.gregorianDate);
      actionSheetRef.current?.expand();
    },
    [setSelectedDate],
  );

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      switch (action) {
        case 'addNote':
          setNoteEditorVisible(true);
          break;
        case 'addRecurring':
          setNoteEditorVisible(true);
          break;
        case 'viewDay':
          router.push('/(tabs)/day');
          break;
      }
    },
    [router],
  );

  // Jump-to-today — replaces the removed ‹ › arrows' only remaining common
  // use case. Moves both the navigation cursor (Gregorian month or Hebrew
  // month, whichever this grid is showing) and the selected day.
  const handleJumpToToday = useCallback(() => {
    setSelectedDate(today);
    if (isHebrew) {
      const { year, month } = dateService.getDayData(today).hebrewDate;
      navigateToHebrewMonth(year, month);
    } else {
      navigateToMonth(today.getFullYear(), today.getMonth() + 1);
    }
  }, [today, isHebrew, setSelectedDate, navigateToHebrewMonth, navigateToMonth]);

  // ── Swipe gesture ──────────────────────────────────────────────────────────
  const onSwipe = useCallback((vx: number) => navigate(swipeDirection(vx)), [navigate]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 400) runOnJS(onSwipe)(e.velocityX);
    });

  // ── Month title computation ────────────────────────────────────────────────
  const gregMonthName = useMemo(
    () => `${MONTHS_HE_FULL[currentMonth - 1]} ${currentYear}`,
    [currentMonth, currentYear],
  );

  const hebrewMonthTitle = useMemo(() => {
    if (!gridData.length) return '';
    return `${gridData[0].hebrewDate.monthName} ${toHebrewYear(gridData[0].hebrewDate.year)}`;
  }, [gridData]);

  // Gregorian range subtitle for the Hebrew tab — a Hebrew month usually spans
  // two Gregorian months, so show the actual range spanned by the grid rather
  // than a single midpoint month (Task 2a).
  const gregRangeSubtitle = useMemo(() => {
    if (!gridData.length) return '';
    return formatGregorianRange(gridData[0].gregorianDate, gridData[gridData.length - 1].gregorianDate);
  }, [gridData]);

  // Hebrew range subtitle for the Gregorian tab — same idea, mirrored.
  const hebrewRangeSubtitle = useMemo(() => {
    if (!gridData.length) return '';
    return formatHebrewRange(gridData[0].hebrewDate, gridData[gridData.length - 1].hebrewDate);
  }, [gridData]);

  const primaryTitle   = mode === 'hebrew' ? hebrewMonthTitle    : gregMonthName;
  const secondaryTitle = mode === 'hebrew' ? gregRangeSubtitle   : hebrewRangeSubtitle;

  // ── Render ─────────────────────────────────────────────────────────────────

  // Extract grid rows into a const so the conditional wrapper below doesn't
  // duplicate the JSX. All variables (getLabels, today, selectedDate,
  // notesByDate, handlers) are in scope here, above the return.
  const gridRows = weeks.map((week, wIdx) => (
    <View
      key={wIdx}
      style={[styles.weekRow, { height: rowHeight, flexDirection: isRtl ? 'row-reverse' : 'row' }]}
    >
      {week.map((day, dIdx) => {
        if (!day) {
          return <View key={`e-${wIdx}-${dIdx}`} style={styles.emptyCell} />;
        }

        const { primary, secondary } = getLabels(day);
        const isToday    = isSameDay(day.gregorianDate, today);
        const isSelected = isSameDay(day.gregorianDate, selectedDate);
        const isFriday   = day.gregorianDate.getDay() === 5;
        const dayKey     = formatDateKey(day.gregorianDate);
        const dayNotes   = notesByDate.get(dayKey) ?? [];
        const tags       = buildDayTags(day, dayNotes);

        return (
          <View key={day.gregorianDate.toISOString()} style={styles.cellWrapper}>
            <DayCell
              primaryLabel={primary}
              secondaryLabel={secondary}
              isToday={isToday}
              isSelected={isSelected}
              isShabbat={day.hebrewDate.isShabbat}
              isHoliday={day.isYomTov || day.holidays.length > 0}
              isFriday={isFriday}
              tags={tags}
              onPress={() => handleDayPress(day)}
              onLongPress={() => handleDayLongPress(day)}
            />
          </View>
        );
      })}
    </View>
  ));

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* Merged header — hamburger (left) + tappable two-line title (center)
            + jump-to-today (right). Replaces the old stacked ScreenHeader +
            arrows-header pair; index.tsx/gregorian.tsx no longer render
            ScreenHeader at all so there is exactly one header row. */}
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, paddingTop: (StatusBar.currentHeight ?? 0) + 8 },
          ]}
        >
          <Pressable
            onPress={openDrawer}
            hitSlop={12}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="פתח תפריט"
          >
            <Menu size={24} color={colors.textPrimary} />
          </Pressable>

          <Pressable
            onPress={() => {
              if (mode === 'hebrew') setHebrewPickerVisible(true);
              else setPickerVisible(true);
            }}
            style={styles.titleBlock}
            accessibilityRole="button"
            accessibilityLabel={`${primaryTitle}, ${secondaryTitle}, לבחירת חודש`}
          >
            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
              {primaryTitle}
            </Text>
            <Text style={[styles.monthSubtitle, { color: colors.textSecondary }]}>
              {secondaryTitle}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleJumpToToday}
            hitSlop={12}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="עבור להיום"
          >
            <CalendarCheck size={24} color={colors.accent} />
          </Pressable>
        </View>

        {/* Day Name Headers — direction driven by mode; always pinned above grid.
            Shabbat column is bold + tinted (Task 2c). */}
        <View style={[styles.dayNames, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
          {dayNames.map((name, i) => {
            const isShabbatCol = i === shabbatIndex;
            return (
              <Text
                key={i}
                style={[
                  styles.dayName,
                  { color: isShabbatCol ? colors.tagShabbat : colors.textTertiary },
                  isShabbatCol && styles.dayNameShabbat,
                ]}
              >
                {name}
              </Text>
            );
          })}
        </View>

        {/* Calendar Grid — View-based 7-column layout.
            gridArea is measured once via onLayout; rowHeight is derived from
            that measurement and weekCount (see above) and applied as an
            explicit height on every row. Only scrolls when the computed
            rows genuinely exceed the measured area — otherwise a plain View
            renders them with no dead space and no scroll container. */}
        <View style={styles.gridArea} onLayout={onGridAreaLayout}>
          {needsScroll ? (
            <ScrollView
              ref={scrollRef}
              style={styles.gridScroll}
              showsVerticalScrollIndicator={false}
              scrollEnabled={true}
            >
              {gridRows}
            </ScrollView>
          ) : (
            <View style={styles.gridStatic}>{gridRows}</View>
          )}
        </View>

        {/* Month/Year Picker — Gregorian mode only */}
        <MonthYearPicker
          visible={pickerVisible}
          currentYear={currentYear}
          currentMonth={currentMonth}
          colors={colors}
          onSelect={navigateToMonth}
          onClose={() => setPickerVisible(false)}
        />

        {/* Hebrew date drum picker — Hebrew mode only */}
        {mode === 'hebrew' && (
          <HebrewDatePicker
            visible={hebrewPickerVisible}
            initialHYear={currentHebrewYear}
            initialHMonth={currentHebrewMonth}
            onConfirm={(hYear, hMonth) => {
              navigateToHebrewMonth(hYear, hMonth);
              setHebrewPickerVisible(false);
            }}
            onDismiss={() => setHebrewPickerVisible(false)}
          />
        )}

        {/* NoteEditor — opened by addNote / addRecurring quick actions */}
        <NoteEditor
          visible={noteEditorVisible}
          date={editorDate}
          hebrewDate={editorHebrewDate}
          colors={colors}
          onClose={() => setNoteEditorVisible(false)}
          onSave={saveNote}
        />

        {/* Quick Action Sheet — opened on day long-press */}
        <QuickActionSheet
          ref={actionSheetRef}
          date={actionSheetDate}
          onAction={handleQuickAction}
          onClose={() => actionSheetRef.current?.close()}
        />

      </View>
    </GestureDetector>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

// ── Row-height model ─────────────────────────────────────────────────────────
// A calendar row needs a deterministic height — the same row height for
// every day in the grid, computed once from the measured available space,
// never left to flex-stretch (which produced a different, unpredictable
// height per month — the 206px 6-week bug this fix replaces).
//
// MIN_ROW_HEIGHT: rows must stay comfortably tappable even on a short
// screen or a 6-week month; 88 sits just under the pre-fix 92px floor
// (which was already well clear of the 48dp Android touch-target minimum).
// MAX_ROW_HEIGHT: caps rows from growing oversized on short months / tall
// screens; 132 sits just above the approved design's observed ~127px for a
// 5-week month, matching that look with a couple of px of headroom.
// DEFAULT_ROW_HEIGHT: pre-measurement fallback only (see the rowHeight
// guard) — matches the pre-redesign app's fixed 110px row height, a value
// already proven comfortable, so the very first frame never renders
// 0-height rows or flashes before onLayout fires.
const MIN_ROW_HEIGHT = 88;
const MAX_ROW_HEIGHT = 132;
const DEFAULT_ROW_HEIGHT = 110;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    padding: 6, // combined with hitSlop(12) clears the 48dp touch-target floor
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  monthTitle: {
    ...withFontFamily(typography.screenTitle),
    textAlign: 'center',
  },
  monthSubtitle: {
    ...withFontFamily(typography.subtitle),
    marginTop: 1,
    textAlign: 'center',
  },

  // Day name header row — flexDirection set inline based on mode
  dayNames: { paddingTop: 8, paddingBottom: 8 },
  dayName: {
    flex: 1,
    textAlign: 'center',
    ...withFontFamily(typography.caption),
    letterSpacing: 0.3,
  },
  dayNameShabbat: { ...withFontFamily(typography.caption, '700') },

  // Measured container for the whole grid-rows area — onLayout on this View
  // is the ONLY source of truth for gridAreaHeight (never assume a screen
  // size). flex: 1 bounds it between the day-name header above and the tab
  // bar below, whatever their combined height turns out to be on this device.
  gridArea: { flex: 1 },

  // Wraps gridRows in the non-scrolling case — plain View, no flex sizing
  // needed since every row already carries its own explicit height.
  gridStatic: {},

  // Week rows — flexDirection set inline based on mode; height set inline
  // per-row from the computed `rowHeight` (see the row-height model comment
  // above `MIN_ROW_HEIGHT`). Deliberately NOT flex/minHeight: an explicit,
  // deterministic height is load-bearing here — leaving row height fully
  // inferred (or stretch-derived) is exactly the bug this fix replaces, and
  // the same class of Yoga circular-height bug that once collapsed a row to
  // ~8px elsewhere in this file's history (see DayCell's CELL_MIN_HEIGHT
  // comment for the sibling case).
  weekRow: {},

  // Cell containers — flex: 1 distributes each cell to 1/7 of row width.
  // alignItems: 'stretch' (default on weekRow) makes cellWrapper fill the
  // row's explicit height so DayCell's flex:1 inside it expands correctly.
  cellWrapper: { flex: 1 },
  emptyCell:   { flex: 1 }, // height comes from weekRow's explicit height

  // ScrollView wrapper for months whose computed rows exceed the measured
  // area. flex: 1 bounds it within gridArea so it can actually scroll
  // rather than expanding freely.
  gridScroll: { flex: 1 },
});
