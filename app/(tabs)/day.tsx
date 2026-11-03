// app/(tabs)/day.tsx
// Phase 3.5 — Day screen. Full implementation per docs/SCREENS.md.
// Phase 3.7a-1 — ScreenHeader added (outside ScrollView, stays fixed).
// C2 — Hourly schedule moved to events tab; real hour bucketing; tab reset on date change.
// Phase 5 layout pass — "highlights strip" restructure (real-device feedback):
//   the duplicate date hero (ScreenHeader already shows both dates) was removed,
//   and holiday banner / parasha / Omer / Rosh Chodesh / ShabbatCard were hoisted
//   above the tab control so they render — uniformly, every day — before the
//   user has to pick a tab. Everything below ScreenHeader now lives in ONE
//   ScrollView (highlights → tab bar → tab content), replacing the previous
//   fixed-outside-ScrollView tab bar.
// Phase 6 device-feedback pass (three fixes, one screen):
//   1. Tab bar — each tab now takes an even flex:1 share of the row instead of
//      hugging its own content width, so the active-tab underline reads as
//      "half the bar", not a stray line lost against the full-width row.
//   2. Outer auto-scroll REMOVED entirely (it used to scroll the whole page —
//      including the highlights strip above it — to bring "now" into view,
//      which on a Friday pushed the parasha/candle-lighting content off
//      screen). Replaced with a data-driven hour WINDOW: the hourly grid only
//      renders the hours that could plausibly matter (a default daytime band,
//      widened to cover any actual timed events with 1hr of padding), so it's
//      short enough that no scrolling is needed to see today's content.
//   3. The former "תורה וזמנים" tab is split: the always-useful zmanim moved
//      UP into the highlights strip as a compact KeyZmanimCard (every day),
//      and the tab itself is renamed "לימוד", keeping only the daily learning
//      rows (Daf Yomi / Rambam / Tanach-Nach) that have no home in the strip.
//
// NoteEditor adaptation note (vs. original Phase 3.5 spec):
//   NoteEditor is a React Native Modal component, not a @gorhom/bottom-sheet.
//   It is controlled via `visible: boolean` prop (not a forwardRef + expand/close).
//   It also requires `colors: ThemeColors` passed in rather than calling
//   useThemeColors internally. The ref-based pattern in the spec was adapted
//   to a useState boolean accordingly.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useSettingsStore } from '../../src/providers/SettingsProvider';
import { useLocationStore } from '../../src/providers/LocationProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import type { ThemeColors } from '../../src/hooks/useThemeColors';
import { useZmanim } from '../../src/hooks/useZmanim';
import { useNotes, type CalendarNote } from '../../src/hooks/useNotes';
import { ShabbatCard } from '../../src/components/zmanim/ShabbatCard';
import { formatZmanTime, type ZmanimResult } from '../../src/services/ZmanimService';
import { NoteEditor } from '../../src/components/notes/NoteEditor';
import { NoteList } from '../../src/components/notes/NoteList';
import { Card } from '../../src/components/ui/Card';
import { SectionLabel } from '../../src/components/ui/SectionLabel';
import {
  dateService,
  toHebrewNumeral,
  type DayData,
} from '../../src/services/DateService';
import { radius } from '../../src/constants/radius';
import { typography, withFontFamily } from '../../src/constants/typography';
import { findNearestCity } from '../../src/utils/locationLookup';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';
import { useDatePicker } from '../../src/hooks/useDatePicker';
import { Fab } from '../../src/components/ui/Fab';
import { ParashaBookIcon } from '../../src/components/icons/FigmaIcons';
import { elevation } from '../../src/constants/elevation';
import {
  weekdayNameHe,
  hebrewFullDate,
  gregFullDate,
} from '../../src/utils/hebrewLabels';
import { swipeDirection } from '../../src/constants/layout';

// Hourly grid layout constant — row height, used by the row style.
// Figma: an empty hour row is 34 tall (padding 8 + 18 + 8).
const HOUR_ROW_HEIGHT = 34;
// Default hourly-grid window when the day has no timed events at all —
// "roughly 07:00–22:00", a sensible daytime band with no wall of empty rows.
const DEFAULT_TIMELINE_START_HOUR = 7;
const DEFAULT_TIMELINE_END_HOUR = 22;
// Vertical padding above the first item in the ScrollView's content.
const CONTENT_TOP_PADDING = 14;

