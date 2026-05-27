// src/hooks/useDatePicker.tsx
// Phase 4.4 — Platform-aware date picker hook.
//
// iOS:     spinner DateTimePicker wrapped in a bottom-sheet Modal.
//          Temp date accumulates as user spins; committing only on "אישור".
//          Pressing the backdrop or "ביטול" dismisses without change.
//
// Android: native calendar dialog mounted on-demand (mounts → dialog appears;
//          after selection or dismiss the component unmounts so the dialog
//          doesn't re-open on the next render cycle).

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

interface UseDatePickerResult {
  /** Call to open the date picker (iOS: modal; Android: native dialog). */
  openPicker: () => void;
  /** Render this somewhere in the screen tree (outside ScrollView). */
  picker: React.ReactNode;
}

export function useDatePicker(
  value: Date,
  onChange: (date: Date) => void,
): UseDatePickerResult {
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
              mode="date"
              display="spinner"
              onChange={handleChange}
              locale="he"
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
        mode="date"
        display="default"
        onChange={handleChange}
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
