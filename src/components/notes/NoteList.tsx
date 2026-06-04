// src/components/notes/NoteList.tsx

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { Cake, Flame, Gem, FileText, type LucideIcon } from 'lucide-react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { useNotes, type CalendarNote, type NoteType } from '../../hooks/useNotes';
import { NoteEditor } from './NoteEditor';
import type { HebrewDateInfo } from '../../services/DateService';
import { COLOR_OPTIONS, type ColorTokenKey } from '../../utils/colorResolver';
import { overlay } from '../../constants/overlay';

const TYPE_ICON: Record<NoteType, LucideIcon> = {
  note:        FileText,
  birthday:    Cake,
  yahrzeit:    Flame,
  anniversary: Gem,
};

/** Format HH:MM (or h:MM AM/PM) from a Date, honoring the user's 24h preference. */
function formatHM(date: Date, use24h: boolean): string {
  return date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24h,
  });
}

interface Props {
  date: Date;
  hebrewDate: HebrewDateInfo;
  hideAddButton?: boolean;
  /**
   * When true, renders ONLY notes where isAllDay === true.
   * Use in day.tsx events tab so timed events don't double-show alongside
   * the hourly grid. Default false = show all (preserves other callers).
   */
  onlyAllDay?: boolean;
}

export function NoteList({ date, hebrewDate, hideAddButton, onlyAllDay = false }: Props) {
  const colors = useThemeColors();
  const use24hTime = useSettingsStore((s) => s.use24hTime);
  const { notes, saveNote, deleteNote } = useNotes(date);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<CalendarNote | undefined>(undefined);
  const [colorPickerNote, setColorPickerNote] = useState<CalendarNote | null>(null);

  // Apply onlyAllDay filter
  const visibleNotes = onlyAllDay ? notes.filter((n) => n.isAllDay) : notes;

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

      {visibleNotes.length === 0 ? (
        <Text style={[s.empty, { color: colors.textTertiary }]}>אין הערות ליום זה</Text>
      ) : (
        visibleNotes.map((note) => {
          // Parse timed event start for time label
          const timedStart =
            !note.isAllDay && note.startDateTime
              ? (() => {
                  const d = new Date(note.startDateTime);
                  return isNaN(d.getTime()) ? null : d;
                })()
              : null;

          return (
            <View key={note.id} style={s.noteRowWrapper}>
              {/* bar — JSX-first = renders on RIGHT, outside the capsule */}
              <View style={[s.colorBar, { backgroundColor: resolveHexColor(note) }]} />
              {/* capsule — JSX-second = renders on LEFT */}
              <Pressable
                onPress={() => openEdit(note)}
                style={[s.noteRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                {(() => { const Icon = TYPE_ICON[note.noteType]; return <Icon size={20} color={colors.textSecondary} />; })()}
                <View style={s.noteBody}>
                  <Text style={[s.noteSummary, { color: colors.textPrimary }]}>{note.summary}</Text>
                  {note.recurring && (
                    <Text style={[s.noteTag, { color: colors.textTertiary }]}>
                      {note.calendarType === 'hebrew' ? '↺ עברי' : '↺ לועזי'}
                    </Text>
                  )}
                </View>
                {/* Time label — JSX-last = leftmost in row-reverse.
                    Only shown for timed notes. Sits to the left of the summary. */}
                {timedStart !== null && (
                  <Text style={[s.timeLabel, { color: colors.textTertiary }]}>
                    {formatHM(timedStart, use24hTime)}
                  </Text>
                )}
                <Pressable onPress={() => confirmDelete(note)} hitSlop={10} style={s.deleteBtn}>
                  <Text style={[s.deleteIcon, { color: colors.textTertiary }]}>✕</Text>
                </Pressable>
              </Pressable>
            </View>
          );
        })
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
                          // Thread all time + location fields to avoid data loss on
                          // color-only change (C2 fix: previously these were omitted,
                          // so a color pick would wipe startDateTime / endDateTime /
                          // location on a timed event).
                          const parsedStart =
                            !colorPickerNote.isAllDay && colorPickerNote.startDateTime
                              ? (() => {
                                  const d = new Date(colorPickerNote.startDateTime);
                                  return isNaN(d.getTime()) ? null : d;
                                })()
                              : null;
                          const parsedEnd =
                            !colorPickerNote.isAllDay && colorPickerNote.endDateTime
                              ? (() => {
                                  const d = new Date(colorPickerNote.endDateTime);
                                  return isNaN(d.getTime()) ? null : d;
                                })()
                              : null;
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
                            // Preserve location (was missing before — would wipe it)
                            location: colorPickerNote.location,
                            // Preserve time fields (was missing before — would wipe them)
                            allDay: colorPickerNote.isAllDay,
                            startTime: parsedStart,
                            endTime: parsedEnd,
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
  noteRowWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    gap: 4,
    marginBottom: 8,
  },
  noteRow: {
    flex: 1,
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: StyleSheet.hairlineWidth,
  },
  noteBody: { flex: 1 },
  noteSummary: { fontSize: 14, fontWeight: '500', textAlign: 'right' },
  noteTag: { fontSize: 11, textAlign: 'right', marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteIcon: { fontSize: 14 },
  // Time label for timed notes — last JSX child → leftmost in row-reverse
  timeLabel: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 0,
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  colorModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  colorModalSheet: { borderRadius: 16, padding: 20, elevation: 8 },
  colorModalCircles: { flexDirection: 'row-reverse', gap: 12 },
  colorModalCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  colorModalCheck: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
