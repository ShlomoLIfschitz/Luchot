// src/components/notes/NoteEditor.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet, Switch, Alert,
  TouchableWithoutFeedback, KeyboardAvoidingView, Platform, ActivityIndicator,
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
  }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function NoteEditor({ visible, note, date, hebrewDate, colors, onSave, onDelete, onClose }: Props) {
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
    }
  }, [visible, note]);

  useEffect(() => {
    if (!isViewMode && focusTarget) {
      const ref = focusTarget === 'summary' ? summaryInputRef : locationInputRef;
      // let the edit-mode inputs mount first
      const t = setTimeout(() => ref.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isViewMode, focusTarget]);

  const handleSave = () => {
    const trimmed = summary.trim();
    if (!trimmed) return;
    const finalReminderMinutes: number | null = (() => {
      if (!reminderEnabled) return null;
      if (reminderMinutes === -1) {
        const parsed = parseInt(customMinutes, 10);
        return isNaN(parsed) || parsed < 0 ? 0 : parsed;
      }
      return reminderMinutes;
    })();
    onSave({
      id: note?.id,
      created: note?.created,
      summary: trimmed,
      noteType,
      calendarType,
      date,
      hebrewDate,
      reminderMinutes: finalReminderMinutes,
      colorId,
      location: location.trim() || null,
    });
    if (note?.id) {
      setIsViewMode(true);
    } else {
      onClose();
    }
  };

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
  const isRecurring = noteType !== 'note';
  const noteTypeInfo = NOTE_TYPES.find((t) => t.type === noteType);

  const enterEdit = (target: 'summary' | 'location' | null) => {
    setFocusTarget(target);
    setIsViewMode(false);
  };

  const handleDeletePress = () => {
    Alert.alert(
      'מחק אירוע',
      'האם למחוק את האירוע לצמיתות?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => {
            onDelete?.(note!.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableWithoutFeedback>
              <View style={[s.sheet, { backgroundColor: colors.surface }]}>
                <View style={[s.handle, { backgroundColor: colors.border }]} />

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

                    {/* recurring anchor */}
                    {isRecurring && (
                      <Pressable style={s.viewField} onPress={() => enterEdit(null)}>
                        <Text style={[s.viewFieldLabel, { color: colors.textTertiary }]}>עוגן תאריך</Text>
                        <Text style={[s.viewFieldValue, { color: colors.textSecondary }]}>
                          {calendarType === 'hebrew' ? `עברי — ${hebDateLabel}` : `לועזי — ${gregDateLabel}`}
                        </Text>
                      </Pressable>
                    )}

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

                    {isRecurring && (
                      <>
                        <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>עוגן תאריך</Text>
                        <View style={s.anchorRow}>
                          {(['hebrew', 'gregorian'] as const).map((ct) => {
                            const active = calendarType === ct;
                            return (
                              <Pressable
                                key={ct}
                                onPress={() => setCalendarType(ct)}
                                style={[
                                  s.anchorChip,
                                  { borderColor: colors.border, backgroundColor: colors.background },
                                  active && { backgroundColor: colors.accent, borderColor: colors.accent },
                                ]}
                              >
                                <Text style={[s.anchorLabel, { color: active ? colors.textInverse : colors.textPrimary }]}>
                                  {ct === 'hebrew' ? `עברי — ${hebDateLabel}` : `לועזי — ${gregDateLabel}`}
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

                    {/* reminder toggle */}
                    <View style={s.reminderToggleRow}>
                      <Text style={[s.sectionLabel, { color: colors.textTertiary, marginBottom: 0 }]}>
                        תזכּר אותי
                      </Text>
                      <Switch
                        value={reminderEnabled}
                        onValueChange={setReminderEnabled}
                        trackColor={{ false: colors.border, true: colors.accent }}
                      />
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
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: overlay.modal, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, paddingBottom: 36 },
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
  anchorRow: { gap: 8, marginBottom: 16 },
  anchorChip: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  anchorLabel: { fontSize: 13, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  btnSave: { borderWidth: 0 },
  btnText: { fontSize: 15, fontWeight: '600' },
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
