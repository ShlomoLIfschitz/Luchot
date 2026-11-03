// app/converter.tsx
// Date converter — Gregorian ↔ Hebrew, any year. Opened from the drawer.
// Built pixel for pixel from the approved Figma frames D1–D5 (page
// "05 · Sync & Import", section "ממיר תאריכים"); handoff:
// docs/handoffs/2026-11-03-date-converter.md.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, StyleSheet } from 'react-native';
import { Sunset, TriangleAlert } from 'lucide-react-native';
import { HDate } from '@hebcal/core';
import { useThemeColors } from '../src/hooks/useThemeColors';
import type { ThemeColors } from '../src/hooks/useThemeColors';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { PickerField, YearField } from '../src/components/converter/ConverterField';
import { OptionSheet } from '../src/components/converter/OptionSheet';
import type { SheetOption } from '../src/components/converter/OptionSheet';
import { dateService, toHebrewDay, toHebrewYearFull } from '../src/services/DateService';
import { radius } from '../src/constants/radius';
import { typography, withFontFamily } from '../src/constants/typography';

// ─── Calendar helpers ─────────────────────────────────────────────────────────

type Direction = 'g2h' | 'h2g';

const GREG_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

// Spelling as in the approved frames (D5), keyed by @hebcal month number.
const HEB_MONTHS: Record<number, string> = {
  1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
  7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳',
};

const WEEKDAYS = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

const GREG_MIN_YEAR = 1;
// Capped where the Hebrew result stays within 4 digits (Hebrew 9999 ends in
// 6239), so the Hebrew year always has a single millennium letter.
const GREG_MAX_YEAR = 6000;
// Tishrei 3762 is September of year 1 CE: the first Hebrew year whose whole
// Gregorian span is AD, so the Gregorian result never needs a BCE year.
const HEB_MIN_YEAR = 3762;
const HEB_MAX_YEAR = 9999;
// Fallback when the typed year is invalid: a leap year, so every month and
// day stays pickable until the year is fixed.
const FALLBACK_HEB_YEAR = 5784;

function hebMonthName(month: number, year: number): string {
  return month === 12 && HDate.isLeapYear(year) ? 'אדר א׳' : HEB_MONTHS[month];
}

function isGregLeap(y: number): boolean {
  return y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
}

