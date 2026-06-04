// app/details.tsx
// Phase 3.7b-2 — Details screen. Displays all daily learning items in
// themed sections, with direct Sefaria links. Accessible from the
// hamburger drawer.

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import {
  BookOpen,
  BookMarked,
  BookText,
  Sparkles,
  ExternalLink,
} from 'lucide-react-native';
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { useSettingsStore } from '../src/providers/SettingsProvider';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import {
  dateService,
  toHebrewNumeral,
  toHebrewYear,
  type DayData,
  type LearningItem,
} from '../src/services/DateService';
import { radius } from '../src/constants/radius';
import { useDatePicker } from '../src/hooks/useDatePicker';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LearningSectionData {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>;
  items: { label: string; item: LearningItem | undefined }[];
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function DetailsScreen() {
  const colors = useThemeColors();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);
  const hebrewOnTop = useSettingsStore((s) => s.hebrewOnTop);

  const dayData = useMemo<DayData>(
    () => dateService.getDayData(selectedDate),
    [selectedDate],
  );

  // Date picker — Phase 4.4
  const { openPicker, picker } = useDatePicker(selectedDate, setSelectedDate);

  // Swipe navigation between days — consistent with Day and Zmanim screens.
  const navigateDay = useCallback(
    (direction: 1 | -1) => {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + direction);
      setSelectedDate(next);
    },
    [selectedDate, setSelectedDate],
  );

  const swipeGesture = Gesture.Pan().onEnd((e) => {
    if (Math.abs(e.velocityX) > 400) {
      runOnJS(navigateDay)(e.velocityX < 0 ? 1 : -1);
    }
  });

  // Header date formatting
  const hebrewFormatted = `${toHebrewNumeral(dayData.hebrewDate.day)} ${dayData.hebrewDate.monthName} ${toHebrewYear(dayData.hebrewDate.year)}`;
  const gregFormatted = selectedDate.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Themed sections — each section gets pruned of undefined items below.
  const sections: LearningSectionData[] = [
    {
      title: 'תלמוד',
      Icon: BookOpen,
      items: [
        { label: 'דף יומי',   item: dayData.dafYomi },
        { label: 'משנה יומי', item: dayData.mishnaYomi },
      ],
    },
    {
      title: 'רמב״ם',
      Icon: BookMarked,
      items: [
        { label: 'רמב״ם יומי (פרק אחד)', item: dayData.rambamOneChapter },
      ],
    },
    {
      title: 'תנ״ך',
      Icon: BookText,
      items: [
        { label: 'נ״ך יומי',   item: dayData.nachYomi },
        { label: 'תנ״ך יומי', item: dayData.tanakhYomi },
      ],
    },
    {
      title: 'מוסר ותהילים',
      Icon: Sparkles,
      items: [
        { label: 'חפץ חיים', item: dayData.chofetzChaim },
        { label: 'תהילים',   item: dayData.psalms },
      ],
    },
  ];

  // Prune undefined items, then prune empty sections.
  const visibleSections = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => i.item !== undefined),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader date={selectedDate} onDatePress={openPicker} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — date */}
          <View style={styles.header}>
            <Text style={[styles.hebrewDate, { color: colors.textPrimary }]}>
              {hebrewOnTop ? hebrewFormatted : gregFormatted}
            </Text>
            <Text style={[styles.gregDate, { color: colors.textSecondary }]}>
              {hebrewOnTop ? gregFormatted : hebrewFormatted}
            </Text>
          </View>

          {visibleSections.length === 0 ? (
            <Text style={[styles.emptyState, { color: colors.textTertiary }]}>
              אין פריטי לימוד לתאריך זה
            </Text>
          ) : (
            visibleSections.map((section) => (
              <LearningSection
                key={section.title}
                title={section.title}
                Icon={section.Icon}
                items={section.items as { label: string; item: LearningItem }[]}
                colors={colors}
              />
            ))
          )}
        </ScrollView>

        {/* Date picker — Phase 4.4; rendered outside ScrollView */}
        {picker}
      </View>
    </GestureDetector>
  );
}

// ─── LearningSection ───────────────────────────────────────────────────────────

function LearningSection({
  title,
  Icon,
  items,
  colors,
}: {
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Icon: React.ComponentType<any>;
  items: { label: string; item: LearningItem }[];
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Icon size={18} color={colors.accent} />
      </View>

      <View style={[styles.card, { borderColor: colors.border }]}>
        {items.map(({ label, item }, idx) => (
          <LearningRow
            key={label}
            label={label}
            item={item}
            colors={colors}
            isLast={idx === items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// ─── LearningRow ───────────────────────────────────────────────────────────────

function LearningRow({
  label,
  item,
  colors,
  isLast,
}: {
  label: string;
  item: LearningItem;
  colors: ReturnType<typeof useThemeColors>;
  isLast: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>
          {label}
        </Text>
        <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
          {item.display}
        </Text>
      </View>
      <Pressable
        onPress={() => Linking.openURL(item.url)}
        style={[styles.linkBtn, { backgroundColor: colors.accentLight }]}
        accessibilityLabel={`פתח ב-ספריא: ${item.display}`}
      >
        <ExternalLink size={14} color={colors.accent} />
        <Text style={[styles.linkText, { color: colors.accent }]}>ספריא</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },

  header:      { alignItems: 'center', marginBottom: 20 },
  hebrewDate:  { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  gregDate:    { fontSize: 13, marginTop: 4 },

  emptyState: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },

  section:       { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'right',
  },

  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },

  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 60,
  },
  rowContent: {
    flex: 1,
    flexShrink: 1,  // yields space to button rather than compressing text
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
    textAlign: 'right',  // Hebrew label anchors to right edge
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',  // Hebrew value anchors to right edge
  },

  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,  // reduced: button stays compact
    paddingVertical: 6,
    borderRadius: radius.md,
    flexShrink: 0,  // button keeps its natural size; text area yields instead
  },
  linkText: { fontSize: 12, fontWeight: '600' },
});
