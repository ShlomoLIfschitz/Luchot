// src/components/notes/NoteList.tsx

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Cake, Flame, Gem, FileText, type LucideIcon } from 'lucide-react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useSettingsStore } from '../../providers/SettingsProvider';
import { useNotes, type CalendarNote, type NoteType } from '../../hooks/useNotes';
import { NoteEditor } from './NoteEditor';
import type { HebrewDateInfo } from '../../services/DateService';
import { splitInstanceId } from '../../utils/recurringId';
import { radius } from '../../constants/radius';
import { typography, withFontFamily } from '../../constants/typography';

// C3: Quick color picker Modal removed as dead code — no opener existed since the dot was removed.

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

type ColorTokenKey = 'tagEvent' | 'tagPersonal' | 'tagHoliday' | 'tagTorah' | 'tagWork';

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
  const { notes, saveNote, deleteNote, deleteOccurrence, saveOccurrenceException } = useNotes(date);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<CalendarNote | undefined>(undefined);

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

  // C3 Task 3: Recurring-aware delete at the inline ✕ button.
  // Recurring instances show a two-option dialog; non-recurring show the existing single confirm.
  const confirmDelete = (note: CalendarNote) => {
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
            onPress: () => void deleteOccurrence(masterId, occurrenceDate),
          },
          {
            text: 'לכל התאריכים',
            style: 'destructive',
            onPress: () => void deleteNote(masterId),
          },
        ]
      );
    } else {
      // Non-recurring — single confirm (original behavior).
      Alert.alert(
        'מחק הערה',
        `למחוק "${note.summary}"?`,
        [
          { text: 'ביטול', style: 'cancel' },
          { text: 'מחק', style: 'destructive', onPress: () => void deleteNote(note.id) },
        ]
      );
    }
  };

  return (
    <View style={s.container}>
      {/* Section header — row-reverse, natural order: title (right), addButton (left) */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.textTertiary }]}>הערות</Text>
        {!hideAddButton && (
          <Pressable onPress={openAdd} style={[s.addBtn, { backgroundColor: colors.accentLight }]}>
            <Text style={[s.addBtnText, { color: colors.accent }]}>+ הוסף הערה</Text>
          </Pressable>
        )}
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
            // row-reverse, JSX order [colorDot, title(flex:1,right), time, deleteButton]
            // so colorDot is rightmost and deleteButton is the last (leftmost) child.
            <Pressable
              key={note.id}
              onPress={() => openEdit(note)}
              accessibilityRole="button"
              accessibilityLabel={`ערוך הערה: ${note.summary}`}
              style={[s.noteRow, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            >
              <View style={[s.colorDot, { backgroundColor: resolveHexColor(note) }]} />
              <View style={s.noteBody}>
                <View style={s.titleRow}>
                  {(() => { const Icon = TYPE_ICON[note.noteType]; return <Icon size={16} color={colors.textSecondary} />; })()}
                  <Text style={[s.noteSummary, { color: colors.textPrimary }]}>{note.summary}</Text>
                </View>
                {note.recurring && (
                  <Text style={[s.noteTag, { color: colors.textTertiary }]}>
                    {note.calendarType === 'hebrew' ? '↺ עברי' : '↺ לועזי'}
                  </Text>
                )}
              </View>
              {/* Time label — only shown for timed notes. */}
              {timedStart !== null && (
                <Text style={[s.timeLabel, { color: colors.textTertiary }]}>
                  {formatHM(timedStart, use24hTime)}
                </Text>
              )}
              {/* deleteButton — JSX-last = leftmost in row-reverse. */}
              <Pressable
                onPress={() => confirmDelete(note)}
                hitSlop={6}
                style={s.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel={`מחק הערה: ${note.summary}`}
              >
                <Text style={[s.deleteIcon, { color: colors.textTertiary }]}>✕</Text>
              </Pressable>
            </Pressable>
          );
        })
      )}

      <NoteEditor
        visible={editorVisible}
        note={editingNote}
        date={date}
        hebrewDate={hebrewDate}
        colors={colors}
        onSave={saveNote}
        onDelete={deleteNote}
        onDeleteOccurrence={deleteOccurrence}
        onSaveOccurrenceException={saveOccurrenceException}
        onClose={() => setEditorVisible(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 16 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { ...withFontFamily(typography.captionBold), textTransform: 'uppercase' },
  addBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
  addBtnText: { ...withFontFamily(typography.bodySmall) },
  empty: { textAlign: 'right', paddingVertical: 8, ...withFontFamily(typography.bodySmall) },
  noteRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  noteBody: { flex: 1 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  noteSummary: { textAlign: 'right', ...withFontFamily(typography.bodyMedium) },
  noteTag: { textAlign: 'right', marginTop: 2, ...withFontFamily(typography.caption) },
  // Visual glyph stays small; the Pressable is padded + hitSlop-extended to reach 48dp.
  deleteBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  // Nearest token: typography.bodySmall (13/400/18) — fontWeight (default
  // 400) exact match; fontSize delta 14→13 (1px). Matches NoteEditor's
  // analogous "✕" clear glyph for consistency.
  deleteIcon: { ...withFontFamily(typography.bodySmall) },
  // Time label for timed notes — sits between the title cell and the deleteButton.
  timeLabel: {
    flexShrink: 0,
    ...withFontFamily(typography.caption),
  },
});
