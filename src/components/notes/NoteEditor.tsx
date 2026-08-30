// src/components/notes/NoteEditor.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, Switch, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import {
  MapPin, Pencil, Trash2, Share2, Cake, Flame, Gem, FileText,
  Clock, Bell, CalendarDays, Sun, CalendarRange,
  type LucideIcon,
} from 'lucide-react-native';
import { radius } from '../../constants/radius';
import { overlay } from '../../constants/overlay';
import { typography, withFontFamily } from '../../constants/typography';
import type { ThemeColors } from '../../hooks/useThemeColors';
import type { NoteType, CalendarNote } from '../../hooks/useNotes';
import type { HebrewDateInfo } from '../../services/DateService';
import { toHebrewNumeral, toHebrewYear } from '../../services/DateService';
import { COLOR_OPTIONS, type ColorTokenKey } from '../../utils/colorResolver';
import { reverseGeocodeNominatim } from '../../utils/reverseGeocode';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { useTimeOfDayPicker } from '../../hooks/useTimeOfDayPicker';
import { splitInstanceId } from '../../utils/recurringId';
import { formatDateKey } from '../../utils/dateUtils';
import { dateService } from '../../services/DateService';
import { HebrewFullDatePicker } from '../calendar/HebrewFullDatePicker';
import type { RecurrenceType, NoteCategory } from '../../schemas/EventSchema';
import * as Notifications from 'expo-notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a Date to HH:MM (or h:MM AM/PM) depending on user preference. */
function formatHM(date: Date, use24h: boolean): string {
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24h,
  });
}

