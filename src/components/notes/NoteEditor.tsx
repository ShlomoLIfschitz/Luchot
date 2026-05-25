// src/components/notes/NoteEditor.tsx

import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
} from 'react-native';
import { radius } from '../../constants/radius';
import { overlay } from '../../constants/overlay';
import type { ThemeColors } from '../../hooks/useThemeColors';
import type { NoteType, CalendarNote } from '../../hooks/useNotes';
import type { HebrewDateInfo } from '../../services/DateService';
import { toHebrewNumeral, toHebrewYear } from '../../services/DateService';

const NOTE_TYPES: { type: NoteType; label: string; icon: string }[] = [
  { type: 'note',        label: 'הערה',      icon: '📝' },
  { type: 'birthday',    label: 'יום הולדת', icon: '🎂' },
  { type: 'yahrzeit',    label: 'יארצייט',   icon: '🕯' },
  { type: 'anniversary', label: 'יום שנה',   icon: '💍' },
];

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
  }) => void;
  onClose: () => void;
}

export function NoteEditor({ visible, note, date, hebrewDate, colors, onSave, onClose }: Props) {
  const [summary, setSummary] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('note');
  const [calendarType, setCalendarType] = useState<'hebrew' | 'gregorian'>('hebrew');

  useEffect(() => {
    if (visible) {
      setSummary(note?.summary ?? '');
      setNoteType(note?.noteType ?? 'note');
      setCalendarType(note?.calendarType ?? 'hebrew');
    }
  }, [visible, note]);

  const handleSave = () => {
    const trimmed = summary.trim();
    if (!trimmed) return;
    onSave({ id: note?.id, created: note?.created, summary: trimmed, noteType, calendarType, date, hebrewDate });
    onClose();
  };

  const hebDateLabel = `${toHebrewNumeral(hebrewDate.day)} ${hebrewDate.monthName} ${toHebrewYear(hebrewDate.year)}`;
  const gregDateLabel = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  const isRecurring = noteType !== 'note';

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <TouchableWithoutFeedback>
              <View style={[s.sheet, { backgroundColor: colors.surface }]}>
                <View style={[s.handle, { backgroundColor: colors.border }]} />

                <Text style={[s.title, { color: colors.textPrimary }]}>
                  {note ? 'ערוך הערה' : 'הערה חדשה'}
                </Text>

                <TextInput
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
                  {NOTE_TYPES.map(({ type, label, icon }) => {
                    const active = noteType === type;
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
                        <Text style={s.typeIcon}>{icon}</Text>
                        <Text style={[s.typeLabel, { color: active ? colors.textInverse : colors.textPrimary }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

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

                <View style={s.actions}>
                  <Pressable onPress={onClose} style={[s.btn, { borderColor: colors.border }]}>
                    <Text style={[s.btnText, { color: colors.textSecondary }]}>ביטול</Text>
                  </Pressable>
                  <Pressable onPress={handleSave} style={[s.btn, s.btnSave, { backgroundColor: colors.accent }]}>
                    <Text style={[s.btnText, { color: colors.textInverse }]}>שמור</Text>
                  </Pressable>
                </View>
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
  title: { fontSize: 17, fontWeight: '700', textAlign: 'right', marginBottom: 14 },
  input: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 15, minHeight: 52, textAlignVertical: 'top', marginBottom: 16,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textAlign: 'right', marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeChip: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center', gap: 3 },
  typeIcon: { fontSize: 18 },
  typeLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  anchorRow: { gap: 8, marginBottom: 16 },
  anchorChip: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  anchorLabel: { fontSize: 13, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  btnSave: { borderWidth: 0 },
  btnText: { fontSize: 15, fontWeight: '600' },
});
