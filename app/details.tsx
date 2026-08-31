// app/details.tsx
// Phase 3.7b-2 — Details screen. Displays all daily learning items in
// themed sections, with direct Sefaria links. Accessible from the
// hamburger drawer.
//
// Redesign (Wave — card restructure): each learning item is now a card row
// [categoryBadge, textBlock(flex:1), Sefaria link button] — badge at the
// reading start (right), link button at the far left. Sections regrouped
// to תלמוד / הלכה / תנ״ך ומוסר, styled with the shared SectionLabel/Card
// components (same visual language as settings.tsx / locationPicker.tsx).
// Sefaria linking behavior and the underlying learning data are unchanged.

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
import { Card } from '../src/components/ui/Card';
import { SectionLabel } from '../src/components/ui/SectionLabel';
import {
  dateService,
  toHebrewNumeral,
  toHebrewYear,
  type DayData,
  type LearningItem,
} from '../src/services/DateService';
import { radius } from '../src/constants/radius';
import { typography, withFontFamily } from '../src/constants/typography';
import { useDatePicker } from '../src/hooks/useDatePicker';
import { swipeDirection } from '../src/constants/layout';
import type { ThemeColors } from '../src/hooks/useThemeColors';

// ─── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

interface LearningSectionData {
  title: string;
  color: string;
  bg: string;
  items: { label: string; item: LearningItem | undefined; Icon: IconComponent }[];
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

  const onSwipe = useCallback((vx: number) => navigateDay(swipeDirection(vx)), [navigateDay]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .onEnd((e) => {
      if (Math.abs(e.velocityX) > 400) runOnJS(onSwipe)(e.velocityX);
    });

  // Header date formatting
  const hebrewFormatted = `${toHebrewNumeral(dayData.hebrewDate.day)} ${dayData.hebrewDate.monthName} ${toHebrewYear(dayData.hebrewDate.year)}`;
  const gregFormatted = selectedDate.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Themed sections — regrouped to תלמוד / הלכה / תנ״ך ומוסר. Each section
  // carries a category tint (color/bg) applied to every item badge in it;
  // individual items may still use distinct glyphs. Undefined items are
  // pruned below, then empty sections are pruned.
  const sections: LearningSectionData[] = [
    {
      title: 'תלמוד',
      color: colors.tagEvent,
      bg: colors.tagEventBg,
      items: [
        { label: 'דף יומי',   item: dayData.dafYomi,   Icon: BookOpen },
        { label: 'משנה יומי', item: dayData.mishnaYomi, Icon: BookOpen },
      ],
    },
    {
      title: 'הלכה',
      color: colors.tagSpecial,
      bg: colors.tagSpecialBg,
      items: [
        { label: 'רמב״ם יומי (פרק אחד)', item: dayData.rambamOneChapter, Icon: BookMarked },
      ],
    },
    {
      title: 'תנ״ך ומוסר',
      color: colors.tagShabbat,
      bg: colors.tagShabbatBg,
      items: [
        { label: 'נ״ך יומי',   item: dayData.nachYomi,      Icon: BookText },
        { label: 'תנ״ך יומי', item: dayData.tanakhYomi,    Icon: BookText },
        { label: 'חפץ חיים',  item: dayData.chofetzChaim,  Icon: Sparkles },
        { label: 'תהילים',    item: dayData.psalms,        Icon: Sparkles },
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
              <View key={section.title} style={styles.section}>
                <SectionLabel title={section.title} colors={colors} />
                <Card colors={colors}>
                  {section.items.map(({ label, item, Icon }) => (
                    <LearningRow
                      key={label}
                      label={label}
                      item={item as LearningItem}
                      Icon={Icon}
                      badgeColor={section.color}
                      badgeBg={section.bg}
                      colors={colors}
                    />
                  ))}
                </Card>
              </View>
            ))
          )}
        </ScrollView>

        {/* Date picker — Phase 4.4; rendered outside ScrollView */}
        {picker}
      </View>
    </GestureDetector>
  );
}

// ─── LearningRow ───────────────────────────────────────────────────────────────

function LearningRow({
  label,
  item,
  Icon,
  badgeColor,
  badgeBg,
  colors,
  isLast = false,
}: {
  label: string;
  item: LearningItem;
  Icon: IconComponent;
  badgeColor: string;
  badgeBg: string;
  colors: ThemeColors;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: badgeBg }]}>
        <Icon size={18} color={badgeColor} />
      </View>

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
        hitSlop={4}
        accessibilityRole="button"
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
  hebrewDate:  { ...withFontFamily(typography.displaySmall), letterSpacing: -0.5 },
  gregDate:    { ...withFontFamily(typography.bodySmall), marginTop: 4 },

  // Figma: footer hint = 11 Regular.
  emptyState: {
    ...withFontFamily(typography.caption, '400'),
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },

  section: { marginBottom: 12 },

  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 62,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    flexShrink: 1,  // yields space to button rather than compressing text
  },
  rowLabel: {
    ...withFontFamily(typography.caption),
    marginBottom: 2,
    textAlign: 'right',  // Hebrew label anchors to right edge
  },
  // Figma target: learning value = 16 Bold.
  rowValue: {
    ...withFontFamily(typography.emphasis, '700'),
    textAlign: 'right',  // Hebrew value anchors to right edge
  },

  linkBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,  // reduced: button stays compact
    paddingVertical: 6,
    minHeight: 32,
    borderRadius: radius.md,
    flexShrink: 0,  // button keeps its natural size; text area yields instead
  },
  linkText: { ...withFontFamily(typography.bodySmall, '600') },
});
