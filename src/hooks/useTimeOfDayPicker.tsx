// src/hooks/useTimeOfDayPicker.tsx
// C2 — Platform-aware event-time picker hook for timed calendar events.
//
// DISTINCT from src/hooks/useTimePicker.tsx which is used exclusively by the
// Omer reminder in settings.tsx (string "HH:mm" I/O, always 24h).
// This hook works with Date objects (not strings) and respects the is24Hour
// argument so it can show 12/24h depending on the user's display preference.
//
// iOS:     spinner DateTimePicker wrapped in a bottom-sheet Modal.
//          Temp date accumulates as user spins; committing only on "אישור".
//          Pressing the backdrop or "ביטול" dismisses without change.
//          locale="he" → 24h display; locale="en-US" → 12h display.
//
// Android: native time dialog mounted on-demand (mounts → dialog appears;
//          after selection or dismiss the component unmounts so the dialog
//          doesn't re-open on the next render cycle). is24Hour forwarded.

import React, { useState, useCallback } from 'react';
import {
  Platform,
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useThemeColors } from './useThemeColors';
import { radius } from '../constants/radius';
import { overlay } from '../constants/overlay';
import { typography, withFontFamily } from '../constants/typography';

interface UseTimeOfDayPickerResult {
  /** Call to open the time picker (iOS: modal; Android: native dialog). */
  openPicker: () => void;
  /** Render this somewhere in the screen tree (outside ScrollView). */
  picker: React.ReactNode;
}

export function useTimeOfDayPicker(
  value: Date,
  onChange: (date: Date) => void,
  is24Hour: boolean = true,
): UseTimeOfDayPickerResult {
  const colors = useThemeColors();
  const [visible, setVisible] = useState(false);
  // iOS only: accumulate spinner changes here; commit to onChange only on "אישור"
  const [tempDate, setTempDate] = useState<Date>(value);

  const openPicker = useCallback(() => {
    setTempDate(value); // reset temp to current value before showing
    setVisible(true);
  }, [value]);

  const handleChange = useCallback(
    (_event: DateTimePickerEvent, selected?: Date) => {
      if (Platform.OS === 'android') {
        // Android: dialog is self-closing; hide component + commit immediately
        setVisible(false);
        if (selected) onChange(selected);
      } else {
        // iOS: keep modal open, just update temp
        if (selected) setTempDate(selected);
      }
    },
    [onChange],
  );

  // iOS locale: 'he' forces 24h; 'en-US' gives 12h AM/PM spinner.
  const iosLocale = is24Hour ? 'he' : 'en-US';

  let picker: React.ReactNode = null;

  if (Platform.OS === 'ios') {
    picker = (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        {/* Full-screen backdrop — tap to dismiss */}
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          {/* Inner sheet — tap does NOT propagate to backdrop */}
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderColor:     colors.border,
              },
            ]}
          >
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="spinner"
              onChange={handleChange}
              locale={iosLocale}
            />
            <View style={styles.buttons}>
              <Pressable
                onPress={() => {
                  onChange(tempDate);
                  setVisible(false);
                }}
                style={[styles.btn, { backgroundColor: colors.accent }]}
                accessibilityLabel="אישור"
              >
                <Text style={[styles.btnText, { color: colors.textInverse }]}>
                  אישור
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setVisible(false)}
                style={[styles.btn, { backgroundColor: colors.surfaceElevated }]}
                accessibilityLabel="ביטול"
              >
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>
                  ביטול
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  } else if (visible) {
    // Android: mount only while visible; dialog appears on mount, unmounts on close
    picker = (
      <DateTimePicker
        value={value}
        mode="time"
        display="default"
        is24Hour={is24Hour}
        onChange={handleChange}
      />
    );
  }

  return { openPicker, picker };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: overlay.modal,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop:    12,
    paddingBottom: 32,
  },
  // row-reverse: אישור (confirm) renders on the right, ביטול (cancel) on the left
  buttons: {
    flexDirection: 'row-reverse',
    gap:           12,
    paddingHorizontal: 20,
    paddingTop:    8,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { ...withFontFamily(typography.bodyMedium), fontWeight: '600' },
});