/** Parse an ISO 8601 string into a Date. Returns null on failure. */
function parseISO(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** A Date anchored to today at 09:00 — sensible default for new timed events. */
function defaultStartTime(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAD_TIME_OPTIONS: { label: string; minutes: number }[] = [
  { label: 'בזמן האירוע', minutes: 0 },
  { label: '10 דקות לפני', minutes: 10 },
  { label: 'שעה לפני', minutes: 60 },
  { label: 'יום לפני', minutes: 1440 },
  { label: 'מותאם אישית', minutes: -1 },
];

const NOTE_TYPES: { type: NoteType; label: string; icon: string }[] = [
  { type: 'note',        label: 'הערה',      icon: '📝' },
  { type: 'birthday',    label: 'יום הולדת', icon: '🎂' },
  { type: 'yahrzeit',    label: 'יארצייט',   icon: '🕯' },
  { type: 'anniversary', label: 'יום שנה',   icon: '💍' },
];

const TYPE_ICON: Record<NoteType, LucideIcon> = {
  note:        FileText,
  birthday:    Cake,
  yahrzeit:    Flame,
  anniversary: Gem,
};

const DEFAULT_COLOR_FOR_TYPE: Record<NoteType, ColorTokenKey> = {
  note:        'tagEvent',
  birthday:    'tagPersonal',
  yahrzeit:    'tagPersonal',
  anniversary: 'tagPersonal',
};

// Recurrence type options for the explicit picker (Task 1)
const RECURRENCE_OPTIONS: { label: string; value: RecurrenceType }[] = [
  { label: 'ללא חזרה', value: 'none' },
  { label: 'יומי',     value: 'daily' },
  { label: 'שבועי',    value: 'weekly' },
  { label: 'חודשי',    value: 'monthly' },
  { label: 'שנתי',     value: 'yearly' },
];

// ─── ColorPickerRow ───────────────────────────────────────────────────────────

interface ColorPickerRowProps {
  noteType: NoteType;
  colorId: string | null;
  onChange: (key: string) => void;
  colors: ThemeColors;
}

function ColorPickerRow({ noteType, colorId, onChange, colors }: ColorPickerRowProps) {
  const effectiveKey: ColorTokenKey = (colorId as ColorTokenKey) ?? DEFAULT_COLOR_FOR_TYPE[noteType];
  return (
    <View style={cpStyles.row}>
      <Text style={[cpStyles.label, { color: colors.textTertiary }]}>צבע</Text>
      <View style={cpStyles.circles}>
        {COLOR_OPTIONS.map((key) => {
          const hexColor = (colors as Record<string, string>)[key] ?? colors.textTertiary;
          const isSelected = key === effectiveKey;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              accessibilityRole="button"
              accessibilityLabel={key}
              accessibilityState={{ selected: isSelected }}
              hitSlop={4}
              style={[
                cpStyles.circleRing,
                { borderColor: isSelected ? colors.textPrimary : 'transparent' },
              ]}
            >
              <View style={[cpStyles.circle, { backgroundColor: hexColor }]}>
                {isSelected && <Text style={[cpStyles.checkmark, { color: colors.textInverse }]}>✓</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CIRCLE_SIZE = 34;

const cpStyles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  label: {
    ...withFontFamily(typography.captionBold),
  },
  circles: {
    flexDirection: 'row-reverse',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  // Ring drawn OUTSIDE the swatch (via padding), so selection never shrinks
  // the colour itself — just adds a 2px ring around it.
  circleRing: {
    borderRadius: (CIRCLE_SIZE + 4 + 4) / 2,
    borderWidth: 2,
    padding: 2,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Nearest token: typography.captionBold (11/700/14) — fontWeight exact
  // match; fontSize delta 14→11 (3px, acceptable for a small inline glyph).
  checkmark: {
    ...withFontFamily(typography.captionBold),
  },
});

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  note?: CalendarNote;
  date: Date;
  hebrewDate: HebrewDateInfo;
  colors: ThemeColors;
  onSave: (params: {
    id?: string;
    created?: string;
    summary: string;
    noteType: NoteType;
    calendarType: 'hebrew' | 'gregorian';
    date: Date;
    hebrewDate: HebrewDateInfo;
    reminderMinutes?: number | null;
    colorId?: string | null;
    location?: string | null;
    // C2 time params
    allDay?: boolean;
    startTime?: Date | null;
    endTime?: Date | null;
    reminderTime?: Date | null;
    // C3 explicit recurrence params
    recurrenceType?: RecurrenceType;
    recurrenceCalendar?: 'hebrew' | 'gregorian' | null;
    // Slice B multi-day end date (non-recurring all-day only)
    endDate?: Date;
  }) => void;
  onDelete?: (id: string) => void;
  /** C3: thread from useNotes so the editor can write a tombstone for a single occurrence. */
  onDeleteOccurrence?: (masterId: string, occurrenceDate: string) => void;
  /** C3: thread from useNotes so the editor can write an override for a single occurrence. */
  onSaveOccurrenceException?: (
    masterId: string,
    occurrenceDate: string,
    overrides: {
      summary?: string;
      location?: string | null;
      colorId?: string | null;
      category?: NoteCategory;
      allDay?: boolean;
      startDateTime?: string | null;
      endDateTime?: string | null;
      reminderMinutes?: number | null;
    },
  ) => void;
  onClose: () => void;
}

// ─── NoteEditor ───────────────────────────────────────────────────────────────

export function NoteEditor({
  visible, note, date, hebrewDate, colors,
  onSave, onDelete, onDeleteOccurrence, onSaveOccurrenceException, onClose,
}: Props) {
  // ── Settings (must be called before any early return — Rules of Hooks) ──────
  const use24hTime = useSettingsStore((s) => s.use24hTime);

  // ── Core edit state ──────────────────────────────────────────────────────────
  const [summary, setSummary] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('note');
  const [calendarType, setCalendarType] = useState<'hebrew' | 'gregorian'>('hebrew');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState<number>(0);
  const [customMinutes, setCustomMinutes] = useState<string>('30');
  const [colorId, setColorId] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [location, setLocation] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const summaryInputRef = useRef<TextInput>(null);
  const locationInputRef = useRef<TextInput>(null);
  const [focusTarget, setFocusTarget] = useState<'summary' | 'location' | null>(null);

  // ── C3 recurrence state (Task 1) ─────────────────────────────────────────────
  // Explicit recurrence type — replaces old implicit birthday/yahrzeit => yearly behavior.
  // Init from existing note when editing; 'none' for new notes.
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  // Calendar anchor — only meaningful for 'yearly'. Shown only when yearly is selected.
  const [recurrenceCalendar, setRecurrenceCalendar] = useState<'hebrew' | 'gregorian'>('hebrew');

  // ── C2 time state ────────────────────────────────────────────────────────────
  // allDay: true = all-day event (legacy behavior). false = timed event.
  const [allDay, setAllDay] = useState(true);
  // startTime / endTime are always Date objects (even when allDay=true, ignored on save)
  const [startTime, setStartTime] = useState<Date>(defaultStartTime);
  const [endTime, setEndTime] = useState<Date | null>(null);
  // reminderTime: user-picked clock time that anchors an all-day reminder.
  // Only used when allDay=true && reminderEnabled=true.
  const [reminderTime, setReminderTime] = useState<Date>(defaultStartTime);

  // ── Slice B: multi-day state (declared before any early return — Rules of Hooks) ──
  const [multiDay, setMultiDay] = useState(false);
  const [endDate, setEndDate] = useState<Date>(date);
  const [endPickerVisible, setEndPickerVisible] = useState(false);

  // ── Time pickers (all three hooks BEFORE any early return — Rules of Hooks) ──
  const {
    openPicker: openStartPicker,
    picker: startPicker,
  } = useTimeOfDayPicker(startTime, setStartTime, use24hTime);

  const {
    openPicker: openEndPicker,
    picker: endPicker,
  } = useTimeOfDayPicker(endTime ?? defaultStartTime(), useCallback((d: Date) => setEndTime(d), []), use24hTime);

  // Reminder time picker: when confirmed, store the picked time.
  const handleReminderTimeChange = useCallback((d: Date) => {
    setReminderTime(d);
  }, []);

  const handleReminderToggle = useCallback(async (next: boolean) => {
    // Turning OFF — no permission needed.
    if (!next) {
      setReminderEnabled(false);
      return;
    }
    // Turning ON — ensure POST_NOTIFICATIONS before enabling, so scheduled
    // reminders are actually delivered (Android 13+). The switch stays OFF
    // (controlled by reminderEnabled) until permission is confirmed granted.
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status === 'granted') {
      setReminderEnabled(true);
    } else {
      setReminderEnabled(false);
      Alert.alert(
        'נדרשת הרשאה',
        'כדי לקבל תזכורות, יש לאפשר התראות בהגדרות המכשיר',
        [{ text: 'אישור' }],
      );
    }
  }, []);

  const {
    openPicker: openReminderTimePicker,
    picker: reminderTimePicker,
  } = useTimeOfDayPicker(reminderTime, handleReminderTimeChange, use24hTime);


  // ── Reset state when modal opens / note changes ───────────────────────────────
  useEffect(() => {
    if (visible) {
      setSummary(note?.summary ?? '');
      setNoteType(note?.noteType ?? 'note');
      setCalendarType(note?.calendarType ?? 'hebrew');
      const existingMinutes = note?.reminderMinutes ?? null;
      setReminderEnabled(existingMinutes !== null);
      setReminderMinutes(existingMinutes ?? 0);
      setCustomMinutes(String(existingMinutes ?? 30));
      setColorId(note?.colorId ?? null);
      setLocation(note?.location ?? '');
      setIsViewMode(!!note);

      // C3: init recurrence picker from existing note; default to 'none' for new notes.
      const initRecurrenceType: RecurrenceType = note?.recurrenceType ?? 'none';
      setRecurrenceType(initRecurrenceType);
      // Init recurrence calendar:
      //   - from existing note when editing
      //   - for new notes: birthday/yahrzeit default to 'hebrew'; others default to 'gregorian'
      if (note?.recurrenceCalendar) {
        setRecurrenceCalendar(note.recurrenceCalendar);
      } else {
        const nt = note?.noteType ?? 'note';
        setRecurrenceCalendar(
          nt === 'birthday' || nt === 'yahrzeit' ? 'hebrew' : 'gregorian'
        );
      }

      // Time fields
      const isTimedNote = note ? !note.isAllDay : false;
      setAllDay(!isTimedNote);
      const parsedStart = parseISO(note?.startDateTime);
      setStartTime(parsedStart ?? defaultStartTime());
      const parsedEnd = parseISO(note?.endDateTime);
      setEndTime(parsedEnd);
      setReminderTime(defaultStartTime());

      // Slice B: multi-day reset
      const isMulti =
        !!note?.endDateStr &&
        !!note?.gregorianDateStr &&
        note.endDateStr > note.gregorianDateStr;
      setMultiDay(isMulti);
      if (isMulti && note?.endDateStr) {
        const parts = note.endDateStr.split('-').map(Number);
        setEndDate(new Date(parts[0], parts[1] - 1, parts[2]));
      } else {
        setEndDate(date);
      }
    }
  }, [visible, note]);

  useEffect(() => {
    if (!isViewMode && focusTarget) {
      const ref = focusTarget === 'summary' ? summaryInputRef : locationInputRef;
      const t = setTimeout(() => ref.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isViewMode, focusTarget]);

  // Slice B: guard — multi-day cannot coexist with recurrence or timed events.
  useEffect(() => {
    if (multiDay && (!allDay || recurrenceType !== 'none')) {
      setMultiDay(false);
    }
  }, [allDay, recurrenceType, multiDay]);

  // ── C3: helper to compute finalReminderMinutes (used in multiple save paths) ─
  const computeFinalReminderMinutes = (): number | null => {
    if (!reminderEnabled) return null;
    if (reminderMinutes === -1) {
      const parsed = parseInt(customMinutes, 10);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }
    return reminderMinutes;
  };

  // ── C3: build ISO start/end strings for the occurrence-exception save path ───
  // Returns { startISO, endISO } matching what the data layer expects.
  const buildTimedISO = (): { startISO: string | null; endISO: string | null } => {
    if (allDay) return { startISO: null, endISO: null };
    const mergedStart = new Date(
      date.getFullYear(), date.getMonth(), date.getDate(),
      startTime.getHours(), startTime.getMinutes(), 0, 0,
    );
    const startISO = mergedStart.toISOString();
    let endISO: string | null = null;
    if (endTime) {
      const mergedEnd = new Date(
        date.getFullYear(), date.getMonth(), date.getDate(),
        endTime.getHours(), endTime.getMinutes(), 0, 0,
      );
      endISO = mergedEnd.toISOString();
    }
    return { startISO, endISO };
  };

  // ── C3: perform the actual save (no dialog) — used by both direct and edit-all paths ──
  const doDirectSave = (overrideId?: string, anchorDate?: Date) => {
    const trimmed = summary.trim();
    if (!trimmed) return;
    const finalReminderMinutes = computeFinalReminderMinutes();

    onSave({
      id: overrideId,
      created: note?.created,
      summary: trimmed,
      noteType,
      calendarType,
      date: anchorDate ?? date,
      hebrewDate,
      reminderMinutes: finalReminderMinutes,
      colorId,
      location: location.trim() || null,
      allDay,
      startTime: allDay ? null : startTime,
      endTime: allDay ? null : endTime,
      reminderTime: allDay ? reminderTime : null,
      recurrenceType,
      recurrenceCalendar: recurrenceType === 'yearly' ? recurrenceCalendar : null,
      // Slice B: only pass endDate for non-recurring all-day multi-day events.
      endDate: (multiDay && allDay && recurrenceType === 'none') ? endDate : undefined,
    });
    if (note?.id) {
      setIsViewMode(true);
    } else {
      onClose();
    }
  };

  // ── Save handler ─────────────────────────────────────────────────────────────
  const handleSave = () => {
    const trimmed = summary.trim();
    if (!trimmed) return;

    // C3 Task 2: If editing an existing recurring instance, show choice dialog.
    if (note) {
      const { masterId, occurrenceDate } = splitInstanceId(note.id);
      if (occurrenceDate !== null) {
        // This is a recurring instance — show edit dialog.
        Alert.alert(
          'ערוך אירוע זה',
          undefined,
          [
            { text: 'ביטול', style: 'cancel' },
            {
              text: 'לתאריך זה בלבד',
              onPress: () => {
                const finalReminderMinutes = computeFinalReminderMinutes();
                const { startISO, endISO } = buildTimedISO();
                onSaveOccurrenceException?.(masterId, occurrenceDate, {
                  summary: trimmed,
                  location: location.trim() || null,
                  colorId,
                  category: noteType as NoteCategory,
                  allDay,
                  startDateTime: startISO,
                  endDateTime: endISO,
                  reminderMinutes: finalReminderMinutes,
                });
                setIsViewMode(true);
              },
            },
            {
              text: 'לכל התאריכים',
              onPress: () => {
                // Use the MASTER's original anchor date (gregorianDateStr), NOT the
                // displayed occurrence date prop — or the series shifts its anchor.
                let anchorDate = date; // fallback
                if (note.gregorianDateStr) {
                  const [y, m, d2] = note.gregorianDateStr.split('-').map(Number);
                  anchorDate = new Date(y, m - 1, d2);
                }
                doDirectSave(masterId, anchorDate);
              },
            },
          ]
        );
        return;
      }
    }

    // New note or non-recurring existing note — save directly.
    doDirectSave(note?.id, date);
  };

  // ── C3: delete handler (Task 3) ───────────────────────────────────────────────
  const handleDeletePress = () => {
    if (!note) return;
    const { masterId, occurrenceDate } = splitInstanceId(note.id);

    if (occurrenceDate !== null) {
      // Recurring instance — show choice dialog.
      Alert.alert(
        'מחק אירוע זה',
        undefined,
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'לתאריך זה בלבד',
            style: 'destructive',
            onPress: () => {
              onDeleteOccurrence?.(masterId, occurrenceDate);
              onClose();
            },
          },
          {
            text: 'לכל התאריכים',
            style: 'destructive',
            onPress: () => {
              onDelete?.(masterId);
              onClose();
            },
          },
        ]
      );
    } else {
      // Non-recurring — single confirm.
      Alert.alert(
        'מחק אירוע',
        'האם למחוק את האירוע לצמיתות?',
        [
          { text: 'ביטול', style: 'cancel' },
          {
            text: 'מחק',
            style: 'destructive',
            onPress: () => {
              onDelete?.(note.id);
              onClose();
            },
          },
        ]
      );
    }
  };

  // ── GPS ───────────────────────────────────────────────────────────────────────
  const handleGPS = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('לא ניתן לקבל מיקום', 'אנא אפשר גישה למיקום בהגדרות.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const label = await reverseGeocodeNominatim(pos.coords.latitude, pos.coords.longitude);
      setLocation(label);
    } catch {
      Alert.alert('לא ניתן לקבל מיקום');
    } finally {
      setLocationLoading(false);
    }
  };

  const hebDateLabel = `${toHebrewNumeral(hebrewDate.day)} ${hebrewDate.monthName} ${toHebrewYear(hebrewDate.year)}`;
  const gregDateLabel = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  const noteTypeInfo = NOTE_TYPES.find((t) => t.type === noteType);

  const enterEdit = (target: 'summary' | 'location' | null) => {
    setFocusTarget(target);
    setIsViewMode(false);
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      {/* Time pickers — rendered outside KeyboardAvoidingView/ScrollView */}
      {startPicker}
      {endPicker}
      {reminderTimePicker}

      {/* Slice B: end-date picker — rendered outside ScrollView like the time pickers */}
      <HebrewFullDatePicker
        visible={endPickerVisible}
        initialDate={endDate}
        onConfirm={(greg) => {
          // Clamp: if picked end is before the event's start date, use start date.
          const clamped = formatDateKey(greg) < formatDateKey(date) ? date : greg;
          setEndDate(clamped);
          setEndPickerVisible(false);
        }}
        onDismiss={() => setEndPickerVisible(false)}
      />

      <View style={s.overlay}>
          <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={[s.sheet, { backgroundColor: colors.surface }]}>
                <View style={[s.handle, { backgroundColor: colors.border }]} accessibilityElementsHidden importantForAccessibility="no" />

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                {isViewMode ? (
                  // ── VIEW MODE ──────────────────────────────────────────────
                  <>
                    <View style={s.headerRow}>
                      {/* X button — JSX-last = leftmost */}
                      <Pressable
                        hitSlop={12}
                        onPress={onClose}
                        accessibilityLabel="סגור"
                        accessibilityRole="button"
                        style={s.closeBtnHit}
                      >
                        <Text style={[s.closeBtn, { color: colors.textTertiary }]}>✕</Text>
                      </Pressable>
                    </View>

                    {/* summary — the note's title, kept prominent above the field-group card */}
                    <Pressable style={s.viewField} onPress={() => enterEdit('summary')}>
                      <Text style={[s.viewSummary, { color: colors.textPrimary }]}>
                        {summary}
                      </Text>
                    </Pressable>

                    {/* Field-group card — metadata rows, each [icon, label(flex:1,right), value] */}
                    <View style={[s.fieldGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      {/* time (timed events only) */}
                      {note && !note.isAllDay && note.startDateTime && (
                        <Pressable
                          style={[s.fieldRow, { borderBottomColor: colors.borderSubtle }]}
                          onPress={() => enterEdit(null)}
                        >
                          <Clock size={18} color={colors.textTertiary} />
                          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>שעה</Text>
                          <Text style={[s.fieldValue, { color: colors.textPrimary }]}>
                            {formatHM(new Date(note.startDateTime), use24hTime)}
                            {note.endDateTime ? ` — ${formatHM(new Date(note.endDateTime), use24hTime)}` : ''}
                          </Text>
                        </Pressable>
                      )}

                      {/* note type */}
                      {noteTypeInfo && (
                        <Pressable
                          style={[s.fieldRow, { borderBottomColor: colors.borderSubtle }]}
                          onPress={() => enterEdit(null)}
                        >
                          {(() => { const TypeIcon = TYPE_ICON[noteType]; return <TypeIcon size={18} color={colors.textTertiary} />; })()}
                          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>סוג</Text>
                          <Text style={[s.fieldValue, { color: colors.textPrimary }]}>
                            {noteTypeInfo.label}
                          </Text>
                        </Pressable>
                      )}

                      {/* location */}
                      {!!location && (
                        <Pressable
                          style={[s.fieldRow, { borderBottomColor: colors.borderSubtle }]}
                          onPress={() => enterEdit('location')}
                        >
                          <MapPin size={18} color={colors.textTertiary} />
                          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>מיקום</Text>
                          <Text style={[s.fieldValue, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                            {location}
                          </Text>
                        </Pressable>
                      )}

                      {/* recurring anchor (view mode) — ONLY for yearly recurrence,
                          keyed off the recurrence calendar (not noteType / calendarType).
                          Bug fix: the old `isRecurring` gate both over-showed (non-yearly
                          birthday/yahrzeit) and under-showed (yearly 'note'-type events). */}
                      {recurrenceType === 'yearly' && recurrenceCalendar != null && (
                        <Pressable
                          style={[s.fieldRow, { borderBottomColor: colors.borderSubtle }]}
                          onPress={() => enterEdit(null)}
                        >
                          <CalendarDays size={18} color={colors.textTertiary} />
                          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>עוגן תאריך</Text>
                          <Text style={[s.fieldValue, { color: colors.textPrimary }]}>
                            {recurrenceCalendar === 'hebrew' ? `עברי — ${hebDateLabel}` : `לועזי — ${gregDateLabel}`}
                          </Text>
                        </Pressable>
                      )}

                      {/* Slice B: multi-day end date (view mode) */}
                      {note?.endDateStr && note?.gregorianDateStr && note.endDateStr > note.gregorianDateStr && (() => {
                        const parts = note.endDateStr!.split('-').map(Number);
                        const parsedEnd = new Date(parts[0], parts[1] - 1, parts[2]);
                        const eh = dateService.getDayData(parsedEnd).hebrewDate;
                        const ehYear = eh.year ?? (parsedEnd.getFullYear() + 3760);
                        const endLabel = `${toHebrewNumeral(eh.day)} ${eh.monthName} ${toHebrewYear(ehYear)}`;
                        return (
                          <Pressable
                            style={[s.fieldRow, { borderBottomColor: colors.borderSubtle }]}
                            onPress={() => enterEdit(null)}
                          >
                            <CalendarDays size={18} color={colors.textTertiary} />
                            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>עד תאריך</Text>
                            <Text style={[s.fieldValue, { color: colors.textPrimary }]}>{endLabel}</Text>
                          </Pressable>
                        );
                      })()}

                      {/* reminder */}
                      {note?.reminderMinutes != null && (
                        <Pressable
                          style={[s.fieldRow, s.fieldRowLast, { borderBottomColor: colors.borderSubtle }]}
                          onPress={() => enterEdit(null)}
                        >
                          <Bell size={18} color={colors.textTertiary} />
                          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>תזכורת</Text>
                          <Text style={[s.fieldValue, { color: colors.textPrimary }]}>
                            {note.reminderMinutes === 0
                              ? 'בזמן האירוע'
                              : note.reminderMinutes < 60
                                ? `${note.reminderMinutes} דקות לפני`
                                : note.reminderMinutes === 60
                                  ? 'שעה לפני'
                                  : note.reminderMinutes === 1440
                                    ? 'יום לפני'
                                    : `${note.reminderMinutes} דקות לפני`}
                          </Text>
                        </Pressable>
                      )}
                    </View>

                    {/* bottom toolbar */}
                    <View style={[s.toolbar, { borderTopColor: colors.border }]}>
                      {/* delete */}
                      <Pressable
                        style={s.toolbarBtn}
                        onPress={handleDeletePress}
                        accessibilityLabel="מחק הערה"
                        accessibilityRole="button"
                        hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
                      >
                        <Trash2 size={22} color={colors.textTertiary} />
                        <Text style={[s.toolbarLabel, { color: colors.textTertiary }]}>מחק</Text>
                      </Pressable>

                      {/* share */}
                      <Pressable
                        style={s.toolbarBtn}
                        onPress={() => Alert.alert('שתף', 'בפיתוח')}
                        accessibilityLabel="שתף הערה"
                        accessibilityRole="button"
                        hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
                      >
                        <Share2 size={22} color={colors.textTertiary} />
                        <Text style={[s.toolbarLabel, { color: colors.textTertiary }]}>שתף</Text>
                      </Pressable>

                      {/* edit */}
                      <Pressable
                        style={s.toolbarBtn}
                        onPress={() => setIsViewMode(false)}
                        accessibilityLabel="ערוך הערה"
                        accessibilityRole="button"
                        hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
                      >
                        <Pencil size={22} color={colors.accent} />
                        <Text style={[s.toolbarLabel, { color: colors.accent }]}>עריכה</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  // ── EDIT MODE ──────────────────────────────────────────────
                  <>
                    <View style={s.headerRow}>
                      {/* title — JSX-first = rightmost */}
                      <Text style={[s.title, { color: colors.textPrimary }]}>
                        {note ? 'ערוך הערה' : 'הערה חדשה'}
                      </Text>
                      {/* X button — JSX-last = leftmost */}
                      <Pressable
                        hitSlop={12}
                        onPress={onClose}
                        accessibilityLabel="סגור"
                        accessibilityRole="button"
                        style={s.closeBtnHit}
                      >
                        <Text style={[s.closeBtn, { color: colors.textTertiary }]}>✕</Text>
                      </Pressable>
                    </View>

                    <TextInput
                      ref={summaryInputRef}
                      style={[s.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                      value={summary}
                      onChangeText={setSummary}
                      placeholder="כותרת..."
                      placeholderTextColor={colors.textTertiary}
                      textAlign="right"
                      autoFocus={visible && !note}
                      multiline
                      maxLength={200}
                    />

                    <Text style={[s.sectionLabel, { color: colors.accent }]}>סוג</Text>
                    <View style={s.typeRow}>
                      {NOTE_TYPES.map(({ type, label }) => {
                        const active = noteType === type;
                        const Icon = TYPE_ICON[type];
                        return (
                          <Pressable
                            key={type}
                            onPress={() => setNoteType(type)}
                            accessibilityRole="button"
                            accessibilityLabel={label}
                            accessibilityState={{ selected: active }}
                            style={[
                              s.typeChip,
                              { backgroundColor: active ? colors.accent : colors.surfaceMuted },
                            ]}
                          >
                            <Icon size={18} color={active ? colors.textInverse : colors.textSecondary} />
                            <Text style={[s.typeLabel, { color: active ? colors.textInverse : colors.textSecondary }]}>{label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <ColorPickerRow
                      noteType={noteType}
                      colorId={colorId}
                      onChange={setColorId}
                      colors={colors}
                    />

                    {/* C3 Task 1: Explicit recurrence picker — shown for ALL note types */}
                    <Text style={[s.sectionLabel, { color: colors.accent }]}>חזרה</Text>
                    <View style={s.recurrenceRow}>
                      {RECURRENCE_OPTIONS.map(({ label, value }) => {
                        const active = recurrenceType === value;
                        return (
                          <Pressable
                            key={value}
                            onPress={() => setRecurrenceType(value)}
                            style={[
                              s.recurrenceChip,
                              { backgroundColor: active ? colors.accent : colors.surfaceMuted },
                            ]}
                            accessibilityLabel={label}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text style={[s.recurrenceChipLabel, { color: active ? colors.textInverse : colors.textSecondary }]}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* C3 Task 1: Calendar anchor chips — ONLY for yearly recurrence */}
                    {recurrenceType === 'yearly' && (
                      <>
                        <Text style={[s.sectionLabel, { color: colors.accent }]}>עוגן תאריך</Text>
                        <View style={s.anchorRow}>
                          {(['hebrew', 'gregorian'] as const).map((ct) => {
                            const active = recurrenceCalendar === ct;
                            return (
                              <Pressable
                                key={ct}
                                onPress={() => setRecurrenceCalendar(ct)}
                                style={[
                                  s.anchorChip,
                                  { backgroundColor: active ? colors.accent : colors.surfaceMuted },
                                ]}
                                accessibilityLabel={ct === 'hebrew' ? 'לפי לוח עברי' : 'לפי לוח לועזי'}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                              >
                                <Text style={[s.anchorLabel, { color: active ? colors.textInverse : colors.textSecondary }]}>
                                  {ct === 'hebrew' ? 'לפי לוח עברי' : 'לפי לוח לועזי'}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    )}

                    {/* location field */}
                    <View style={s.locationRow}>
                      {/* input — JSX-first = rightmost in row-reverse */}
                      <TextInput
                        ref={locationInputRef}
                        style={[s.locationInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="מיקום"
                        placeholderTextColor={colors.textTertiary}
                        textAlign="right"
                      />
                      {/* GPS button — JSX-last = leftmost */}
                      <Pressable
                        onPress={handleGPS}
                        style={s.gpsBtn}
                        accessibilityLabel="קבל מיקום נוכחי"
                        accessibilityRole="button"
                        accessibilityHint="ממלא את שדה המיקום עם הכתובת הנוכחית"
                      >
                        {locationLoading
                          ? <ActivityIndicator size="small" color={colors.accent} />
                          : <MapPin size={22} color={colors.accent} />
                        }
                      </Pressable>
                    </View>

                    {/* ── All-day / multi-day field-group card ────────────────── */}
                    <View style={[s.fieldGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      {/* All-day toggle — [icon, label(flex:1,right), Switch] */}
                      <View style={[s.fieldRow, !(allDay && recurrenceType === 'none') && s.fieldRowLast, { borderBottomColor: colors.borderSubtle }]}>
                        <Sun size={18} color={colors.textTertiary} />
                        <Text style={[s.fieldLabel, { color: colors.textSecondary, flex: 1 }]}>
                          כל היום
                        </Text>
                        <Switch
                          value={allDay}
                          onValueChange={setAllDay}
                          trackColor={{ false: colors.border, true: colors.accent }}
                          accessibilityLabel="כל היום"
                        />
                      </View>

                      {/* Slice B: Multi-day toggle (only for all-day non-recurring) */}
                      {allDay && recurrenceType === 'none' && (
                        <View style={[s.fieldRow, !multiDay && s.fieldRowLast, { borderBottomColor: colors.borderSubtle }]}>
                          <CalendarRange size={18} color={colors.textTertiary} />
                          <Text style={[s.fieldLabel, { color: colors.textSecondary, flex: 1 }]}>
                            מרובה ימים
                          </Text>
                          <Switch
                            value={multiDay}
                            onValueChange={setMultiDay}
                            trackColor={{ false: colors.border, true: colors.accent }}
                            accessibilityLabel="מרובה ימים"
                          />
                        </View>
                      )}

                      {/* Slice B: End-date chip (only when multiDay is on) */}
                      {multiDay && allDay && recurrenceType === 'none' && (() => {
                        const eh = dateService.getDayData(endDate).hebrewDate;
                        // getDayData always populates year for valid dates; the optional
                        // in the type is a defensive remnant. Fall back to endDate's
                        // Gregorian year + 3760 (approximate) only as a last resort.
                        const ehYear = eh.year ?? (endDate.getFullYear() + 3760);
                        const endLabel = `${toHebrewNumeral(eh.day)} ${eh.monthName} ${toHebrewYear(ehYear)}`;
                        return (
                          <View style={[s.fieldRow, s.fieldRowLast]}>
                            <CalendarDays size={18} color={colors.textTertiary} />
                            <Text style={[s.fieldLabel, { color: colors.textSecondary, flex: 1 }]}>עד תאריך</Text>
                            <Pressable
                              onPress={() => setEndPickerVisible(true)}
                              style={[s.timeChip, { backgroundColor: colors.surfaceElevated }]}
                              accessibilityLabel={`תאריך סיום: ${endLabel}`}
                              accessibilityRole="button"
                            >
                              <Text style={[s.timeChipText, { color: colors.textPrimary }]}>
                                {endLabel}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })()}
                    </View>

                    {/* ── Time fields card (only when allDay = false) ─────────── */}
                    {!allDay && (
                      <View style={[s.fieldGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        {/* Start time row */}
                        <View style={[s.fieldRow, { borderBottomColor: colors.borderSubtle }]}>
                          <Clock size={18} color={colors.textTertiary} />
                          <Text style={[s.fieldLabel, { color: colors.textSecondary, flex: 1 }]}>משעה</Text>
                          <Pressable
                            onPress={openStartPicker}
                            style={[s.timeChip, { backgroundColor: colors.surfaceElevated }]}
                            accessibilityLabel={`שעת התחלה: ${formatHM(startTime, use24hTime)}`}
                            accessibilityRole="button"
                          >
                            <Text style={[s.timeChipText, { color: colors.textPrimary }]}>
                              {formatHM(startTime, use24hTime)}
                            </Text>
                          </Pressable>
                        </View>

                        {/* End time row */}
                        <View style={[s.fieldRow, s.fieldRowLast]}>
                          <Clock size={18} color={colors.textTertiary} />
                          <Text style={[s.fieldLabel, { color: colors.textSecondary, flex: 1 }]}>עד שעה</Text>
                          {endTime !== null ? (
                            <View style={s.endTimeGroup}>
                              <Pressable
                                onPress={openEndPicker}
                                style={[s.timeChip, { backgroundColor: colors.surfaceElevated }]}
                                accessibilityLabel={`שעת סיום: ${formatHM(endTime, use24hTime)}`}
                                accessibilityRole="button"
                              >
                                <Text style={[s.timeChipText, { color: colors.textPrimary }]}>
                                  {formatHM(endTime, use24hTime)}
                                </Text>
                              </Pressable>
                              {/* Clear end time */}
                              <Pressable
                                onPress={() => setEndTime(null)}
                                hitSlop={14}
                                style={s.clearEndTimeHit}
                                accessibilityLabel="הסר שעת סיום"
                                accessibilityRole="button"
                              >
                                <Text style={[s.clearEndTime, { color: colors.textTertiary }]}>✕</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Pressable
                              onPress={openEndPicker}
                              style={[s.timeChip, s.timeChipAdd, { borderColor: colors.border }]}
                              accessibilityLabel="הוסף שעת סיום"
                              accessibilityRole="button"
                            >
                              <Text style={[s.timeChipText, { color: colors.textTertiary }]}>הוסף</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    )}

                    {/* ── Reminder field-group card ────────────────────────────── */}
                    <View style={[s.fieldGroup, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={[s.fieldRow, !(allDay && reminderEnabled) && s.fieldRowLast, { borderBottomColor: colors.borderSubtle }]}>
                        <Bell size={18} color={colors.textTertiary} />
                        <Text style={[s.fieldLabel, { color: colors.textSecondary, flex: 1 }]}>
                          תזכּר אותי
                        </Text>
                        <Switch
                          value={reminderEnabled}
                          onValueChange={handleReminderToggle}
                          trackColor={{ false: colors.border, true: colors.accent }}
                        />
                      </View>

                      {/* Inline reminder time chip — shown only for all-day events with reminder on */}
                      {allDay && reminderEnabled && (
                        <View style={[s.fieldRow, s.fieldRowLast]}>
                          <Clock size={18} color={colors.textTertiary} />
                          <Text style={[s.fieldLabel, { color: colors.textSecondary, flex: 1 }]}>שעת תזכורת</Text>
                          <Pressable
                            onPress={openReminderTimePicker}
                            style={[s.timeChip, { backgroundColor: colors.surfaceElevated }]}
                            accessibilityRole="button"
                            accessibilityLabel={`שעת תזכורת: ${formatHM(reminderTime, use24hTime)}`}
                          >
                            <Text style={[s.timeChipText, { color: colors.textPrimary }]}>
                              {formatHM(reminderTime, use24hTime)}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>

                    {reminderEnabled && (
                      <>
                        <View style={s.leadTimeRow}>
                          {LEAD_TIME_OPTIONS.map(({ label, minutes }) => {
                            const isCustom = minutes === -1;
                            const active = isCustom
                              ? reminderMinutes < 0 || !LEAD_TIME_OPTIONS.slice(0, -1).some(o => o.minutes === reminderMinutes)
                              : reminderMinutes === minutes;
                            return (
                              <Pressable
                                key={label}
                                onPress={() => {
                                  if (isCustom) {
                                    setReminderMinutes(-1);
                                  } else {
                                    setReminderMinutes(minutes);
                                  }
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={label}
                                accessibilityState={{ selected: active }}
                                style={[
                                  s.leadChip,
                                  { backgroundColor: active ? colors.accent : colors.surfaceMuted },
                                ]}
                              >
                                <Text style={[s.leadChipLabel, { color: active ? colors.textInverse : colors.textSecondary }]}>
                                  {label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        {reminderMinutes === -1 && (
                          <View style={s.customRow}>
                            <Text style={[s.sectionLabel, { color: colors.accent, marginBottom: 0 }]}>
                              דקות לפני:
                            </Text>
                            <TextInput
                              style={[s.customInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
                              value={customMinutes}
                              onChangeText={setCustomMinutes}
                              keyboardType="number-pad"
                              maxLength={4}
                            />
                          </View>
                        )}
                      </>
                    )}

                    {/* Footer — row-reverse, [Save, Cancel] so Save (primary) sits on the RIGHT */}
                    <View style={s.actions}>
                      <Pressable
                        onPress={handleSave}
                        style={[s.btn, { backgroundColor: colors.accent }]}
                        accessibilityRole="button"
                        accessibilityLabel="שמירה"
                      >
                        <Text style={[s.btnText, { color: colors.textInverse }]}>שמירה</Text>
                      </Pressable>
                      <Pressable
                        onPress={onClose}
                        style={[s.btn, { backgroundColor: colors.surfaceMuted }]}
                        accessibilityRole="button"
                        accessibilityLabel="ביטול"
                      >
                        <Text style={[s.btnText, { color: colors.textSecondary }]}>ביטול</Text>
                      </Pressable>
                    </View>
                  </>
                )}
                </ScrollView>
              </View>
          </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: overlay.modal, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, paddingBottom: 36, maxHeight: '85%' },
  handle: { width: 38, height: 4, borderRadius: radius.full, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 14 },
  title: { flex: 1, textAlign: 'right', ...withFontFamily(typography.displaySmall) },
  // Nearest token: typography.displaySmall (20/600/26) — exact fontSize AND
  // fontWeight match, no delta.
  closeBtn: { ...withFontFamily(typography.displaySmall) },
  // Visual size stays modest; the Pressable itself is padded to reach the 48dp target.
  closeBtnHit: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  input: {
    borderWidth: 1, borderRadius: radius.md, padding: 12,
    minHeight: 52, textAlignVertical: 'top', marginBottom: 16,
    ...withFontFamily(typography.bodyMedium),
  },
  sectionLabel: {
    textAlign: 'right', marginBottom: 8,
    ...withFontFamily(typography.captionBold),
  },
  // Chip rows (type / recurrence / anchor / lead-time): row-reverse + flexWrap so the
  // FIRST option lands at the right. Active = accent fill + inverse bold; inactive =
  // surfaceMuted + textSecondary. Fully rounded pills.
  typeRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    borderRadius: radius.full, paddingVertical: 9, paddingHorizontal: 14,
  },
  typeLabel: { ...withFontFamily(typography.bodySmall) },
  recurrenceRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  recurrenceChip: {
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  recurrenceChipLabel: {
    ...withFontFamily(typography.bodySmall),
  },
  // Calendar anchor chips (shown only for yearly)
  anchorRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  anchorChip: { borderRadius: radius.full, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  anchorLabel: { textAlign: 'center', ...withFontFamily(typography.bodySmall) },
  // Footer — row-reverse, [Save, Cancel] JSX order puts Save on the RIGHT.
  actions: { flexDirection: 'row-reverse', gap: 10, marginTop: 4 },
  btn: { flex: 1, minHeight: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  btnText: { ...withFontFamily(typography.bodyLarge) },
  // Field-group card — used for view-mode metadata and edit-mode toggle groups.
  // Rows are separated by hairlines; the card itself clips to radius.lg.
  fieldGroup: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldRowLast: {
    borderBottomWidth: 0,
  },
  fieldLabel: {
    textAlign: 'right',
    ...withFontFamily(typography.bodyMedium),
  },
  fieldValue: {
    textAlign: 'right',
    ...withFontFamily(typography.bodyMedium),
  },
  timeChip: {
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  timeChipAdd: {
    borderWidth: StyleSheet.hairlineWidth,
    // No background fill for the "הוסף" affordance — it reads as a ghost button.
  },
  timeChipText: {
    ...withFontFamily(typography.bodySmall),
  },
  endTimeGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  // Nearest token: typography.bodySmall (13/400/18) — fontWeight (default
  // 400) exact match; fontSize delta 14→13 (1px).
  clearEndTime: {
    ...withFontFamily(typography.bodySmall),
  },
  // The visual glyph stays small; the Pressable is padded to reach 48dp with hitSlop.
  clearEndTimeHit: { minWidth: 28, minHeight: 28, alignItems: 'center', justifyContent: 'center' },
  leadTimeRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  leadChip: {
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  leadChipLabel: {
    ...withFontFamily(typography.bodySmall),
  },
  customRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 8,
    width: 70,
    textAlign: 'center',
    ...withFontFamily(typography.bodyMedium),
  },
  // toolbar (view mode) — each button is padded + hitSlop-extended to reach ≥48dp.
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  toolbarLabel: {
    ...withFontFamily(typography.caption),
  },
  // view-mode: summary kept prominent above the field-group card
  viewField: { marginBottom: 12 },
  viewSummary: { textAlign: 'right', ...withFontFamily(typography.displaySmall) },
  // location field (edit mode)
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  locationInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
    textAlign: 'right',
    ...withFontFamily(typography.bodySmall),
  },
  gpsBtn: { padding: 8, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
