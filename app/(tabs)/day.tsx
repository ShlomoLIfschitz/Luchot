// app/(tabs)/day.tsx
// Phase 3.5 — Day screen. Full implementation per docs/SCREENS.md.
// Phase 3.7a-1 — ScreenHeader added (outside ScrollView, stays fixed).
// C2 — Hourly schedule moved to events tab; real hour bucketing; tab reset on date change.
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
import { BookOpenText } from 'lucide-react-native';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useSettingsStore } from '../../src/providers/SettingsProvider';
import { useLocationStore } from '../../src/providers/LocationProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import type { ThemeColors } from '../../src/hooks/useThemeColors';
import { useZmanim } from '../../src/hooks/useZmanim';
import { useNotes, type CalendarNote } from '../../src/hooks/useNotes';
import { ZmanimList } from '../../src/components/zmanim/ZmanimList';
import { ShabbatCard } from '../../src/components/zmanim/ShabbatCard';
import { NoteEditor } from '../../src/components/notes/NoteEditor';
import { NoteList } from '../../src/components/notes/NoteList';
import { Card } from '../../src/components/ui/Card';
import { SectionLabel } from '../../src/components/ui/SectionLabel';
import {
  dateService,
  toHebrewNumeral,
  toHebrewYear,
  type DayData,
} from '../../src/services/DateService';
import { radius } from '../../src/constants/radius';
import { typography, withFontFamily } from '../../src/constants/typography';
import { findNearestCity } from '../../src/utils/locationLookup';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';
import { useDatePicker } from '../../src/hooks/useDatePicker';
import { swipeDirection } from '../../src/constants/layout';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

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
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const hebrewOnTop = useSettingsStore((s) => s.hebrewOnTop);
  const use24hTime = useSettingsStore((s) => s.use24hTime);
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
  const [activeTab, setActiveTab] = useState<'events' | 'torah'>('events');

  // C2: Reset to events tab whenever the selected date changes.
  // This prevents the user from landing on the torah tab when swiping days.
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

  /** Format HH:MM for the grid label, honoring use24hTime. */
  const formatHM = useCallback((date: Date): string => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24hTime,
    });
  }, [use24hTime]);

  // Date formatting
  const hebrewFormatted = `${toHebrewNumeral(dayData.hebrewDate.day)} ${dayData.hebrewDate.monthName} ${toHebrewYear(dayData.hebrewDate.year)}`;
  const gregFormatted = selectedDate.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const isHoliday = dayData.isYomTov || dayData.holidays.length > 0;
  const primaryHoliday = dayData.holidays[0];

  // Parasha card — shown Friday (upcomingParasha, the coming Shabbat's
  // reading) and Saturday (parasha, unchanged existing field). undefined on
  // both fields (e.g. a Yom Tov week with a special holiday reading instead
  // of a regular parasha) renders nothing — no empty card.
  const dayOfWeek = selectedDate.getDay(); // 5 = Friday, 6 = Saturday
  const parashaCardName =
    dayOfWeek === 6 ? dayData.parasha : dayOfWeek === 5 ? dayData.upcomingParasha : undefined;

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader date={selectedDate} onDatePress={openPicker} />
        {/* Date header — fixed above the scroll, always visible */}
        <View style={styles.header}>
          <Text style={[styles.hebrewDate, { color: colors.textPrimary }]}>
            {hebrewOnTop ? hebrewFormatted : gregFormatted}
          </Text>
          <Text style={[styles.gregDate, { color: colors.textSecondary }]}>
            {hebrewOnTop ? gregFormatted : hebrewFormatted}
          </Text>
        </View>

        {/* Tab bar — fixed below the date header, always visible while scrolling.
            Rendered OUTSIDE the ScrollView on purpose: a stickyHeaderIndices child
            is re-parented into an internal Animated.View wrapper that, in this
            RTL + nested-flex case, never gave the row a stable full-width context,
            so the two tabs collapsed and stacked. As a normal flex-row child of the
            root column it lays out reliably, and sitting outside the scroll viewport
            keeps it permanently visible (functionally sticky). */}
        <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {/* RTL: 'אירועים' first in JSX → renders on the right */}
          <Pressable
            onPress={() => setActiveTab('events')}
            style={[styles.tabItem, activeTab === 'events' && { borderBottomWidth: 2, borderBottomColor: colors.accent }]}
            accessibilityRole="tab"
            accessibilityLabel="אירועים"
          >
            <Text style={[styles.tabText, { color: activeTab === 'events' ? colors.textPrimary : colors.textTertiary }]}>
              אירועים
            </Text>
          </Pressable>
          {/* 'תורה וזמנים' second in JSX → renders on the left */}
          <Pressable
            onPress={() => setActiveTab('torah')}
            style={[styles.tabItem, activeTab === 'torah' && { borderBottomWidth: 2, borderBottomColor: colors.accent }]}
            accessibilityRole="tab"
            accessibilityLabel="תורה וזמנים"
          >
            <Text style={[styles.tabText, { color: activeTab === 'torah' ? colors.textPrimary : colors.textTertiary }]}>
              תורה וזמנים
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View>
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
                <Pressable
                  onPress={openNoteEditor}
                  style={[styles.addEventBtn, { backgroundColor: colors.accentLight }]}
                  accessibilityRole="button"
                  accessibilityLabel="הוסף אירוע"
                >
                  <Text style={[styles.addEventBtnText, { color: colors.accent }]}>+ הוסף אירוע</Text>
                </Pressable>

                {/* Hourly schedule — C2: moved from torah tab to events tab.
                    Timed notes bucketed by getHours() of startDateTime. */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
                    לוח שעות
                  </Text>

                  {HOURS.map((hour) => {
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
                            const timeStr = formatHM(startDate);
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
                        <View style={[styles.hourDivider, { backgroundColor: colors.borderSubtle }]} />
                        <Text style={[styles.hourLabel, { color: colors.textTertiary }]}>
                          {hourLabel}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              // ── Torah & Zmanim tab ─────────────────────────────────────────
              // Keeps: ShabbatCard, holiday banner, Torah details, ZmanimList.
              // Hourly schedule removed (C2 — moved to events tab).
              <>
                {/* Parasha card — Friday (upcoming Shabbat) + Saturday (current Shabbat).
                    Renders nothing when neither field is available (e.g. a Yom Tov week). */}
                {parashaCardName && (
                  <ParashaCard colors={colors} label="פרשת השבוע" name={parashaCardName} />
                )}

                {/* Shabbat Card — returns null on non-Fri/Sat days */}
                <ShabbatCard
                  selectedDate={selectedDate}
                  candleLightingTime={zmanim.candleLighting}
                  tzaisTime={zmanim.tzeitHakochavim}
                  rabbeinuTamTime={zmanim.tzeitRabbeinu}
                  locationName={resolvedLocationName}
                  use24h={use24hTime}
                />

                {/* Holiday Banner */}
                {isHoliday && primaryHoliday && (
                  <View style={[styles.holidayBanner, { backgroundColor: colors.tagHolidayBg, borderColor: colors.tagHoliday }]}>
                    <Text style={[styles.holidayText, { color: colors.tagHoliday }]}>
                      ✡ {primaryHoliday}
                    </Text>
                  </View>
                )}

                {/* Torah Details — Card + SectionLabel; empty-state guarded so
                    no empty card renders on a day with none of these fields. */}
                {(dayData.parasha || dayData.omerDay || dayData.dafYomi || dayData.rambamOneChapter) && (
                  <View style={styles.section}>
                    <SectionLabel title="פרטים תורניים" colors={colors} />
                    <Card colors={colors}>
                      {dayData.parasha && (
                        <DetailRow
                          label="פרשת השבוע"
                          value={dayData.parasha}
                          colors={colors}
                        />
                      )}

                      {dayData.omerDay && (
                        <DetailRow
                          label="ספירת העומר"
                          value={`יום ${toHebrewNumeral(dayData.omerDay)} לעומר`}
                          colors={colors}
                        />
                      )}

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
                    </Card>
                  </View>
                )}

                {/* Zmanim */}
                <ZmanimList zmanim={zmanim} />
              </>
            )}
          </View>
        </ScrollView>

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
      <BookOpenText size={22} color={colors.tagShabbat} />
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

  // Header (fixed above the scroll)
  header: { alignItems: 'center', paddingTop: 16, marginBottom: 12 },
  hebrewDate: { ...withFontFamily(typography.displayMedium), letterSpacing: -0.5, textAlign: 'center' },
  gregDate: { ...withFontFamily(typography.bodyMedium), marginTop: 4, textAlign: 'center' },

  // Holiday banner
  holidayBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  holidayText: { ...withFontFamily(typography.cardTitle) },

  // Sections
  section: { marginVertical: 12 },
  sectionTitle: {
    ...withFontFamily(typography.caption),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'right',
  },

  // Detail rows (Torah details) — card row: bottom hairline suppressed on
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
  actionText: { ...withFontFamily(typography.bodySmall), fontWeight: '600' },

  // Notes (legacy style names kept for safety — unused by new components)
  noteRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginBottom: 6,
  },
  noteText: { ...withFontFamily(typography.bodyMedium), fontWeight: '500', textAlign: 'right' },

  // Hourly schedule — explicit row-reverse (locked RTL convention): first
  // JSX child (event content) lands right, last child (hourLabel) lands
  // left as the fixed time gutter. Rows separated by a top hairline.
  hourRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    minHeight: 40,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hourLabel: {
    width: 38,
    ...withFontFamily(typography.micro),
    paddingTop: 4,
    textAlign: 'left',
  },
  hourDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 10,
  },
  hourContent: { flex: 1, gap: 6 },
  // Filled, rounded event block — background/foreground colors come from the
  // note's resolved category token (CATEGORY_TOKENS), applied inline.
  hourNote: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  hourNoteTitle: { ...withFontFamily(typography.bodySmall), fontWeight: '700', textAlign: 'right' },
  hourNoteTime: { ...withFontFamily(typography.micro), textAlign: 'right', marginTop: 2, opacity: 0.75 },

  // Parasha card (Friday: upcoming Shabbat / Saturday: current Shabbat)
  parashaCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 16,
  },
  parashaTextBlock: { flex: 1, gap: 2 },
  parashaCaption: { ...withFontFamily(typography.caption), textAlign: 'right' },
  parashaName: { ...withFontFamily(typography.displaySmall), textAlign: 'right' },

  // Tab bar (sticky header)
  tabBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabText: {
    ...withFontFamily(typography.bodyMedium),
    fontWeight: '600',
  },

  // Inline add-event button (events tab)
  addEventBtn: {
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
  },
  addEventBtnText: {
    ...withFontFamily(typography.bodyMedium),
    fontWeight: '600',
  },
});
