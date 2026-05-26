// app/(tabs)/day.tsx
// Phase 3.5 — Day screen. Full implementation per docs/SCREENS.md.
// Phase 3.7a-1 — ScreenHeader added (outside ScrollView, stays fixed).
//
// NoteEditor adaptation note (vs. original Phase 3.5 spec):
//   NoteEditor is a React Native Modal component, not a @gorhom/bottom-sheet.
//   It is controlled via `visible: boolean` prop (not a forwardRef + expand/close).
//   It also requires `colors: ThemeColors` passed in rather than calling
//   useThemeColors internally. The ref-based pattern in the spec was adapted
//   to a useState boolean accordingly.

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  I18nManager,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Plus } from 'lucide-react-native';
import { useCalendarStore } from '../../src/providers/CalendarProvider';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useZmanim } from '../../src/hooks/useZmanim';
import { useNotes, type CalendarNote } from '../../src/hooks/useNotes';
import { ZmanimList } from '../../src/components/zmanim/ZmanimList';
import { NoteEditor } from '../../src/components/notes/NoteEditor';
import {
  dateService,
  toHebrewNumeral,
  toHebrewYear,
  type DayData,
} from '../../src/services/DateService';
import { radius } from '../../src/constants/radius';
import { ScreenHeader } from '../../src/components/common/ScreenHeader';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

export default function DayScreen() {
  const colors = useThemeColors();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);

  // Derive DayData for the selected date — month is cached, so cheap.
  const dayData = useMemo<DayData>(
    () => dateService.getDayData(selectedDate),
    [selectedDate],
  );

  const zmanim = useZmanim(selectedDate);

  // Notes for this day.
  const { notes, saveNote } = useNotes(selectedDate);

  // NoteEditor visibility — NoteEditor is Modal-based, not BottomSheet.
  // Controlled via visible boolean prop instead of a ref.
  const [editorVisible, setEditorVisible] = useState(false);

  const openNoteEditor = useCallback(() => setEditorVisible(true), []);
  const closeNoteEditor = useCallback(() => setEditorVisible(false), []);

  // Day navigation — swipe left/right to move days
  const navigateDay = useCallback(
    (direction: 1 | -1) => {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + direction);
      setSelectedDate(next);
    },
    [selectedDate, setSelectedDate],
  );

  const swipeGesture = Gesture.Pan().onEnd((e) => {
    if (Math.abs(e.velocityX) > 400) {
      // In RTL, swipe left = next day, swipe right = previous day
      navigateDay(e.velocityX < 0 ? 1 : -1);
    }
  });

  // Bucket notes by hour for the schedule view.
  // Notes don't carry an hour field yet — all appear in "all-day" bucket
  // at key -1. Per-hour bucketing deferred to Phase 4.
  const notesByHour = useMemo(() => {
    const map: Record<number, CalendarNote[]> = {};
    for (const note of notes) {
      const hour = -1; // all-day for now
      if (!map[hour]) map[hour] = [];
      map[hour].push(note);
    }
    return map;
  }, [notes]);

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
        <ScreenHeader date={selectedDate} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — date display */}
          <View style={styles.header}>
            <Text style={[styles.hebrewDate, { color: colors.textPrimary }]}>
              {hebrewFormatted}
            </Text>
            <Text style={[styles.gregDate, { color: colors.textSecondary }]}>
              {gregFormatted}
            </Text>
          </View>

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

          {/* Zmanim — reuse existing component */}
          <ZmanimList zmanim={zmanim} />

          {/* All-day notes (no time anchor yet) */}
          {notesByHour[-1] && notesByHour[-1].length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
                אירועי היום
              </Text>
              {notesByHour[-1].map((note) => (
                <View
                  key={note.id}
                  style={[styles.noteRow, { backgroundColor: colors.surfaceElevated }]}
                >
                  <Text style={[styles.noteText, { color: colors.textPrimary }]}>
                    {note.summary}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Hourly Schedule */}
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
                    {hourNotes.map((note) => (
                      <View
                        key={note.id}
                        style={[styles.hourNote, { backgroundColor: colors.tagEventBg }]}
                      >
                        <Text style={[styles.hourNoteText, { color: colors.tagEvent }]}>
                          {note.summary}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Bottom spacer for FAB clearance */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* FAB — RTL-aware positioning via I18nManager */}
        <Pressable
          onPress={openNoteEditor}
          style={[
            styles.fab,
            { backgroundColor: colors.accent },
            I18nManager.isRTL ? { left: 24 } : { right: 24 },
          ]}
          accessibilityLabel="הוסף אירוע או הערה"
        >
          <Plus color={colors.textInverse} size={24} />
        </Pressable>

        {/* Note Editor — Modal-based, controlled via visible prop.
            NoteEditor requires colors passed in (does not call useThemeColors
            internally). saveNote (async → Promise<void>) is assignable to
            onSave (→ void) because void in callback position means the caller
            does not use the return value. */}
        <NoteEditor
          visible={editorVisible}
          date={selectedDate}
          hebrewDate={dayData.hebrewDate}
          colors={colors}
          onClose={closeNoteEditor}
          onSave={saveNote}
        />
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
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

  // Header
  header: { alignItems: 'center', marginBottom: 16 },
  hebrewDate: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  gregDate: { fontSize: 14, marginTop: 4 },

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
  },

  // Detail rows (Torah details)
  detailRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  detailFlex: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '500', marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: '500' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
  actionText: { fontSize: 13, fontWeight: '600' },

  // Notes
  noteRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    marginBottom: 6,
  },
  noteText: { fontSize: 14, fontWeight: '500' },

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
  hourNoteText: { fontSize: 13, fontWeight: '500' },

  // FAB — right/left set inline via I18nManager (RTL-aware)
  fab: {
    position: 'absolute',
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },

  bottomSpacer: { height: 60 },
});
