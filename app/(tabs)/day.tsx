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
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useSettingsStore } from '../../src/providers/SettingsProvider';
import { useLocationStore } from '../../src/providers/LocationProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useZmanim } from '../../src/hooks/useZmanim';
import { useNotes, type CalendarNote } from '../../src/hooks/useNotes';
import { ZmanimList } from '../../src/components/zmanim/ZmanimList';
import { ShabbatCard } from '../../src/components/zmanim/ShabbatCard';
import { NoteEditor } from '../../src/components/notes/NoteEditor';
import { NoteList } from '../../src/components/notes/NoteList';
import {
  dateService,
  toHebrewNumeral,
  toHebrewYear,
  type DayData,
} from '../../src/services/DateService';
import { getZmanim } from '../../src/services/ZmanimService';
import { radius } from '../../src/constants/radius';
import { findCityByKey } from '../../src/constants/cities';
import { findNearestCity } from '../../src/utils/locationLookup';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';
import { useDatePicker } from '../../src/hooks/useDatePicker';
import { swipeDirection } from '../../src/constants/layout';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

export default function DayScreen() {
  const colors = useThemeColors();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const hebrewOnTop = useSettingsStore((s) => s.hebrewOnTop);
  const use24hTime = useSettingsStore((s) => s.use24hTime);
  const candleLightingPlaceName = useSettingsStore((s) => s.candleLightingPlaceName);
  const candleLightingCity = useSettingsStore((s) => s.candleLightingCity);
  const candleLightingLat = useSettingsStore((s) => s.candleLightingLat);
  const candleLightingLng = useSettingsStore((s) => s.candleLightingLng);
  const { cityHebcalKey, latitude: locationLat, longitude: locationLng } = useLocationStore();

  // Derive DayData for the selected date — month is cached, so cheap.
  const dayData = useMemo<DayData>(
    () => dateService.getDayData(selectedDate),
    [selectedDate],
  );

  const zmanim = useZmanim(selectedDate);

  // Resolved location name for ShabbatCard — first non-null wins:
  // 1. candleLightingPlaceName (GPS reverse-geocoded name from settings)
  // 2. candleLightingCity key → Hebrew city name from curated list
  // 3. location-store city key → Hebrew city name (or nearest city fallback)
  // 4. null (card renders without location row)
  const resolvedLocationName = useMemo<string | null>(() => {
    if (candleLightingPlaceName) return candleLightingPlaceName;
    if (candleLightingCity) {
      const entry = findCityByKey(candleLightingCity);
      if (entry) return entry.nameHe;
    }
    if (cityHebcalKey) {
      const entry = findCityByKey(cityHebcalKey);
      if (entry) return entry.nameHe;
    }
    const { city } = findNearestCity(locationLat, locationLng);
    return city.nameHe;
  }, [candleLightingPlaceName, candleLightingCity, cityHebcalKey, locationLat, locationLng]);

  // Zmanim for ShabbatCard — use candle-lighting GPS coords when available,
  // fall back to the existing location-store zmanim otherwise.
  const cardZmanim = useMemo(
    () =>
      candleLightingLat !== null && candleLightingLng !== null
        ? getZmanim(selectedDate, candleLightingLat, candleLightingLng)
        : zmanim,
    [selectedDate.getTime(), candleLightingLat, candleLightingLng, zmanim],
  );

  // Date picker — Phase 4.4
  const { openPicker, picker } = useDatePicker(selectedDate, setSelectedDate);

  // Notes for this day. Used for:
  //   1. Hour bucketing in the hourly grid (timed notes)
  //   2. NoteEditor for adding/editing from the grid
  // NoteList has its own internal useNotes — that's the existing pattern; not refactored here.
  const { notes, saveNote } = useNotes(selectedDate);

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
                      <View key={hour} style={styles.hourRow}>
                        <Text style={[styles.hourLabel, { color: colors.textTertiary }]}>
                          {hourLabel}
                        </Text>
                        <View style={[styles.hourDivider, { backgroundColor: colors.borderSubtle }]} />
                        <View style={styles.hourContent}>
                          {hourNotes.map((note) => {
                            const startDate = new Date(note.startDateTime!);
                            const timeStr = formatHM(startDate);
                            return (
                              <Pressable
                                key={note.id}
                                onPress={() => openGridNoteEditor(note)}
                                style={[
                                  styles.hourNote,
                                  { backgroundColor: colors.accentLight },
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={`${note.summary}, ${timeStr}`}
                              >
                                <Text style={[styles.hourNoteText, { color: colors.accent }]}>
                                  {timeStr} {note.summary}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
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
                {/* Shabbat Card — returns null on non-Fri/Sat days */}
                <ShabbatCard
                  selectedDate={selectedDate}
                  candleLightingTime={cardZmanim.candleLighting}
                  tzaisTime={cardZmanim.tzeitHakochavim}
                  rabbeinuTamTime={cardZmanim.tzeitRabbeinu}
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

                {/* Torah Details */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
                    פרטים תורניים
                  </Text>

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
                </View>

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
        <NoteEditor
          visible={editorVisible}
          note={gridEditNote}
          date={selectedDate}
          hebrewDate={dayData.hebrewDate}
          colors={colors}
          onClose={closeNoteEditor}
          onSave={saveNote}
        />

        {/* Date picker — Phase 4.4; rendered outside ScrollView */}
        {picker}
      </View>
    </GestureDetector>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  colors,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useThemeColors>;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.detailRow}>
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
          style={[styles.actionBtn, { backgroundColor: colors.accentLight }]}
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
  hebrewDate: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  gregDate: { fontSize: 14, marginTop: 4, textAlign: 'center' },

  // Holiday banner
  holidayBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  holidayText: { fontSize: 16, fontWeight: '700' },

  // Sections
  section: { marginVertical: 12 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'right',
  },

  // Detail rows (Torah details)
  detailRow: { flexDirection: 'row-reverse', alignItems: 'center', marginVertical: 6 },
  detailFlex: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2, textAlign: 'right' },
  detailValue: { fontSize: 16, fontWeight: '500', textAlign: 'right' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
  actionText: { fontSize: 13, fontWeight: '600' },

  // Notes (legacy style names kept for safety — unused by new components)
  noteRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginBottom: 6,
  },
  noteText: { fontSize: 14, fontWeight: '500', textAlign: 'right' },

  // Hourly schedule
  hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 36,
    paddingVertical: 4,
  },
  hourLabel: {
    width: 50,
    fontSize: 12,
    fontWeight: '500',
    paddingTop: 4,
  },
  hourDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 12,
  },
  hourContent: { flex: 1, gap: 4 },
  hourNote: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  hourNoteText: { fontSize: 13, fontWeight: '500', textAlign: 'right' },

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
    fontSize: 14,
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
    fontSize: 15,
    fontWeight: '600',
  },
});
