// src/hooks/useTimePicker.tsx
// Phase 5 — Platform-aware time picker hook, modelled on useDatePicker.tsx.
//
// iOS:     spinner DateTimePicker wrapped in a bottom-sheet Modal.
//          locale="en-GB" forces 24-hour display on iOS.
//          Temp time accumulates as user spins; committing only on "אישור".
//          Pressing the backdrop or "ביטול" dismisses without change.
//
// Android: native time dialog mounted on-demand (mounts → dialog appears;
//          after selection or dismiss the component unmounts so the dialog
//          doesn't re-open on the next render cycle). is24Hour={true}.

import React, { useState, useCallback } from 'react';
import {
  Platform,
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeColors } from './useThemeColors';
import { radius } from '../constants/radius';

interface UseTimePickerResult {
  /** Call to open the time picker (iOS: modal; Android: native dialog). */
  openPicker: () => void;
  /** Render this somewhere in the screen tree (outside ScrollView). */
  picker: React.ReactNode;
}

export function useTimePicker(
  value: string,
  onChange: (time: string) => void,
): UseTimePickerResult {
  const colors = useThemeColors();

  // Parse "HH:mm" → Date for the picker widget
  function timeStrToDate(t: string): Date {
    const [h, m] = t.split(':').map(Number);
    return new Date(1970, 0, 1, h, m, 0, 0);
  }
  // Format Date → "HH:mm"
  function dateToTimeStr(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const [visible, setVisible] = useState(false);
  // iOS only: accumulate spinner changes here; commit to onChange only on "אישור"
  const [tempDate, setTempDate] = useState<Date>(() => timeStrToDate(value));

  const openPicker = useCallback(() => {
    setTempDate(timeStrToDate(value)); // reset temp to current value before showing
    setVisible(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
              onChange={(_ev, sel) => { if (sel) setTempDate(sel); }}
              locale="en-GB"
            />
            <View style={styles.buttons}>
              <Pressable
                onPress={() => setVisible(false)}
                style={[styles.btn, { backgroundColor: colors.surfaceElevated }]}
                accessibilityLabel="ביטול"
              >
                <Text style={[styles.btnText, { color: colors.textSecondary }]}>
                  ביטול
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChange(dateToTimeStr(tempDate));
                  setVisible(false);
                }}
                style={[styles.btn, { backgroundColor: colors.accent }]}
                accessibilityLabel="אישור"
              >
                <Text style={[styles.btnText, { color: colors.textInverse }]}>
                  אישור
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
        value={timeStrToDate(value)}
        mode="time"
        display="default"
        is24Hour={true}
        onChange={(_ev, sel) => {
          setVisible(false);
          if (sel) onChange(dateToTimeStr(sel));
        }}
      />
    );
  }

  return { openPicker, picker };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop:    12,
    paddingBottom: 32,
  },
  buttons: {
    flexDirection: 'row',
    gap:           12,
    paddingHorizontal: 20,
    paddingTop:    8,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '600' },
});
