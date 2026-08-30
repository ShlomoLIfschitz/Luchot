// src/components/calendar/QuickActionSheet.tsx
// Long-press quick action sheet — three options per SCREENS.md.
// Uses @gorhom/bottom-sheet for visual consistency with the rest of the app.
//
// Redesign (Task 3) — @gorhom/bottom-sheet v4 does NOT close on the Android
// hardware back button by itself, and no BackHandler was wired anywhere in
// this repo. Wired here: while the sheet is open, back closes it and
// consumes the event instead of letting it fall through to screen navigation.

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { Pencil, Gift, FileText } from 'lucide-react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { radius } from '../../constants/radius';
import { overlay } from '../../constants/overlay';
import { typography, withFontFamily } from '../../constants/typography';

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

    // Tracks open/closed purely to gate the BackHandler subscription — kept
    // in local state (not derived from `date`, which stays populated after
    // close so action handlers can still read it) via BottomSheet's own
    // index callback.
    const [isOpen, setIsOpen] = useState(false);
    const isOpenRef = useRef(isOpen);
    isOpenRef.current = isOpen;

    useEffect(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!isOpenRef.current) return false; // let navigation handle it
        onClose();
        return true; // consumed — do not navigate away
      });
      return () => sub.remove();
    }, [onClose]);

    const handleSheetChange = useCallback((index: number) => {
      setIsOpen(index >= 0);
    }, []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={overlay.modalOpacity}
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
        onChange={handleSheetChange}
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
              accessibilityRole="button"
              accessibilityLabel={label}
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
    minHeight: 48,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    gap: 16,
  },
  actionLabel: {
    ...withFontFamily(typography.bodyLarge),
    flex: 1,
    textAlign: 'right',
  },
});
