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
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { BookIcon } from '../src/components/icons/FigmaIcons';
import { hebrewFullDate } from '../src/utils/hebrewLabels';
import { SectionLabel } from '../src/components/ui/SectionLabel';
import {
  dateService,
  type DayData,
  type LearningItem,
} from '../src/services/DateService';
import { radius } from '../src/constants/radius';
import { typography, withFontFamily } from '../src/constants/typography';
import { useDatePicker } from '../src/hooks/useDatePicker';
import { swipeDirection } from '../src/constants/layout';
import type { ThemeColors } from '../src/hooks/useThemeColors';

/** `#RRGGBB` + alpha byte. Figma fills the Details badges with the item's
 *  colour at 12 % opacity (not the tag-bg token). */
function withAlpha(hex: string, alpha: number): string {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface LearningSectionData {
  title: string;
  /** Per item: Figma colours each badge by item, not by section. */
  items: { label: string; item: LearningItem | undefined; color: string }[];
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function DetailsScreen() {
  const colors = useThemeColors();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const setSelectedDate = useCalendarStore((s) => s.setSelectedDate);

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
  // Figma labels and colours: Talmud blue, Rambam green, Nach orange,
  // Chofetz Chaim red, Tehillim purple.
  const sections: LearningSectionData[] = [
    {
      title: 'תלמוד',
      items: [
        { label: 'דף יומי',    item: dayData.dafYomi,    color: colors.tagEvent },
        { label: 'משנה יומית', item: dayData.mishnaYomi, color: colors.tagEvent },
      ],
    },
    {
      title: 'הלכה',
      items: [
        { label: 'רמב״ם — פרק אחד', item: dayData.rambamOneChapter, color: colors.tagHoliday },
      ],
    },
    {
      title: 'תנ״ך ומוסר',
      items: [
        { label: 'נ״ך יומי',   item: dayData.nachYomi,     color: colors.tagSpecial },
        { label: 'תנ״ך יומי', item: dayData.tanakhYomi,   color: colors.tagSpecial },
        { label: 'חפץ חיים',  item: dayData.chofetzChaim, color: colors.tagPersonal },
        { label: 'תהילים',    item: dayData.psalms,       color: colors.tagShabbat },
      ],
    },
  ];

  const visibleSections = sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => i.item !== undefined),
    }))
    .filter((s) => s.items.length > 0);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScreenHeader
          leading="back"
          title="לימוד יומי"
          subtitle={hebrewFullDate(selectedDate)}
          subtitleSize="caption"
          onTitlePress={openPicker}
          titleAccessibilityLabel="לימוד יומי, בחר תאריך"
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleSections.length === 0 ? (
            <Text style={[styles.emptyState, { color: colors.textTertiary }]}>
              אין פריטי לימוד לתאריך זה
            </Text>
          ) : (
            <>
              {visibleSections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <SectionLabel title={section.title} colors={colors} inset={0} gapAbove={0} gapBelow={0} />
                  {section.items.map(({ label, item, color }) => (
                    <LearningCard
                      key={label}
                      label={label}
                      item={item as LearningItem}
                      color={color}
                      colors={colors}
                    />
                  ))}
                </View>
              ))}
              <Text style={[styles.footerNote, { color: colors.textTertiary }]}>
                לחיצה על פריט פותחת אותו בספריא
              </Text>
            </>
          )}
        </ScrollView>

        {/* Date picker — Phase 4.4; rendered outside ScrollView */}
        {picker}
      </View>
    </GestureDetector>
  );
}

// ─── LearningCard ──────────────────────────────────────────────────────────────
// Figma: one card per item — badge (38, r10, item colour at 12 %) on the
// right, label + value in the middle, "‹" on the left. The whole card opens
// the item in Sefaria.

function LearningCard({
  label,
  item,
  color,
  colors,
}: {
  label: string;
  item: LearningItem;
  color: string;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={() => Linking.openURL(item.url)}
      android_ripple={{ color: colors.border }}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${item.display}, פתח בספריא`}
    >
      <View style={[styles.badge, { backgroundColor: withAlpha(color, 0.12) }]}>
        <BookIcon size={20} color={color} />
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.rowLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.rowValue, { color: colors.textPrimary }]}>{item.display}</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textTertiary }]}>‹</Text>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1 },
  // Figma: content padding 14 / 16, everything 10 apart.
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 10 },

  emptyState: {
    ...withFontFamily(typography.caption, '400'),
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },

  section: { gap: 10 },

  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: radius.item,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    ...withFontFamily(typography.caption),
    textAlign: 'right',
  },
  rowValue: {
    ...withFontFamily(typography.emphasis, '700'),
    textAlign: 'right',
  },
  chevron: {
    ...withFontFamily(typography.glyphSmall),
    width: 18,
    textAlign: 'center',
  },
  footerNote: {
    ...withFontFamily(typography.caption, '400'),
    textAlign: 'right',
  },
});