function gregDaysInMonth(month: number, year: number | null): number {
  if (month === 2) return year === null || isGregLeap(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** Builds a Date safely for any year: the (y, m, d) constructor maps 0–99 to 1900–1999. */
function makeDate(y: number, m: number, d: number): Date {
  const date = new Date(2000, 0, 1, 12);
  date.setFullYear(y, m - 1, d);
  return date;
}

function formatGreg(date: Date, withYear = true): string {
  const base = `${date.getDate()} ב${GREG_MONTHS[date.getMonth()]}`;
  return withYear ? `${base} ${date.getFullYear()}` : base;
}

/** Before the Gregorian reform (15 October 1582). */
function isBeforeReform(date: Date): boolean {
  const y = date.getFullYear();
  if (y !== 1582) return y < 1582;
  return date.getMonth() < 9 || (date.getMonth() === 9 && date.getDate() < 15);
}

function parseYear(text: string, min: number, max: number): number | null {
  const n = parseInt(text, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ConverterScreen() {
  const colors = useThemeColors();

  const today = useMemo(() => {
    const now = new Date();
    const hd = new HDate(now);
    return {
      g: { day: now.getDate(), month: now.getMonth() + 1, year: now.getFullYear() },
      h: { day: hd.getDate(), month: hd.getMonth(), year: hd.getFullYear() },
    };
  }, []);

  const [direction, setDirection] = useState<Direction>('g2h');
  const [gDay, setGDay] = useState(today.g.day);
  const [gMonth, setGMonth] = useState(today.g.month);
  const [gYearText, setGYearText] = useState(String(today.g.year));
  const [afterSunset, setAfterSunset] = useState(false);
  const [hDay, setHDay] = useState(today.h.day);
  const [hMonth, setHMonth] = useState(today.h.month);
  const [hYearText, setHYearText] = useState(String(today.h.year));
  const [sheet, setSheet] = useState<'day' | 'month' | null>(null);

  const gYear = parseYear(gYearText, GREG_MIN_YEAR, GREG_MAX_YEAR);
  const hYear = parseYear(hYearText, HEB_MIN_YEAR, HEB_MAX_YEAR);
  const hYearForLists = hYear ?? FALLBACK_HEB_YEAR;

  const gMaxDay = gregDaysInMonth(gMonth, gYear);
  const hMonths = dateService.getHebrewMonthsForYear(hYearForLists);
  const hMaxDay = dateService.getHebrewDaysInMonth(hMonth, hYearForLists);

  // Keep day/month valid when the year or month changes underneath them
  // (31 → 30 days, 30 Cheshvan in a short year, Adar II in a common year).
  useEffect(() => { if (gDay > gMaxDay) setGDay(gMaxDay); }, [gDay, gMaxDay]);
  useEffect(() => {
    if (hMonth === 13 && !HDate.isLeapYear(hYearForLists)) setHMonth(12);
  }, [hMonth, hYearForLists]);
  useEffect(() => { if (hDay > hMaxDay) setHDay(hMaxDay); }, [hDay, hMaxDay]);

  // ── Result ──
  let resultMain: string | null = null;
  let resultSub = '';
  let reformDate: Date | null = null;

  if (direction === 'g2h' && gYear !== null && gDay <= gMaxDay) {
    const r = dateService.gregorianToHebrew(gYear, gMonth, gDay, afterSunset);
    const gDate = makeDate(gYear, gMonth, gDay);
    resultMain = `${toHebrewDay(r.day)} ב${hebMonthName(r.month, r.year)} ${toHebrewYearFull(r.year, false)}`;
    resultSub = WEEKDAYS[gDate.getDay()] + (afterSunset ? ', אחרי השקיעה' : '');
    reformDate = gDate;
  } else if (direction === 'h2g' && hYear !== null) {
    const date = dateService.hebrewToGregorian(hYear, hMonth, hDay);
    if (date) {
      const eve = new Date(date);
      eve.setDate(eve.getDate() - 1);
      const sameYear = eve.getFullYear() === date.getFullYear();
      resultMain = formatGreg(date);
      resultSub = `${WEEKDAYS[date.getDay()]} · היום העברי מתחיל בשקיעה של ${formatGreg(eve, !sameYear)}`;
      reformDate = date;
    }
  }
  const showReformNote = reformDate !== null && isBeforeReform(reformDate);

  // ── Actions ──
  const switchDirection = (next: Direction) => {
    if (next === direction) return;
    // Carry the current result over as the new input, so switching shows
    // the same day from the other side.
    if (next === 'h2g' && direction === 'g2h' && gYear !== null) {
      const r = dateService.gregorianToHebrew(gYear, gMonth, gDay, afterSunset);
      setHDay(r.day); setHMonth(r.month); setHYearText(String(r.year));
    } else if (next === 'g2h' && direction === 'h2g' && hYear !== null) {
      const date = dateService.hebrewToGregorian(hYear, hMonth, hDay);
      if (date) {
        setGDay(date.getDate()); setGMonth(date.getMonth() + 1); setGYearText(String(date.getFullYear()));
        setAfterSunset(false);
      }
    }
    setDirection(next);
  };

  const resetToToday = () => {
    setGDay(today.g.day); setGMonth(today.g.month); setGYearText(String(today.g.year));
    setHDay(today.h.day); setHMonth(today.h.month); setHYearText(String(today.h.year));
    setAfterSunset(false);
  };

  // ── Sheet options ──
  const isG = direction === 'g2h';
  const dayOptions: SheetOption[] = Array.from({ length: isG ? gMaxDay : hMaxDay }, (_, i) => ({
    value: i + 1,
    label: isG ? String(i + 1) : toHebrewDay(i + 1),
  }));
  const monthOptions: SheetOption[] = isG
    ? GREG_MONTHS.map((label, i) => ({ value: i + 1, label }))
    : hMonths.map(({ month }) => ({ value: month, label: hebMonthName(month, hYearForLists) }));
  const monthSubtitle = !isG && hYear !== null && HDate.isLeapYear(hYear)
    ? `${toHebrewYearFull(hYear, true)} היא שנה מעוברת: יש בה אדר א׳ ואדר ב׳`
    : undefined;

  const yearError = isG ? gYear === null : hYear === null;
  let helper: string | null = null;
  if (yearError) {
    helper = isG ? 'יש להזין שנה בין 1 ל-6000' : 'יש להזין שנה בין 3762 ל-9999';
  } else if (!isG && hYear !== null) {
    helper = `שנה ${toHebrewYearFull(hYear, true)} · אפשר להקליד את השנה במספרים`;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="ממיר תאריכים" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <DirectionToggle direction={direction} onChange={switchDirection} colors={colors} />

          <SectionTitle title={isG ? 'תאריך לועזי' : 'תאריך עברי'} colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* row-reverse: day on the right, then month, year on the left */}
            <View style={styles.fields}>
              <PickerField
                label="יום"
                value={isG ? String(gDay) : toHebrewDay(hDay)}
                onPress={() => setSheet('day')}
                width={80}
                colors={colors}
              />
              <PickerField
                label="חודש"
                value={isG ? GREG_MONTHS[gMonth - 1] : hebMonthName(hMonth, hYearForLists)}
                onPress={() => setSheet('month')}
                colors={colors}
              />
              <YearField
                label="שנה"
                value={isG ? gYearText : hYearText}
                onChangeText={isG ? setGYearText : setHYearText}
                error={yearError}
                width={104}
                colors={colors}
              />
            </View>
            {helper !== null && (
              <Text style={[styles.helper, { color: yearError ? colors.error : colors.textTertiary }]}>
                {helper}
              </Text>
            )}
            {isG && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
                <Pressable
                  onPress={() => setAfterSunset(!afterSunset)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: afterSunset }}
                  accessibilityLabel="אחרי השקיעה"
                  style={styles.sunsetRow}
                >
                  {/* row-reverse: icon on the right, label, switch on the left */}
                  <Sunset size={20} color={colors.textSecondary} />
                  <View style={styles.sunsetLabel}>
                    <Text style={[styles.sunsetTitle, { color: colors.textPrimary }]}>אחרי השקיעה</Text>
                    <Text style={[styles.sunsetSub, { color: colors.textTertiary }]}>
                      היום העברי מתחלף בשקיעה. אם זה קרה בערב, הדליקו את המתג.
                    </Text>
                  </View>
                  <Switch
                    value={afterSunset}
                    onValueChange={setAfterSunset}
                    trackColor={{ false: colors.borderStrong, true: colors.accent }}
                    thumbColor={colors.surface}
                  />
                </Pressable>
              </>
            )}
          </View>

          {showReformNote && (
            <View style={[styles.note, { backgroundColor: colors.warningBg }]}>
              {/* row-reverse: icon on the right, text on the left */}
              <TriangleAlert size={20} color={colors.warning} />
              <View style={styles.noteText}>
                <Text style={[styles.noteTitle, { color: colors.textPrimary }]}>תאריך לפני 1582</Text>
                <Text style={[styles.noteBody, { color: colors.textSecondary }]}>
                  החישוב לפי הלוח הגרגוריאני. מסמכים מאותה תקופה נכתבו בדרך כלל בלוח היוליאני, ולכן התאריך שבהם עשוי להיות שונה בכמה ימים.
                </Text>
              </View>
            </View>
          )}

          <SectionTitle title="התוצאה" colors={colors} />
          <View
            style={[styles.result, { backgroundColor: resultMain ? colors.accentLight : colors.surfaceMuted }]}
            accessibilityLiveRegion="polite"
          >
            <Text style={[styles.resultLabel, { color: resultMain ? colors.accentStrong : colors.textTertiary }]}>
              {isG ? 'תאריך עברי' : 'תאריך לועזי'}
            </Text>
            <Text style={[styles.resultMain, { color: resultMain ? colors.textPrimary : colors.textTertiary }]}>
              {resultMain ?? '—'}
            </Text>
            <Text style={[styles.resultSub, { color: colors.textSecondary }]}>
              {resultMain ? resultSub : 'התוצאה תופיע כאן כשהתאריך תקין'}
            </Text>
          </View>

          <Pressable onPress={resetToToday} accessibilityRole="button" style={styles.reset}>
            <Text style={[styles.resetText, { color: colors.accent }]}>חזרה להיום</Text>
          </Pressable>
        </View>
      </ScrollView>

      <OptionSheet
        visible={sheet === 'day'}
        title="יום"
        options={dayOptions}
        selected={isG ? gDay : hDay}
        onSelect={(v) => { (isG ? setGDay : setHDay)(v); setSheet(null); }}
        onClose={() => setSheet(null)}
        colors={colors}
      />
      <OptionSheet
        visible={sheet === 'month'}
        title="חודש"
        subtitle={monthSubtitle}
        options={monthOptions}
        selected={isG ? gMonth : hMonth}
        onSelect={(v) => { (isG ? setGMonth : setHMonth)(v); setSheet(null); }}
        onClose={() => setSheet(null)}
        colors={colors}
      />
    </View>
  );
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function SectionTitle({ title, colors }: { title: string; colors: ThemeColors }) {
  return <Text style={[styles.section, { color: colors.accent }]}>{title}</Text>;
}

function DirectionToggle({
  direction, onChange, colors,
}: {
  direction: Direction;
  onChange: (d: Direction) => void;
  colors: ThemeColors;
}) {
  const options: { key: Direction; label: string }[] = [
    { key: 'g2h', label: 'מלועזי לעברי' },
    { key: 'h2g', label: 'מעברי ללועזי' },
  ];
  return (
    // row-reverse: "מלועזי לעברי" on the right
    <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
      {options.map(({ key, label }) => {
        const on = key === direction;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.pill, on && { backgroundColor: colors.accent }]}
          >
            <Text style={[on ? styles.pillTextOn : styles.pillText, { color: on ? colors.textInverse : colors.textSecondary }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingTop: 14, paddingBottom: 14, paddingHorizontal: 16 },
  // Tablet: the content column is capped at 560 and centred (Figma 768 frames).
  column: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 8 },

  track: {
    flexDirection: 'row-reverse',
    padding: 4,
    gap: 4,
    borderRadius: radius.full,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.full,
  },
  // Figma: 14 Medium / 21; selected 14 Bold / 21.
  pillText: { ...withFontFamily(typography.label, '500'), lineHeight: 21, textAlign: 'center' },
  pillTextOn: { ...withFontFamily(typography.label, '700'), lineHeight: 21, textAlign: 'center' },

  // Figma: 11 Bold / 16, accent.
  section: { ...withFontFamily(typography.captionBold), lineHeight: 16, textAlign: 'right' },

  card: {
    padding: 14,
    gap: 12,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  fields: { flexDirection: 'row-reverse', gap: 10 },
  // Figma: 12 Regular / 17.
  helper: { ...withFontFamily(typography.subtitle, '400'), lineHeight: 17, textAlign: 'right' },
  divider: { height: 1 },
  sunsetRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  sunsetLabel: { flex: 1, gap: 2 },
  // Figma: 15 Regular / 22 and 12 Regular / 17.
  sunsetTitle: { ...withFontFamily(typography.bodyMedium), textAlign: 'right' },
  sunsetSub: { ...withFontFamily(typography.subtitle, '400'), lineHeight: 17, textAlign: 'right' },

  note: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
  },
  noteText: { flex: 1, gap: 2 },
  // Figma: 13 Bold / 19 and 12 Regular / 17.
  noteTitle: { ...withFontFamily(typography.bodySmall, '700'), lineHeight: 19, textAlign: 'right' },
  noteBody: { ...withFontFamily(typography.subtitle, '400'), lineHeight: 17, textAlign: 'right' },

  result: { padding: 16, gap: 4, borderRadius: radius.card },
  // Figma: 12 Medium / 17; 26 Bold / 38; 14 Regular / 20.
  resultLabel: { ...withFontFamily(typography.subtitle), lineHeight: 17, textAlign: 'right' },
  resultMain: { ...withFontFamily(typography.displayMedium), fontSize: 26, lineHeight: 38, textAlign: 'right' },
  resultSub: { ...withFontFamily(typography.label), lineHeight: 20, textAlign: 'right' },

  reset: { alignItems: 'center', paddingVertical: 12 },
  // Figma: 14 Medium / 21, accent.
  resetText: { ...withFontFamily(typography.label, '500'), lineHeight: 21 },
});
