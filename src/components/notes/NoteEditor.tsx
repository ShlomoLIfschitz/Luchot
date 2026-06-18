// src/components/notes/NoteEditor.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, Switch, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Pencil, Trash2, Share2, Cake, Flame, Gem, FileText, type LucideIcon } from 'lucide-react-native';
import { radius } from '../../constants/radius';
import { overlay } from '../../constants/overlay';
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
          const hexColor = (colors as Record<string, string>)[key] ?? '#888';
          const isSelected = key === effectiveKey;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              style={[cpStyles.circle, { backgroundColor: hexColor }]}
            >
              {isSelected && <Text style={cpStyles.checkmark}>✓</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const cpStyles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  circles: {
    flexDirection: 'row-reverse',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-start',
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
                <View style={[s.handle, { backgroundColor: colors.border }]} />

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
                        hitSlop={8}
                        onPress={onClose}
                        accessibilityLabel="סגור"
                        accessibilityRole="button"
                      >
                        <Text style={[s.closeBtn, { color: colors.textTertiary }]}>✕</Text>
                      </Pressable>
                    </View>

                    {/* summary */}
                    <Pressable style={s.viewField} onPress={() => enterEdit('summary')}>
                      <Text style={[s.viewFieldValue, s.viewSummary, { color: colors.textPrimary }]}>
                        {summary}
                      </Text>
                    </Pressable>

                    {/* time (timed events only) */}
                    {note && !note.isAllDay && note.startDateTime && (
                      <Pressable style={[s.viewField, s.viewRow]} onPress={() => enterEdit(null)}>
                        <Text style={[s.viewFieldValue, { color: colors.textSecondary }]}>
                          {formatHM(new Date(note.startDateTime), use24hTime)}
                          {note.endDateTime ? ` — ${formatHM(new Date(note.endDateTime), use24hTime)}` : ''}
                        </Text>
                      </Pressable>
                    )}

                    {/* note type */}
                    {noteTypeInfo && (
                      <Pressable style={[s.viewField, s.viewRow]} onPress={() => enterEdit(null)}>
                        {(() => { const TypeIcon = TYPE_ICON[noteType]; return <TypeIcon size={20} color={colors.textSecondary} />; })()}
                        <Text style={[s.viewFieldValue, { color: colors.textSecondary }]}>
                          {noteTypeInfo.label}
                        </Text>
                      </Pressable>
                    )}

                    {/* location */}
                    {!!location && (
                      <Pressable style={[s.viewField, s.viewRow]} onPress={() => enterEdit('location')}>
                        <MapPin size={14} color={colors.textTertiary} />
                        <Text style={[s.viewFieldValue, { color: colors.textSecondary, flex: 1 }]}>
                          {location}
                        </Text>
                      </Pressable>
                    )}

                    {/* recurring anchor (view mode) — ONLY for yearly recurrence,
                        keyed off the recurrence calendar (not noteType / calendarType).
                        Bug fix: the old `isRecurring` gate both over-showed (non-yearly
                        birthday/yahrzeit) and under-showed (yearly 'note'-type events). */}
                    {recurrenceType === 'yearly' && recurrenceCalendar != null && (
                      <Pressable style={s.viewField} onPress={() => enterEdit(null)}>
                        <Text style={[s.viewFieldLabel, { color: colors.textTertiary }]}>עוגן תאריך</Text>
                        <Text style={[s.viewFieldValue, { color: colors.textSecondary }]}>
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
                        <Pressable style={s.viewField} onPress={() => enterEdit(null)}>
                          <Text style={[s.viewFieldLabel, { color: colors.textTertiary }]}>עד תאריך</Text>
                          <Text style={[s.viewFieldValue, { color: colors.textSecondary }]}>{endLabel}</Text>
                        </Pressable>
                      );
                    })()}

                    {/* reminder */}
                    {note?.reminderMinutes != null && (
                      <Pressable style={s.viewField} onPress={() => enterEdit(null)}>
                        <Text style={[s.viewFieldLabel, { color: colors.textTertiary }]}>תזכורת</Text>
                        <Text style={[s.viewFieldValue, { color: colors.textSecondary }]}>
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

                    {/* bottom toolbar */}
                    <View style={[s.toolbar, { borderTopColor: colors.border }]}>
                      {/* delete */}
                      <Pressable
                        style={s.toolbarBtn}
                        onPress={handleDeletePress}
                        accessibilityLabel="מחק הערה"
                        accessibilityRole="button"
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
                        hitSlop={8}
                        onPress={onClose}
                        accessibilityLabel="סגור"
                        accessibilityRole="button"
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

                    <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>סוג</Text>
                    <View style={s.typeRow}>
                      {NOTE_TYPES.map(({ type, label }) => {
                        const active = noteType === type;
                        const Icon = TYPE_ICON[type];
                        return (
                          <Pressable
                            key={type}
                            onPress={() => setNoteType(type)}
                            style={[
                              s.typeChip,
                              { borderColor: colors.border, backgroundColor: colors.background },
                              active && { backgroundColor: colors.accent, borderColor: colors.accent },
                            ]}
                          >
                            <Icon size={20} color={colors.textSecondary} />
                            <Text style={[s.typeLabel, { color: active ? colors.textInverse : colors.textPrimary }]}>{label}</Text>
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
                    <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>חזרה</Text>
                    <View style={s.recurrenceRow}>
                      {RECURRENCE_OPTIONS.map(({ label, value }) => {
                        const active = recurrenceType === value;
                        return (
                          <Pressable
                            key={value}
                            onPress={() => setRecurrenceType(value)}
                            style={[
                              s.recurrenceChip,
                              { borderColor: colors.border, backgroundColor: colors.background },
                              active && { backgroundColor: colors.accent, borderColor: colors.accent },
                            ]}
                            accessibilityLabel={label}
                            accessibilityRole="button"
                          >
                            <Text style={[s.recurrenceChipLabel, { color: active ? colors.textInverse : colors.textPrimary }]}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* C3 Task 1: Calendar anchor chips — ONLY for yearly recurrence */}
                    {recurrenceType === 'yearly' && (
                      <>
                        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>עוגן תאריך</Text>
                        <View style={s.anchorRow}>
                          {(['hebrew', 'gregorian'] as const).map((ct) => {
                            const active = recurrenceCalendar === ct;
                            return (
                              <Pressable
                                key={ct}
                                onPress={() => setRecurrenceCalendar(ct)}
                                style={[
                                  s.anchorChip,
                                  { borderColor: colors.border, backgroundColor: colors.background },
                                  active && { backgroundColor: colors.accent, borderColor: colors.accent },
                                ]}
                                accessibilityLabel={ct === 'hebrew' ? 'לפי לוח עברי' : 'לפי לוח לועזי'}
                                accessibilityRole="button"
                              >
                                <Text style={[s.anchorLabel, { color: active ? colors.textInverse : colors.textPrimary }]}>
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

                    {/* ── All-day toggle ────────────────────────────────────── */}
                    <View style={s.allDayRow}>
                      {/* label — JSX-first = rightmost (row-reverse) */}
                      <Text style={[s.sectionLabel, { color: colors.textTertiary, marginBottom: 0 }]}>
                        כל היום
                      </Text>
                      {/* Switch — JSX-last = leftmost */}
                      <Switch
                        value={allDay}
                        onValueChange={setAllDay}
                        trackColor={{ false: colors.border, true: colors.accent }}
                        accessibilityLabel="כל היום"
                      />
                    </View>

                    {/* ── Slice B: Multi-day toggle (only for all-day non-recurring) ── */}
                    {allDay && recurrenceType === 'none' && (
                      <View style={s.allDayRow}>
                        {/* label — JSX-first = rightmost (row-reverse) */}
                        <Text style={[s.sectionLabel, { color: colors.textTertiary, marginBottom: 0 }]}>
                          מרובה ימים
                        </Text>
                        {/* Switch — JSX-last = leftmost */}
                        <Switch
                          value={multiDay}
                          onValueChange={setMultiDay}
                          trackColor={{ false: colors.border, true: colors.accent }}
                          accessibilityLabel="מרובה ימים"
                        />
                      </View>
                    )}

                    {/* ── Slice B: End-date chip (only when multiDay is on) ────── */}
                    {multiDay && allDay && recurrenceType === 'none' && (() => {
                      const eh = dateService.getDayData(endDate).hebrewDate;
                      // getDayData always populates year for valid dates; the optional
                      // in the type is a defensive remnant. Fall back to endDate's
                      // Gregorian year + 3760 (approximate) only as a last resort.
                      const ehYear = eh.year ?? (endDate.getFullYear() + 3760);
                      const endLabel = `${toHebrewNumeral(eh.day)} ${eh.monthName} ${toHebrewYear(ehYear)}`;
                      return (
                        <View style={s.timeFieldRow}>
                          {/* label — JSX-first = rightmost (row-reverse) */}
                          <Text style={[s.timeFieldLabel, { color: colors.textTertiary }]}>עד תאריך</Text>
                          {/* chip — JSX-last = leftmost */}
                          <Pressable
                            onPress={() => setEndPickerVisible(true)}
                            style={[s.timeChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
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

                    {/* ── Time fields (only when allDay = false) ────────────── */}
                    {!allDay && (
                      <>
                        {/* Start time row */}
                        <View style={s.timeFieldRow}>
                          {/* label — JSX-first = rightmost */}
                          <Text style={[s.timeFieldLabel, { color: colors.textTertiary }]}>משעה</Text>
                          {/* time value — JSX-last = leftmost */}
                          <Pressable
                            onPress={openStartPicker}
                            style={[s.timeChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                            accessibilityLabel={`שעת התחלה: ${formatHM(startTime, use24hTime)}`}
                            accessibilityRole="button"
                          >
                            <Text style={[s.timeChipText, { color: colors.textPrimary }]}>
                              {formatHM(startTime, use24hTime)}
                            </Text>
                          </Pressable>
                        </View>

                        {/* End time row */}
                        <View style={s.timeFieldRow}>
                          {/* label — JSX-first = rightmost */}
                          <Text style={[s.timeFieldLabel, { color: colors.textTertiary }]}>עד שעה</Text>
                          {/* time value / add affordance — JSX-last = leftmost */}
                          {endTime !== null ? (
                            <View style={s.endTimeGroup}>
                              <Pressable
                                onPress={openEndPicker}
                                style={[s.timeChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
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
                                hitSlop={10}
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
                      </>
                    )}

                    {/* reminder toggle */}
                    <View style={s.reminderToggleRow}>
                      <Text style={[s.sectionLabel, { color: colors.textTertiary, marginBottom: 0 }]}>
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
                      <View style={s.timeFieldRow}>
                        {/* label — JSX-first = rightmost (row-reverse) */}
                        <Text style={[s.timeFieldLabel, { color: colors.textTertiary }]}>שעת תזכורת</Text>
                        {/* chip — JSX-last = leftmost */}
                        <Pressable
                          onPress={openReminderTimePicker}
                          style={[s.timeChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                          accessibilityRole="button"
                          accessibilityLabel={`שעת תזכורת: ${formatHM(reminderTime, use24hTime)}`}
                        >
                          <Text style={[s.timeChipText, { color: colors.textPrimary }]}>
                            {formatHM(reminderTime, use24hTime)}
                          </Text>
                        </Pressable>
                      </View>
                    )}

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
                                style={[
                                  s.leadChip,
                                  { borderColor: colors.border, backgroundColor: colors.background },
                                  active && { backgroundColor: colors.accent, borderColor: colors.accent },
                                ]}
                              >
                                <Text style={[s.leadChipLabel, { color: active ? colors.textInverse : colors.textPrimary }]}>
                                  {label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        {reminderMinutes === -1 && (
                          <View style={s.customRow}>
                            <Text style={[s.sectionLabel, { color: colors.textTertiary, marginBottom: 0 }]}>
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

                    <View style={s.actions}>
                      <Pressable onPress={onClose} style={[s.btn, { borderColor: colors.border }]}>
                        <Text style={[s.btnText, { color: colors.textSecondary }]}>ביטול</Text>
                      </Pressable>
                      <Pressable onPress={handleSave} style={[s.btn, s.btnSave, { backgroundColor: colors.accent }]}>
                        <Text style={[s.btnText, { color: colors.textInverse }]}>שמור</Text>
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
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 14 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'right' },
  closeBtn: { fontSize: 18, fontWeight: '600', padding: 4 },
  input: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 15, minHeight: 52, textAlignVertical: 'top', marginBottom: 16,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'right', marginBottom: 8 },
  typeRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 16 },
  typeChip: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center', gap: 3 },
  typeLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  // C3: recurrence chip row — wraps if needed (row-reverse + flexWrap)
  recurrenceRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  recurrenceChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  recurrenceChipLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Calendar anchor chips (shown only for yearly)
  anchorRow: { gap: 8, marginBottom: 16 },
  anchorChip: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  anchorLabel: { fontSize: 13, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  btnSave: { borderWidth: 0 },
  btnText: { fontSize: 15, fontWeight: '600' },
  // All-day toggle (matches reminderToggleRow style)
  allDayRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  // Time fields (only shown when allDay = false)
  timeFieldRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  timeFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'right',
    minWidth: 50,
  },
  timeChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  timeChipAdd: {
    // No background fill for the "הוסף" affordance — it reads as a ghost button.
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  endTimeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearEndTime: {
    fontSize: 14,
    padding: 4,
  },
  reminderToggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  leadTimeRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  leadChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  leadChipLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  customRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    width: 70,
    fontSize: 14,
    textAlign: 'center',
  },
  // toolbar (view mode)
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toolbarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  // view-mode read-only fields
  viewField: { marginBottom: 12 },
  viewRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  viewSummary: { fontSize: 18, fontWeight: '600' },
  viewFieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'right', marginBottom: 2 },
  viewFieldValue: { fontSize: 15, textAlign: 'right' },
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
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    textAlign: 'right',
  },
  gpsBtn: { padding: 8 },
});
