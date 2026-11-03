// src/components/converter/OptionSheet.tsx
// Bottom-sheet list picker for the date converter's day and month fields
// (Figma D5). A plain Modal: onRequestClose covers the Android back button.

import React, { useRef } from 'react';
import type { ComponentRef } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { overlay } from '../../constants/overlay';
import { typography, withFontFamily } from '../../constants/typography';
import type { ThemeColors } from '../../hooks/useThemeColors';

export interface SheetOption {
  value: number;
  label: string;
}

interface OptionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: SheetOption[];
  selected: number;
  onSelect: (value: number) => void;
  onClose: () => void;
  colors: ThemeColors;
}

const ROW_HEIGHT = 48;

export function OptionSheet({
  visible, title, subtitle, options, selected, onSelect, onClose, colors,
}: OptionSheetProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const selectedIndex = options.findIndex((o) => o.value === selected);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Inner Pressable swallows taps so they don't reach the backdrop */}
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: 28 + insets.bottom }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            {!!subtitle && (
              <Text style={[styles.subtitle, { color: colors.textTertiary }]}>{subtitle}</Text>
            )}
          </View>
          <ScrollView
            ref={scrollRef}
            onLayout={(e) => {
              // Bring the current value into view (day list is up to 31 rows).
              const viewport = e.nativeEvent.layout.height;
              const y = selectedIndex * ROW_HEIGHT - (viewport - ROW_HEIGHT) / 2;
              if (y > 0) scrollRef.current?.scrollTo({ y, animated: false });
            }}
          >
            {options.map((o) => {
              const on = o.value === selected;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => onSelect(o.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.row, on && { backgroundColor: colors.selectedBg }]}
                >
                  {/* row-reverse: label on the right, check mark on the left */}
                  <Text
                    style={[
                      styles.rowText,
                      on ? [styles.rowTextOn, { color: colors.accent }] : { color: colors.textPrimary },
                    ]}
                  >
                    {o.label}
                  </Text>
                  <View style={styles.check}>
                    {on && <Check size={20} color={colors.accent} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: overlay.modal,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  titleBlock: {
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 20,
    gap: 2,
  },
  title: {
    // Figma: 18 Bold / 26.
    ...withFontFamily(typography.sheetTitle),
    lineHeight: 26,
    textAlign: 'right',
  },
  subtitle: {
    // Figma: 12 Regular / 17.
    ...withFontFamily(typography.subtitle, '400'),
    lineHeight: 17,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    height: ROW_HEIGHT,
    paddingHorizontal: 20,
  },
  rowText: {
    // Figma: 16 Regular / 24 (selected: SemiBold, accent).
    ...withFontFamily(typography.emphasis, '400'),
    lineHeight: 24,
    flex: 1,
    textAlign: 'right',
  },
  rowTextOn: { ...withFontFamily(typography.emphasis, '600'), lineHeight: 24 },
  check: { width: 20, height: 20 },
});
