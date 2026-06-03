// src/components/calendar/QuickActionSheet.tsx
// Long-press quick action sheet — three options per SCREENS.md.
// Uses @gorhom/bottom-sheet for visual consistency with the rest of the app.

import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Pencil, Gift, FileText } from 'lucide-react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';

export type QuickAction = 'addNote' | 'addRecurring' | 'viewDay';

interface QuickActionSheetProps {
  /** The date the user long-pressed on. Passed so action handlers in
   *  MonthGrid know which date to operate on. Not displayed in the sheet. */
  date: Date | null;
  onAction: (action: QuickAction) => void;
  onClose: () => void;
}

export const QuickActionSheet = forwardRef<BottomSheet, QuickActionSheetProps>(
  ({ date, onAction, onClose }, ref) => {
    const colors = useThemeColors();
    const snapPoints = useMemo(() => ['38%'], []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.45}
        />
      ),
      [],
    );

    const handleAction = (action: QuickAction) => {
      onAction(action);
      onClose();
    };

    const actions: { type: QuickAction; label: string; Icon: any }[] = [
      { type: 'addNote',      label: 'הוסף הערה / אירוע',       Icon: Pencil   },
      { type: 'addRecurring', label: 'הוסף יום הולדת / יארצייט', Icon: Gift     },
      { type: 'viewDay',      label: 'צפה בפרטי היום',           Icon: FileText },
    ];

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onClose={onClose}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}
      >
        <BottomSheetView style={styles.container}>
          {actions.map(({ type, label, Icon }) => (
            <Pressable
              key={type}
              onPress={() => handleAction(type)}
              style={({ pressed }) => [
                styles.actionRow,
                { backgroundColor: pressed ? colors.surfaceElevated : 'transparent' },
              ]}
            >
              <Icon size={20} color={colors.accent} />
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

QuickActionSheet.displayName = 'QuickActionSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  actionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    gap: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
});