// Hourly-grid event block color: mirrors NoteList's colorId/noteType → tag
// token mapping (that helper is local/unexported to NoteList.tsx, which is
// out of this file's ownership, so it is intentionally re-derived here
// rather than imported). Only the two tokens that already back real note
// categories in colors.ts are used — birthday/yahrzeit/anniversary read as
// "personal", plain notes as "event".
type CategoryColorKey = 'tagEvent' | 'tagPersonal';
const CATEGORY_TOKENS: Record<CategoryColorKey, { fg: keyof ThemeColors; bg: keyof ThemeColors }> = {
  tagEvent: { fg: 'tagEvent', bg: 'tagEventBg' },
  tagPersonal: { fg: 'tagPersonal', bg: 'tagPersonalBg' },
};
function resolveNoteCategoryKey(note: CalendarNote): CategoryColorKey {
  if (note.colorId === 'tagPersonal' || note.colorId === 'tagEvent') return note.colorId;
  return note.noteType === 'note' ? 'tagEvent' : 'tagPersonal';
}

export default function DayScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const use24hTime = useSettingsStore((s) => s.use24hTime);
  const hebrewOnTop = useSettingsStore((s) => s.hebrewOnTop);
  const { latitude: locationLat, longitude: locationLng, placeName: locationPlaceName } = useLocationStore();

  // Derive DayData for the selected date — month is cached, so cheap.
  const dayData = useMemo<DayData>(
    () => dateService.getDayData(selectedDate),
    [selectedDate],
  );

  const zmanim = useZmanim(selectedDate);

  // Resolved location name for ShabbatCard — LocationProvider is now the
  // single source of truth and always carries a display name; fall back to
  // the nearest-city lookup in the rare case placeName is unresolved (e.g.
  // a GPS fix outside the curated cities with a failed reverse-geocode).
  const resolvedLocationName = useMemo<string | null>(() => {
    if (locationPlaceName) return locationPlaceName;
    const { city } = findNearestCity(locationLat, locationLng);
    return city.nameHe;
  }, [locationPlaceName, locationLat, locationLng]);

  // Date picker — Phase 4.4
  const { openPicker, picker } = useDatePicker(selectedDate, setSelectedDate);

  // Notes for this day. Used for:
  //   1. Hour bucketing in the hourly grid (timed notes)
  //   2. NoteEditor for adding/editing from the grid
  // NoteList has its own internal useNotes — that's the existing pattern; not refactored here.
  // C3: also destructure deleteOccurrence + saveOccurrenceException so the grid NoteEditor
  // can handle per-occurrence edit/delete dialogs on recurring timed events.
  const { notes, saveNote, deleteNote, deleteOccurrence, saveOccurrenceException } = useNotes(selectedDate);

  // NoteEditor visibility — NoteEditor is Modal-based, not BottomSheet.
  // Controlled via visible boolean prop instead of a ref.
  const [editorVisible, setEditorVisible] = useState(false);
  // The note being edited from the hourly grid (null = adding new note).
  const [gridEditNote, setGridEditNote] = useState<CalendarNote | undefined>(undefined);

  // Internal tab state — defaults to 'events', no persistence.
  // Phase 6: 'torah' renamed 'learning' — the tab now holds ONLY the daily
  // learning rows; zmanim moved up into the always-visible highlights strip.
  const [activeTab, setActiveTab] = useState<'events' | 'learning'>('events');

  // C2: Reset to events tab whenever the selected date changes.
  // This prevents the user from landing on the learning tab when swiping days.
  useEffect(() => {
    setActiveTab('events');
  }, [selectedDate]);

  const openNoteEditor = useCallback(() => {
    setGridEditNote(undefined);
    setEditorVisible(true);
  }, []);

  const openGridNoteEditor = useCallback((note: CalendarNote) => {
    setGridEditNote(note);
    setEditorVisible(true);
  }, []);

  const closeNoteEditor = useCallback(() => {
    setEditorVisible(false);
    setGridEditNote(undefined);
  }, []);

  // Day navigation — swipe left/right to move days
  const navigateDay = useCallback(
    (direction: 1 | -1) => {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + direction);
      setSelectedDate(next);
    },
    [selectedDate, setSelectedDate],
  );

  const onSwipe = useCallback((vx: number) => navigateDay(swipeDirection(vx)), [navigateDay]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 400) runOnJS(onSwipe)(e.velocityX);
    });

  // Navigate to the dedicated Zmanim tab — used by the "כל הזמנים →" link on
  // the compact KeyZmanimCard. `(tabs)` is a route group (doesn't appear in
  // the URL), so the sibling screen is addressed as `/zmanim`.
  const goToZmanimTab = useCallback(() => {
    router.push('/zmanim' as any); // eslint-disable-line @typescript-eslint/no-explicit-any
  }, [router]);

  // C2: Real hour bucketing — timed notes bucketed by their start hour (0–23).
  // All-day notes (isAllDay === true) are excluded; they appear in NoteList above.
  const notesByHour = useMemo(() => {
    const map: Record<number, CalendarNote[]> = {};
    for (const note of notes) {
      if (!note.isAllDay && note.startDateTime) {
        const d = new Date(note.startDateTime);
        if (!isNaN(d.getTime())) {
          const hour = d.getHours();
          if (!map[hour]) map[hour] = [];
          map[hour].push(note);
        }
      }
    }
    return map;
  }, [notes]);

  const hasTimedEvents = Object.keys(notesByHour).length > 0;

  /** Format HH:MM for the grid label, honoring use24hTime. */
  const formatHM = useCallback((date: Date): string => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24hTime,
    });
  }, [use24hTime]);

  // Hourly-grid window — data-driven, NOT an auto-scroll. Replaces the old
  // "scroll the page to the current hour" behavior (removed: it scrolled the
  // OUTER ScrollView, which also contains the highlights strip above the
  // grid, pushing the parasha card and — on Fridays — the candle-lighting
  // table off screen). Instead, the grid itself is sized to a useful window:
  // a default daytime band, widened just enough to cover the day's actual
  // timed events (with 1hr of padding on each side) when there are any.
  // Clamped to the valid 0–23 hour range.
  const timelineHourRange = useMemo(() => {
    const eventHours = Object.keys(notesByHour).map(Number);
    if (eventHours.length === 0) {
      return { start: DEFAULT_TIMELINE_START_HOUR, end: DEFAULT_TIMELINE_END_HOUR };
    }
    const earliestEventHour = Math.min(...eventHours);
    const latestEventHour = Math.max(...eventHours);
    return {
      start: Math.max(0, Math.min(earliestEventHour - 1, DEFAULT_TIMELINE_START_HOUR)),
      end: Math.min(23, Math.max(latestEventHour + 1, DEFAULT_TIMELINE_END_HOUR)),
    };
  }, [notesByHour]);

  const timelineHours = useMemo(() => {
    const hours: number[] = [];
    for (let h = timelineHourRange.start; h <= timelineHourRange.end; h++) hours.push(h);
    return hours;
  }, [timelineHourRange]);

  const isHoliday = dayData.isYomTov || dayData.holidays.length > 0;
  const primaryHoliday = dayData.holidays[0];

  // Parasha card — shown every day: Shabbat itself uses `parasha` (the
  // current Shabbat's reading); every other day uses `upcomingParasha`
  // (the coming Shabbat's reading, populated daily by DateService).
  // undefined on both fields (e.g. a Yom Tov week with a special holiday
  // reading instead of a regular parasha) renders nothing — no empty card.
  const dayOfWeek = selectedDate.getDay(); // 5 = Friday, 6 = Saturday
  const parashaCardName = dayOfWeek === 6 ? dayData.parasha : dayData.upcomingParasha;

  // Rosh Chodesh banner — mirrors the exact de-duplication rule in
  // src/utils/tagMapper.ts: suppressed when the day is already a Yom Tov
  // (e.g. Rosh Hashana, which is both) or when hebcal already emitted a
  // "Rosh Chodesh ..." entry into holidays[] (the holiday banner above
  // already covers it) — avoids a "ראש חודש" / "ראש חודש סיון" double.
  const hasRoshChodeshHoliday = dayData.holidaysEn.some((h) => h.startsWith('Rosh Chodesh'));
  const showRoshChodesh = dayData.hebrewDate.isRoshChodesh && !dayData.isYomTov && !hasRoshChodeshHoliday;

  // Learning tab content — Daf Yomi + Rambam (as before) plus a single
  // Tanach/Nach row: Nach Yomi preferred, falling back to Tanakh Yomi when
  // Nach Yomi has no item for the day. (The full 7-schedule breakdown lives
  // in the dedicated Details screen via the drawer — not duplicated here.)
  const tanachItem = dayData.nachYomi ?? dayData.tanakhYomi;
  const tanachLabel = dayData.nachYomi ? 'נ״ך יומי' : 'תנ״ך יומי';
  const hasLearningItems = !!(dayData.dafYomi || dayData.rambamOneChapter || tanachItem);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* ScreenHeader already renders the compact bilingual date (Hebrew +
            Gregorian) and is the tappable date-picker affordance — no
            separate date hero needed below it. */}
        {/* Figma: weekday above the date (19 Bold); the other calendar's
            date is the first line of the content. hebrewOnTop picks which
            calendar is the header date. */}
        <ScreenHeader
          title={hebrewOnTop ? hebrewFullDate(selectedDate) : gregFullDate(selectedDate)}
          subtitle={weekdayNameHe(selectedDate)}
          subtitleAbove
          subtitleSize="bodySmall"
          onTitlePress={openPicker}
          titleAccessibilityLabel="בחר תאריך"
          onJumpToToday={() => setSelectedDate(new Date())}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[1]}
        >
          {/* ── Highlights strip — a SINGLE wrapper View, so it is always
              exactly one direct child of the ScrollView regardless of how
              many of the conditional items inside it render on a given day.
              This keeps the tab bar's index below fixed at 1 in every case —
              a plain weekday (parasha card only) and a Friday (parasha +
              ShabbatCard) both produce the same top-level child count.
              (ScrollView resolves stickyHeaderIndices against
              React.Children.toArray(children), which DROPS falsy `cond &&
              <X/>` entries entirely — so if these banners were direct
              ScrollView children instead of wrapped here, the tab bar's
              index would shift by day and a hardcoded number would break.)
              Each item inside still guards its own empty state so a day with
              nothing special collapses cleanly with no empty cards or stray
              gaps. */}
          <View>
            <Text style={[styles.secondaryDate, { color: colors.textTertiary }]}>
              {hebrewOnTop ? gregFullDate(selectedDate) : hebrewFullDate(selectedDate)}
            </Text>

            {isHoliday && primaryHoliday && (
              <View style={[styles.infoBanner, { backgroundColor: colors.tagHolidayBg, borderColor: colors.tagHoliday }]}>
                <Text style={[styles.infoBannerText, { color: colors.tagHoliday }]}>
                  ✡ {primaryHoliday}
                </Text>
              </View>
            )}

            {parashaCardName && (
              <ParashaCard colors={colors} label="פרשת השבוע" name={parashaCardName} />
            )}

            {dayData.omerDay !== undefined && (
              <View style={[styles.infoBanner, { backgroundColor: colors.tagSpecialBg, borderColor: colors.tagSpecial }]}>
                <Text style={[styles.infoBannerText, { color: colors.tagSpecial }]}>
                  {`ספירת העומר — יום ${toHebrewNumeral(dayData.omerDay)} לעומר`}
                </Text>
              </View>
            )}

            {showRoshChodesh && (
              <View style={[styles.infoBanner, { backgroundColor: colors.tagSpecialBg, borderColor: colors.tagSpecial }]}>
                <Text style={[styles.infoBannerText, { color: colors.tagSpecial }]}>
                  ראש חודש
                </Text>
              </View>
            )}

            {/* Shabbat Card — returns null on non-Fri/Sat days. Props/logic untouched. */}
            <ShabbatCard
              selectedDate={selectedDate}
              candleLightingTime={zmanim.candleLighting}
              tzaisTime={zmanim.tzeitHakochavim}
              rabbeinuTamTime={zmanim.tzeitRabbeinu}
              locationName={resolvedLocationName}
              use24h={use24hTime}
            />

            {/* Key zmanim — every day, right after ShabbatCard. A short
                "checked daily" subset; the full 14-row list lives in the
                dedicated זמנים tab (link below). Candle-lighting is skipped
                here on Fridays — ShabbatCard already shows it above. */}
            <KeyZmanimCard
              colors={colors}
              zmanim={zmanim}
              use24h={use24hTime}
              onSeeAll={goToZmanimTab}
            />
          </View>

          {/* Tab bar — pinned to the top via stickyHeaderIndices={[1]} above
              once the highlights strip (index 0) scrolls past it.

              IMPORTANT — do not collapse this back into a single View.
              React Native's ScrollViewStickyHeader (Libraries/Components/
              ScrollView/ScrollViewStickyHeader.js) hoists whatever style is
              on the sticky child onto ITS OWN wrapper Animated.View, then
              hands the original child back only `{ flex: 1 }`:
                style={[child.props.style, styles.header, {transform: ...}]}
                {React.cloneElement(child, { style: styles.fill, ... })}
              If the sticky element itself were the row (flexDirection:
              'row-reverse'), that row-reverse would land on the wrapper —
              which has a single child, so it does nothing — while the row
              View underneath is left with only flex:1 and falls back to the
              column/stretch default, stacking the two tabs full-width
              instead of side by side. The fix is to give
              stickyHeaderIndices={[1]} a plain OUTER View (tabBarOuter,
              chrome only: background + bottom padding), and keep the actual
              row (segTrack, flexDirection row-reverse) as an inner child
              one level down, where RN's hoisting can't reach it.

              The outer View must carry the opaque background (matching the
              screen root), because that style is what
              ends up on the wrapper Animated.View — the element that
              actually paints while the bar is docked at the top. If the
              background were only on the inner row, content scrolling
              underneath would show through around/behind it while docked. */}
          <View style={[styles.tabBarOuter, { backgroundColor: colors.background }]}>
            {/* Figma: pill segmented control (track surfaceMuted, active
                segment surface + sm shadow). RTL: 'אירועים' first in JSX →
                renders on the right. Segments are 33 tall like the frame;
                hitSlop keeps the touch target at 48. */}
            <View style={[styles.segTrack, { backgroundColor: colors.surfaceMuted }]}>
              {(['events', 'learning'] as const).map((tab) => {
                const active = activeTab === tab;
                const label = tab === 'events' ? 'אירועים' : 'לימוד';
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    hitSlop={{ top: 8, bottom: 8 }}
                    style={[styles.segItem, active && [styles.segItemActive, { backgroundColor: colors.surface }]]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={label}
                  >
                    <Text
                      style={[
                        active ? styles.segTextActive : styles.segText,
                        { color: active ? colors.textPrimary : colors.textTertiary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {activeTab === 'events' ? (
            // ── Events tab ─────────────────────────────────────────────────
            // Shows: all-day notes only (NoteList onlyAllDay) + add button +
            // hourly schedule grid with timed notes bucketed by start hour.
            <>
              {/* All-day notes only — timed events appear in the hourly grid below */}
              <NoteList
                date={selectedDate}
                hebrewDate={dayData.hebrewDate}
                hideAddButton
                onlyAllDay
              />

              {/* Hourly schedule — C2: moved from torah tab to events tab.
                  Timed notes bucketed by getHours() of startDateTime.
                  Renders only the computed timelineHours window (see
                  timelineHourRange above) — no auto-scroll needed. */}
              <View style={styles.section}>
                {!hasTimedEvents && (
                  <Text style={[styles.timelineEmptyHint, { color: colors.textTertiary }]}>
                    אין אירועים ליום זה
                  </Text>
                )}

                {/* Figma: the hours sit inside a card (surface, border, r14). */}
                <View style={[styles.scheduleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>

                {timelineHours.map((hour) => {
                  const hourLabel = hour.toString().padStart(2, '0') + ':00';
                  const hourNotes = notesByHour[hour] ?? [];

                  return (
                    // RTL fix: explicit row-reverse (not plain 'row') — with
                    // row-reverse the FIRST JSX child lands RIGHT, so the
                    // gutter (hourLabel, last child) lands LEFT and the
                    // event content (first child) fills the reading-start
                    // side, matching detailRow's convention above.
                    <View key={hour} style={[styles.hourRow, { borderTopColor: colors.borderSubtle }]}>
                      <View style={styles.hourContent}>
                        {hourNotes.map((note) => {
                          const startDate = new Date(note.startDateTime!);
                          const endDate = note.endDateTime ? new Date(note.endDateTime) : null;
                          // Figma: "09:00 – 10:00" when the event has an end time.
                          const timeStr = endDate && !isNaN(endDate.getTime())
                            ? `${formatHM(startDate)} – ${formatHM(endDate)}`
                            : formatHM(startDate);
                          const catKey = resolveNoteCategoryKey(note);
                          const catTokens = CATEGORY_TOKENS[catKey];
                          return (
                            <Pressable
                              key={note.id}
                              onPress={() => openGridNoteEditor(note)}
                              style={[
                                styles.hourNote,
                                { backgroundColor: colors[catTokens.bg] },
                              ]}
                              accessibilityRole="button"
                              accessibilityLabel={`${note.summary}, ${timeStr}`}
                            >
                              <Text style={[styles.hourNoteTitle, { color: colors[catTokens.fg] }]}>
                                {note.summary}
                              </Text>
                              <Text style={[styles.hourNoteTime, { color: colors[catTokens.fg] }]}>
                                {timeStr}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Text style={[styles.hourLabel, { color: colors.textTertiary }]}>
                        {hourLabel}
                      </Text>
                    </View>
                  );
                })}
                </View>
              </View>
            </>
          ) : (
            // ── Learning tab ───────────────────────────────────────────────
            // Parasha, Omer, holiday banner and zmanim now live in the
            // highlights strip above (shown every day, not just here) — kept
            // out of this tab to avoid duplicating them. This tab keeps only
            // the daily learning rows with no home in the strip: Daf Yomi,
            // Rambam, and a single Tanach/Nach row (see tanachItem above).
            <View style={styles.section}>
              {hasLearningItems ? (
                <Card colors={colors} inset={0}>
                  {dayData.dafYomi && (
                    <DetailRow
                      label="דף יומי"
                      value={dayData.dafYomi.display}
                      colors={colors}
                      actionLabel="→ ספריא"
                      onAction={() => Linking.openURL(dayData.dafYomi!.url)}
                    />
                  )}

                  {dayData.rambamOneChapter && (
                    <DetailRow
                      label='רמב״ם יומי'
                      value={dayData.rambamOneChapter.display}
                      colors={colors}
                      actionLabel="→ ספריא"
                      onAction={() => Linking.openURL(dayData.rambamOneChapter!.url)}
                    />
                  )}

                  {tanachItem && (
                    <DetailRow
                      label={tanachLabel}
                      value={tanachItem.display}
                      colors={colors}
                      actionLabel="→ ספריא"
                      onAction={() => Linking.openURL(tanachItem.url)}
                    />
                  )}
                </Card>
              ) : (
                <Text style={[styles.timelineEmptyHint, { color: colors.textTertiary }]}>
                  אין פריטי לימוד ליום זה
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Quick-add FAB (Figma) — replaces the inline "+ הוסף אירוע" button */}
        <Fab onPress={openNoteEditor} />

        {/* Note Editor — Modal-based, controlled via visible prop.
            Serves both the "add new event" button and the hourly grid taps.
            NoteEditor requires colors passed in (does not call useThemeColors
            internally). saveNote (async → Promise<void>) is assignable to
            onSave (→ void) because void in callback position means the caller
            does not use the return value. */}
        {/* C3: onDelete, onDeleteOccurrence, onSaveOccurrenceException wired so that
            editing or deleting a recurring timed instance from the hourly grid
            correctly shows the per-occurrence / all-series choice dialogs. */}
        <NoteEditor
          visible={editorVisible}
          note={gridEditNote}
          date={selectedDate}
          hebrewDate={dayData.hebrewDate}
          colors={colors}
          onClose={closeNoteEditor}
          onSave={saveNote}
          onDelete={deleteNote}
          onDeleteOccurrence={deleteOccurrence}
          onSaveOccurrenceException={saveOccurrenceException}
        />

        {/* Date picker — Phase 4.4; rendered outside ScrollView */}
        {picker}
      </View>
    </GestureDetector>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function ParashaCard({
  colors,
  label,
  name,
}: {
  colors: ThemeColors;
  label: string;
  name: string;
}) {
  return (
    <View style={[styles.parashaCard, { backgroundColor: colors.tagShabbatBg }]}>
      {/* row-reverse, JSX order: text block first (right, flex:1) → icon last (left) */}
      <View style={styles.parashaTextBlock}>
        <Text style={[styles.parashaCaption, { color: colors.tagShabbat }]}>{label}</Text>
        <Text style={[styles.parashaName, { color: colors.tagShabbat }]}>{name}</Text>
      </View>
      <ParashaBookIcon size={26} color={colors.tagShabbat} />
    </View>
  );
}

// Compact "checked every day" zmanim card — shown in the highlights strip on
// every day. Reuses the same zmanim data (`useZmanim`, already computed by
// the parent) and the same Card/SectionLabel visual language as the rest of
// the app; does not compute or touch any zmanim/halachic math itself. The
// full 14-row breakdown lives in ZmanimList on the dedicated זמנים tab —
// this card links there via `onSeeAll` rather than duplicating it.
function KeyZmanimCard({
  colors,
  zmanim,
  use24h,
  onSeeAll,
}: {
  colors: ThemeColors;
  zmanim: ZmanimResult;
  use24h: boolean;
  onSeeAll: () => void;
}) {
  const rows: [string, Date | null][] = [
    ['עלות השחר', zmanim.alotHashachar],
    ['הנץ החמה', zmanim.netz],
    ['סוף זמן ק״ש (גר״א)', zmanim.sofZmanShmaGRA],
    ['חצות', zmanim.chatzot],
    ['שקיעה', zmanim.shkia],
    ['צאת הכוכבים', zmanim.tzeitHakochavim],
  ];

  return (
    <View style={styles.keyZmanimWrap}>
      <SectionLabel title="זמני היום" colors={colors} inset={0} gapAbove={0} />
      <Card colors={colors} inset={0}>
        {rows.map(([label, time]) => (
          <KeyZmanRow key={label} label={label} time={time} use24h={use24h} colors={colors} />
        ))}
      </Card>
      <Pressable
        onPress={onSeeAll}
        style={styles.seeAllZmanimBtn}
        accessibilityRole="button"
        accessibilityLabel="כל הזמנים, מעבר למסך זמנים"
        hitSlop={8}
      >
        <Text style={[styles.seeAllZmanimText, { color: colors.accent }]}>
          כל הזמנים →
        </Text>
      </Pressable>
    </View>
  );
}

// Single zmanim row inside KeyZmanimCard — `isLast` auto-injected by Card
// (see Card.tsx) so the bottom hairline is correctly suppressed on the last
// visible row. Mirrors ZmanimList's ZmanRow.
function KeyZmanRow({
  label,
  time,
  use24h,
  colors,
  isLast = false,
}: {
  label: string;
  time: Date | null;
  use24h: boolean;
  colors: ThemeColors;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.keyZmanRow,
        { backgroundColor: colors.surface },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
      ]}
    >
      {/* row-reverse, JSX order: label (flex:1, right) → time (left) */}
      <Text style={[styles.keyZmanLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.keyZmanTime, { color: colors.textPrimary }]}>
        {formatZmanTime(time, use24h)}
      </Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
  actionLabel,
  onAction,
  isLast = false,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
  actionLabel?: string;
  onAction?: () => void;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        { backgroundColor: colors.surface },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle },
      ]}
    >
      <View style={styles.detailFlex}>
        <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>
          {label}
        </Text>
        <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
          {value}
        </Text>
      </View>
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          style={[styles.actionBtn, { backgroundColor: colors.accentLight }]}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}: ${label}`}
        >
          <Text style={[styles.actionText, { color: colors.accent }]}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  // Figma: content padding 14 / 16, items 12 apart.
  scrollContent: { paddingHorizontal: 16, paddingTop: CONTENT_TOP_PADDING, paddingBottom: 100 },

  // First content line: the other calendar's date (13 Regular, tertiary).
  secondaryDate: { ...withFontFamily(typography.bodySmall), textAlign: 'right', marginBottom: 12 },

  // Highlights-strip banner — shared visual language for the holiday banner,
  // Omer count and Rosh Chodesh; only colors differ per use.
  infoBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  infoBannerText: { ...withFontFamily(typography.cardTitle), textAlign: 'center' },

  // Sections
  section: { marginBottom: 12 },

  // Detail rows (learning tab) — card row: bottom hairline suppressed on
  // the last visible row via the `isLast` prop Card auto-injects.
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 56,
  },
  detailFlex: { flex: 1, flexShrink: 1 },
  detailLabel: { ...withFontFamily(typography.caption), marginBottom: 2, textAlign: 'right' },
  detailValue: { ...withFontFamily(typography.bodyLarge), textAlign: 'right' },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.md,
    flexShrink: 0,
  },
  actionText: { ...withFontFamily(typography.bodySmall, '600') },

  // Notes (legacy style names kept for safety — unused by new components)
  noteRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginBottom: 6,
  },
  noteText: { ...withFontFamily(typography.bodyMedium, '500'), textAlign: 'right' },

  // Hourly schedule — explicit row-reverse (locked RTL convention): first
  // JSX child (event content) lands right, last child (hourLabel) lands
  // left as the fixed time gutter. Rows separated by a top hairline.
  // Figma: each hour row has a 1 px top line, padding 8 / 12, gap 10;
  // the 38-wide hour label sits on the left.
  scheduleCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hourRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    minHeight: HOUR_ROW_HEIGHT,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  hourLabel: {
    width: 38,
    ...withFontFamily(typography.caption),
    textAlign: 'left',
  },
  hourContent: { flex: 1, gap: 6 },
  // Filled, rounded event block — background/foreground colors come from the
  // note's resolved category token (CATEGORY_TOKENS), applied inline.
  // Figma: r8, padding 7 / 10, title 13 SemiBold, time 11 Regular, 1 apart.
  hourNote: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    gap: 1,
  },
  hourNoteTitle: { ...withFontFamily(typography.bodySmall, '600'), textAlign: 'right' },
  hourNoteTime: { ...withFontFamily(typography.caption, '400'), textAlign: 'right' },
  // Quiet empty-state hint (grid stays visible below it on the events tab;
  // shown alone on the learning tab when there is nothing to learn) shown
  // when there is nothing to show.
  timelineEmptyHint: {
    ...withFontFamily(typography.bodySmall),
    textAlign: 'center',
    marginBottom: 8,
  },

  // Parasha card (every day: upcoming Shabbat's reading, or the current
  // Shabbat's reading on Shabbat itself)
  // Figma: r14, padding 13 / 14, gap 12, 26 px book icon on the left.
  parashaCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.card,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  parashaTextBlock: { flex: 1, gap: 2 },
  parashaCaption: { ...withFontFamily(typography.caption), textAlign: 'right' },
  parashaName: { ...withFontFamily(typography.displaySmall, '700'), textAlign: 'right' },

  // Key zmanim card (highlights strip, every day) — Card + SectionLabel
  // language shared with ZmanimList's full-list version.
  keyZmanimWrap: { marginBottom: 12 },
  keyZmanRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 12,
  },
  keyZmanLabel: { ...withFontFamily(typography.label), flex: 1, textAlign: 'right' },
  keyZmanTime: { ...withFontFamily(typography.bodyMedium, '700') },
  // Quiet "see everything" affordance — right-aligned (the app's native base
  // is locked LTR, so `flex-end` on a column lands the cross-axis on the
  // right, matching Hebrew reading order) under the key-zmanim card.
  seeAllZmanimBtn: {
    alignSelf: 'flex-end',
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  seeAllZmanimText: {
    ...withFontFamily(typography.bodySmall, '600'),
    textAlign: 'right',
  },

  // Tab bar — the sticky child pointed at by stickyHeaderIndices={[1]}.
  // Split into an outer (chrome: background + border, hoisted onto RN's
  // sticky-header wrapper while docked) and an inner row (flexDirection,
  // safe from that hoisting) — see the long comment at the JSX call site
  // for why this split exists. Do not merge them back into one View.
  tabBarOuter: {
    paddingBottom: 12,
  },
  // Figma segmented control: track r999 padding 3; segments 33 tall
  // (padding 7) — hitSlop on each keeps the touch target at 48.
  segTrack: {
    flexDirection: 'row-reverse',
    borderRadius: radius.full,
    padding: 3,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  segItemActive: {
    ...elevation.sm,
  },
  segText: {
    ...withFontFamily(typography.bodySmall, '500'),
  },
  segTextActive: {
    ...withFontFamily(typography.bodySmall, '700'),
  },
});
