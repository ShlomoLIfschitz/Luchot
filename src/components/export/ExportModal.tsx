// src/components/export/ExportModal.tsx
// Modal dialog for exporting the calendar to an ICS file.
// RTL layout throughout — all rows use flexDirection: 'row-reverse'.
// Pattern follows NoteList color-picker modal: fade animation, overlay
// backdrop, TouchableWithoutFeedback to close, inner card stops propagation.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';
import { overlay } from '../../constants/overlay';
import { exportCalendar } from '../../services/IcsExportService';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ExportModal({ visible, onClose }: Props) {
  const colors = useThemeColors();

  const [includeHebcal, setIncludeHebcal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset state each time the modal opens so old choices don't linger.
  useEffect(() => {
    if (visible) {
      setIncludeHebcal(false);
      setLoading(false);
    }
  }, [visible]);

  const handleExport = async () => {
    setLoading(true);
    try {
      await exportCalendar(includeHebcal);
      onClose();
    } catch (err) {
      Alert.alert('שגיאה', err instanceof Error ? err.message : 'אירעה שגיאה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={loading ? undefined : onClose}
    >
      {/* Backdrop — tap to close when not loading */}
      <TouchableWithoutFeedback onPress={loading ? undefined : onClose}>
        <View
          style={[
            styles.overlay,
            { backgroundColor: overlay.modal },
          ]}
        >
          {/* Inner card — stops backdrop tap from propagating through */}
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              {/* Title */}
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                ייצוא יומן
              </Text>

              {/* Checkbox row — RTL: checkbox on the right, label on the left */}
              <View style={styles.checkRow}>
                <Pressable
                  onPress={() => setIncludeHebcal((v) => !v)}
                  style={[
                    styles.checkbox,
                    { borderColor: colors.accent },
                    includeHebcal && { backgroundColor: colors.accentLight },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: includeHebcal }}
                  accessibilityLabel="כלול חגים, שבתות וראשי חודשים"
                >
                  {includeHebcal && (
                    <Text style={[styles.checkmark, { color: colors.accent }]}>
                      ✓
                    </Text>
                  )}
                </Pressable>
                <Text
                  style={[styles.checkLabel, { color: colors.textPrimary }]}
                  onPress={() => setIncludeHebcal((v) => !v)}
                >
                  כלול חגים, שבתות וראשי חודשים
                </Text>
              </View>

              {/* Action area — spinner while loading, buttons otherwise */}
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.accent} size="small" />
                </View>
              ) : (
                <View style={styles.buttonRow}>
                  {/* Primary — ייצוא */}
                  <Pressable
                    onPress={() => { void handleExport(); }}
                    style={[styles.btnBase, styles.btnExport, { backgroundColor: colors.accent }]}
                    accessibilityRole="button"
                    accessibilityLabel="ייצוא"
                  >
                    <Text style={[styles.btnText, { color: colors.textInverse }]}>
                      ייצוא
                    </Text>
                  </Pressable>

                  {/* Ghost — ביטול */}
                  <Pressable
                    onPress={onClose}
                    style={[
                      styles.btnBase,
                      styles.btnCancel,
                      { borderColor: colors.border },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="ביטול"
                  >
                    <Text style={[styles.btnText, { color: colors.textSecondary }]}>
                      ביטול
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '85%',
    borderRadius: radius.xl,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 16,
  },
  // RTL row: checkbox (right child) + label (left child)
  checkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
  },
  loadingRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  // RTL row: ייצוא (right) + ביטול (left)
  buttonRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  btnBase: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnExport: {
    // background set inline
  },
  btnCancel: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
