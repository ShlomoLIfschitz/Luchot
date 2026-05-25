// src/components/calendar/DayModal.tsx

import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, BackHandler } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { DayData, toHebrewNumeral, toHebrewYear } from '../../services/DateService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { ZmanimList } from '../zmanim/ZmanimList';
import { useZmanim } from '../../hooks/useZmanim';
import { NoteList } from '../notes/NoteList';
import type { ZmanimResult } from '../../services/ZmanimService';
import type { ThemeColors } from '../../hooks/useThemeColors';

interface DayModalProps {
  dayData: DayData | null;
  onClose: () => void;
}

export const DayModal = forwardRef<BottomSheet, DayModalProps>(({ dayData, onClose }, ref) => {
  const colors = useThemeColors();
  const zmanim = useZmanim(dayData?.gregorianDate ?? new Date());

  // Track the current snap index so we know whether the sheet is open.
  // useRef avoids re-renders on every snap change; -1 = closed.
  const snapIndex = useRef<number>(-1);

  // Wire Android hardware back button: close the sheet if it is open,
  // otherwise let the system handle it (return false).
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (snapIndex.current >= 0) {
        (ref as React.RefObject<BottomSheet>)?.current?.close();
        return true; // consumed — do not exit app
      }
      return false; // not consumed — system handles it
    });
    return () => subscription.remove(); // cleanup on unmount — no memory leak
  }, [ref]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['50%', '85%']}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={(index) => { snapIndex.current = index; }}
      onClose={onClose}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      {dayData ? (
        <ModalScrollContent
          dayData={dayData}
          colors={colors}
          zmanim={zmanim}
        />
      ) : null}
    </BottomSheet>
  );
});

function ModalScrollContent({
  dayData,
  colors,
  zmanim,
}: {
  dayData: DayData;
  colors: ThemeColors;
  zmanim: ZmanimResult;
}) {
  const { hebrewDate, holidays, parasha, omerDay, dafYomi, rambamChapter, gregorianDate } = dayData;

  const gregFormatted = gregorianDate.toLocaleDateString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const hebrewFormatted = `${toHebrewNumeral(hebrewDate.day)} ${hebrewDate.monthName} ${toHebrewYear(hebrewDate.year)}`;

  return (
    <BottomSheetScrollView contentContainerStyle={styles.content}>
      <View style={styles.dateHeader}>
        <Text style={[styles.hebrewDate, { color: colors.textPrimary }]}>{hebrewFormatted}</Text>
        <Text style={[styles.gregDate, { color: colors.textSecondary }]}>{gregFormatted}</Text>
      </View>

      {holidays.map((h, i) => (
        <View key={i} style={[styles.badge, { backgroundColor: colors.accentLight }]}>
          <Text style={[styles.badgeText, { color: colors.tagHoliday }]}>{h}</Text>
        </View>
      ))}

      {parasha && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>פרשת השבוע</Text>
          <Text style={[styles.sectionValue, { color: colors.textPrimary }]}>{parasha}</Text>
        </View>
      )}

      {omerDay && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ספירת העומר</Text>
          <Text style={[styles.sectionValue, { color: colors.textPrimary }]}>
            יום {toHebrewNumeral(omerDay)} לעומר
          </Text>
        </View>
      )}

      {dafYomi && (
        <View style={styles.sectionRow}>
          <View style={styles.sectionFlex}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>דף יומי</Text>
            <Text style={[styles.sectionValue, { color: colors.textPrimary }]}>{dafYomi}</Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL('https://www.sefaria.org.il')}
            style={[styles.linkButton, { backgroundColor: colors.accentLight }]}
          >
            <Text style={[styles.linkText, { color: colors.accent }]}>→ ספריא</Text>
          </Pressable>
        </View>
      )}

      {rambamChapter && (
        <View style={styles.sectionRow}>
          <View style={styles.sectionFlex}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>רמב״ם יומי</Text>
            <Text style={[styles.sectionValue, { color: colors.textPrimary }]}>{rambamChapter}</Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL('https://www.sefaria.org.il/Mishneh_Torah')}
            style={[styles.linkButton, { backgroundColor: colors.accentLight }]}
          >
            <Text style={[styles.linkText, { color: colors.accent }]}>→ ספריא</Text>
          </Pressable>
        </View>
      )}

      <ZmanimList zmanim={zmanim} />

      <NoteList date={gregorianDate} hebrewDate={hebrewDate} />
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  dateHeader: { paddingVertical: 16, alignItems: 'center' },
  hebrewDate: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  gregDate: { fontSize: 13, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  badgeText: { fontSize: 13, fontWeight: '600' },
  section: { marginVertical: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  sectionFlex: { flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  sectionValue: { fontSize: 16, fontWeight: '500' },
  linkButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  linkText: { fontSize: 13, fontWeight: '600' },
});
