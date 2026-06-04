// src/components/notes/NoteList.tsx

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useNotes, CalendarNote, NoteType } from '../../hooks/useNotes';
import { NoteEditor } from './NoteEditor';
import type { HebrewDateInfo } from '../../services/DateService';
import { COLOR_OPTIONS, type ColorTokenKey } from '../../utils/colorResolver';
import { overlay } from '../../constants/overlay';

const TYPE_ICONS: Record<NoteType, string> = {
  note:        '📝',
  birthday:    '🎂',
  yahrzeit:    '🕯',
  anniversary: '💍',
};

interface Props {
  date: Date;
  hebrewDate: HebrewDateInfo;
  hideAddButton?: boolean;
}

export function NoteList({ date, hebrewDate, hideAddButton }: Props) {
  const colors = useThemeColors();
  const { notes, saveNote, deleteNote } = useNotes(date);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<CalendarNote | undefined>(undefined);
  const [colorPickerNote, setColorPickerNote] = useState<CalendarNote | null>(null);

  const resolveHexColor = (note: CalendarNote): string => {
    const effectiveKey: ColorTokenKey =
      (note.colorId as ColorTokenKey | undefined) ??
      ({ note: 'tagEvent', birthday: 'tagPersonal', yahrzeit: 'tagPersonal', anniversary: 'tagPersonal' } as Record<string, ColorTokenKey>)[note.noteType] ??
      'tagEvent';
    return (colors as Record<string, string>)[effectiveKey] ?? colors.tagEvent;
  };

  const openAdd = () => {
    setEditingNote(undefined);
    setEditorVisible(true);
  };

  const openEdit = (note: CalendarNote) => {
    setEditingNote(note);
    setEditorVisible(true);
  };

  const confirmDelete = (note: CalendarNote) => {
    Alert.alert(
      'מחק הערה',
      `למחוק "${note.summary}"?`,
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'מחק', style: 'destructive', onPress: () => deleteNote(note.id) },
      ]
    );
  };

  return (
    <View style={s.container}>
      {/* Section header */}
      <View style={s.header}>
        {!hideAddButton && (
          <Pressable onPress={openAdd} style={[s.addBtn, { backgroundColor: colors.accentLight }]}>
            <Text style={[s.addBtnText, { color: colors.accent }]}>+ הוסף הערה</Text>
          </Pressable>
        )}
        <Text style={[s.headerTitle, { color: colors.textTertiary }]}>הערות</Text>
      </View>

      {notes.length === 0 ? (
        <Text style={[s.empty, { color: colors.textTertiary }]}>אין הערות ליום זה</Text>
      ) : (
        notes.map((note) => (
          <Pressable
            key={note.id}
            onPress={() => openEdit(note)}
            style={[s.noteRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
          >
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); setColorPickerNote(note); }}
              hitSlop={8}
              style={[s.colorDot, { backgroundColor: resolveHexColor(note) }]}
            />
            <Text style={s.noteIcon}>{TYPE_ICONS[note.noteType]}</Text>
            <View style={s.noteBody}>
              <Text style={[s.noteSummary, { color: colors.textPrimary }]}>{note.summary}</Text>
              {note.recurring && (
                <Text style={[s.noteTag, { color: colors.textTertiary }]}>
                  {note.calendarType === 'hebrew' ? '↺ עברי' : '↺ לועזי'}
                </Text>
              )}
            </View>
            <Pressable onPress={() => confirmDelete(note)} hitSlop={10} style={s.deleteBtn}>
              <Text style={[s.deleteIcon, { color: colors.textTertiary }]}>✕</Text>
            </Pressable>
          </Pressable>
        ))
      )}

      {/* Quick color picker */}
      <Modal
        transparent
        animationType="fade"
        visible={colorPickerNote !== null}
        onRequestClose={() => setColorPickerNote(null)}
      >
        <TouchableWithoutFeedback onPress={() => setColorPickerNote(null)}>
          <View style={[s.colorModalOverlay, { backgroundColor: overlay.modal }]}>
            <TouchableWithoutFeedback>
              <View style={[s.colorModalSheet, { backgroundColor: colors.surface }]}>
                <View style={s.colorModalCircles}>
                  {COLOR_OPTIONS.map((key) => {
                    const hexColor = (colors as Record<string, string>)[key] ?? '#888';
                    const isSelected =
                      (colorPickerNote?.colorId ?? ({ note: 'tagEvent', birthday: 'tagPersonal', yahrzeit: 'tagPersonal', anniversary: 'tagPersonal' } as Record<string, string>)[colorPickerNote?.noteType ?? 'note']) === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => {
                          if (!colorPickerNote) return;
                          void saveNote({
                            id: colorPickerNote.id,
                            created: colorPickerNote.created,
                            summary: colorPickerNote.summary,
                            noteType: colorPickerNote.noteType,
                            calendarType: colorPickerNote.calendarType,
                            date: colorPickerNote.gregorianDateStr
                              ? new Date(colorPickerNote.gregorianDateStr)
                              : date,
                            hebrewDate,
                            reminderMinutes: colorPickerNote.reminderMinutes,
                            colorId: key,
                          });
                          setColorPickerNote(null);
                        }}
                        style={[s.colorModalCircle, { backgroundColor: hexColor }]}
                      >
                        {isSelected && <Text style={s.colorModalCheck}>✓</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <NoteEditor
        visible={editorVisible}
        note={editingNote}
        date={date}
        hebrewDate={hebrewDate}
        colors={colors}
        onSave={saveNote}
        onDelete={deleteNote}
        onClose={() => setEditorVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontWeight: '600' },
  empty: { fontSize: 13, textAlign: 'right', paddingVertical: 8 },
  noteRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8,
  },
  noteIcon: { fontSize: 20 },
  noteBody: { flex: 1 },
  noteSummary: { fontSize: 14, fontWeight: '500', textAlign: 'right' },
  noteTag: { fontSize: 11, textAlign: 'right', marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 14 },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  colorModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  colorModalSheet: { borderRadius: 16, padding: 20, elevation: 8 },
  colorModalCircles: { flexDirection: 'row-reverse', gap: 12 },
  colorModalCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorModalCheck: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
