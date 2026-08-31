// app/settings.tsx
// Phase 3.7a-2 — Settings relocated from app/(tabs)/settings.tsx to a
// standalone screen accessible only via the hamburger drawer.
//
// Redesign (Wave — settings card restructure):
//   - Fixed a real RTL bug: `rowStyles.right` used plain `flexDirection: 'row'`
//     with JSX order [valueText, chevron], which placed the chevron BETWEEN
//     the label and the value instead of at the outer (left) edge. Every row
//     in this file now uses explicit `flexDirection: 'row-reverse'` with a
//     single, deliberate JSX order — no more accidental two-pattern layout.
//   - Sections regrouped: מראה / לוח שנה / מיקום וזמנים / התראות. Location is
//     unified (see LocationProvider) — one "המיקום שלי" row drives both
//     zmanim and candle-lighting reminders.
//   - `use24hTime` is only ever changed via the `setUse24hTime` store action
//     (never inline setState + save — see the use24hTime persistence bug).

import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, Switch, StyleSheet, ScrollView, Pressable,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import { useTimePicker } from '../src/hooks/useTimePicker';
import { useRouter } from 'expo-router';
import {
  Moon,
  Globe,
  CalendarDays,
  Clock,
  MapPin,
  Bell,
  Flame,
} from 'lucide-react-native';
import { useNotificationPermission } from '../src/hooks/useNotificationPermission';
import { NotificationService } from '../src/services/NotificationService';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { useSettingsStore } from '../src/providers/SettingsProvider';
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { useLocationStore } from '../src/providers/LocationProvider';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { radius } from '../src/constants/radius';
import { overlay } from '../src/constants/overlay';
import { typography, withFontFamily } from '../src/constants/typography';
import { findNearestCity } from '../src/utils/locationLookup';
import { Card } from '../src/components/ui/Card';
import { SectionLabel } from '../src/components/ui/SectionLabel';
import type { ThemeColors } from '../src/hooks/useThemeColors';

// ─── Picker Modal ─────────────────────────────────────────────────────────────

function PickerModal({
  visible, title, options, selected, onSelect, onClose, colors,
}: {
  visible: boolean;
  title: string;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  colors: ThemeColors;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[pickerStyles.overlay, { backgroundColor: overlay.modal }]}>
          <TouchableWithoutFeedback>
            <View style={[pickerStyles.sheet, { backgroundColor: colors.surface }]}>
              <Text style={[pickerStyles.title, { color: colors.textPrimary }]}>{title}</Text>
              {options.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={pickerStyles.option}
                  onPress={() => { onSelect(opt.value); onClose(); }}
                >
                  <Text style={[pickerStyles.optionLabel, { color: colors.textPrimary }]}>
                    {opt.label}
                  </Text>
                  <View style={[
                    pickerStyles.radio,
                    { borderColor: colors.accent },
                    selected === opt.value && { backgroundColor: colors.accent },
                  ]}>
                    {selected === opt.value && (
                      <View style={[pickerStyles.radioDot, { backgroundColor: colors.textInverse }]} />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sheet:       { width: 280, borderRadius: radius.xl, padding: 22, elevation: 10 },
  title:       { ...withFontFamily(typography.cardTitle), marginBottom: 14, textAlign: 'right' },
  option:      { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 11 },
  radio: {
    width: 22, height: 22, borderRadius: radius.full, borderWidth: 2,
    marginRight: 12, justifyContent: 'center', alignItems: 'center',
  },
  radioDot:    { width: 10, height: 10, borderRadius: radius.full },
  optionLabel: { flex: 1, ...withFontFamily(typography.bodyMedium), textAlign: 'right' },
});

// ─── Row primitives ───────────────────────────────────────────────────────────
// IconComponent uses ComponentType<any> for the same reason as DrawerItem:
// Lucide's SvgProps chain makes narrower types incompatible with propTypes.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

interface RowBaseProps {
  isLast?: boolean;
}

/** Generic row: optional leading icon (far right / reading start), label,
 *  then arbitrary trailing content (far left / reading end). Reading order,
 *  explicit: [Icon, Label, Right] inside a `row-reverse` container — Icon
 *  lands on the right, Right lands on the left. This is the single row
 *  pattern used everywhere in this file; there is no second variant. */
function SettingRow({
  Icon, label, right, onPress, colors, isLast = false,
  accessibilityRole, accessibilityState, accessibilityLabel, accessibilityHint,
}: {
  Icon?: IconComponent;
  label: string;
  right: React.ReactNode;
  onPress?: () => void;
  colors: ThemeColors;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accessibilityRole?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accessibilityState?: any;
  accessibilityLabel?: string;
  accessibilityHint?: string;
} & RowBaseProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={onPress ? { color: colors.border } : undefined}
      style={[
        rowStyles.row,
        { backgroundColor: colors.surface },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      accessibilityRole={accessibilityRole ?? (onPress ? 'button' : undefined)}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
    >
      {Icon && <Icon size={20} color={colors.textSecondary} />}
      <Text style={[rowStyles.label, { color: colors.textPrimary }]}>{label}</Text>
      <View style={rowStyles.right}>{right}</View>
    </Pressable>
  );
}

/** Trailing [value, chevron] content — row-reverse, JSX order [value, chevron]
 *  so value lands adjacent to the label and the chevron lands at the far
 *  (left) edge of the whole row. */
function ChevronValue({ value, colors }: { value: string; colors: ThemeColors }) {
  return (
    <>
      <Text style={[styles.valueText, { color: colors.textSecondary }]}>{value}</Text>
      <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
    </>
  );
}

/** A full toggle row — the whole row is pressable (toggles the switch) and
 *  the Switch itself is also directly interactive. */
function ToggleRow({
  Icon, label, value, onValueChange, colors, isLast = false, accessibilityLabel,
}: {
  Icon?: IconComponent;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: ThemeColors;
  accessibilityLabel?: string;
} & RowBaseProps) {
  return (
    <SettingRow
      Icon={Icon}
      label={label}
      colors={colors}
      isLast={isLast}
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel ?? label}
      right={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor={colors.surface}
        />
      }
    />
  );
}

/** Non-interactive info row — a value with no chevron (nothing to navigate
 *  to). Used for read-only diagnostic/status text. */
function InfoRow({
  Icon, label, value, colors, isLast = false,
}: {
  Icon?: IconComponent;
  label: string;
  value: string;
  colors: ThemeColors;
} & RowBaseProps) {
  return (
    <SettingRow
      Icon={Icon}
      label={label}
      colors={colors}
      isLast={isLast}
      right={<Text style={[styles.valueText, { color: colors.textSecondary }]}>{value}</Text>}
    />
  );
}

/** Right-aligned caption note rendered OUTSIDE a card, directly below it. */
function CardNote({ text, colors }: { text: string; colors: ThemeColors }) {
  return (
    <Text style={[styles.note, { color: colors.textTertiary }]}>{text}</Text>
  );
}

/** Lead-time chip selector row — participates in Card's isLast injection
 *  like every other row in this file. */
function ChipsRow({
  label, options, selected, onSelect, colors, isLast = false,
}: {
  label: string;
  options: number[];
  selected: number;
  onSelect: (v: number) => void;
  colors: ThemeColors;
} & RowBaseProps) {
  return (
    <View
      style={[
        candleRowStyles.chipsRow,
        { backgroundColor: colors.surface },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
    >
      <Text style={[candleRowStyles.chipsLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={candleRowStyles.chips}>
        {options.map((min) => {
          const isSelected = selected === min;
          return (
            <Pressable
              key={min}
              onPress={() => onSelect(min)}
              style={[
                candleRowStyles.chip,
                { backgroundColor: isSelected ? colors.accent : colors.surfaceElevated },
              ]}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${min} דקות מראש`}
            >
              <Text
                style={[
                  candleRowStyles.chipText,
                  { color: isSelected ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {min}′
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, gap: 14, minHeight: 54,
  },
  label: { flex: 1, ...withFontFamily(typography.bodyMedium), textAlign: 'right' },
  right: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useThemeColors();
  const {
    hebrewOnTop, diaspora, use24hTime,
    darkMode, zmanimMethod, firstDayOfWeek,
    toggleHebrewOnTop,
    setDarkMode, setZmanimMethod, setFirstDayOfWeek, setUse24hTime,
    setDiaspora: setSettingsDiaspora,
    omerRemindersEnabled, omerReminderTime,
    setOmerRemindersEnabled, setOmerReminderTime,
    candleLightingRemindersEnabled, candleLightingLeadMinutes,
    setCandleLightingRemindersEnabled, setCandleLightingLeadMinutes,
  } = useSettingsStore();

  const router = useRouter();
  const calendarSetDiaspora = useCalendarStore((s) => s.setDiaspora);
  const { placeName, latitude, longitude } = useLocationStore();

  const permission = useNotificationPermission();

  const [scheduledCount, setScheduledCount] = useState<number | null>(null);

  useEffect(() => {
    NotificationService.getScheduled().then(n => setScheduledCount(n.length)).catch(() => setScheduledCount(0));
  }, []);

  const { openPicker: openTimePicker, picker: timePicker } = useTimePicker(
    omerReminderTime,
    setOmerReminderTime,
  );

  const [themePicker, setThemePicker] = useState(false);
  const [zmanimPicker, setZmanimPicker] = useState(false);

  // Location is unified (LocationProvider) — placeName covers the curated-city
  // and successfully-reverse-geocoded-GPS cases. A raw GPS fix with no name
  // match falls back to the nearest curated city's name, same as before.
  const currentLocationLabel = useMemo(() => {
    if (placeName) return placeName;
    const { city } = findNearestCity(latitude, longitude);
    return city.nameHe;
  }, [placeName, latitude, longitude]);

  const themeLabel =
    darkMode === 'system' ? 'לפי המכשיר' : darkMode === 'dark' ? 'כהה' : 'בהיר';
  const zmanimLabel = zmanimMethod === 'MGA' ? 'מג״א' : 'גר״א';

  const notificationLabel =
    permission.status === null ? '...' :
    permission.isGranted ? 'מופעל' :
    permission.isDenied ? 'חסום — פתח הגדרות' :
    'לא הופעל';

  const scheduledLabel =
    scheduledCount === null ? '...' :
    scheduledCount === 0 ? 'אין התראות' :
    `${scheduledCount} מתוזמנות`;

  /**
   * Wave 1B — location is now unified (LocationProvider always has a
   * location; see docs). The "pick a location first" gate that used to live
   * here is obsolete: enabling/disabling candle-lighting reminders is now a
   * plain toggle.
   */
  const handleCandleLightingToggle = (newValue: boolean) => {
    setCandleLightingRemindersEnabled(newValue);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="הגדרות" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── מראה ── */}
        <SectionLabel title="מראה" colors={colors} />
        <Card colors={colors}>
          <SettingRow
            Icon={Moon}
            label="ערכת צבעים"
            colors={colors}
            onPress={() => setThemePicker(true)}
            right={<ChevronValue value={themeLabel} colors={colors} />}
          />
          <ToggleRow
            Icon={Clock}
            label="שעון 24 שעות"
            value={use24hTime}
            onValueChange={setUse24hTime}
            colors={colors}
          />
        </Card>

        {/* ── לוח שנה ── */}
        <SectionLabel title="לוח שנה" colors={colors} />
        <Card colors={colors}>
          <SettingRow
            Icon={CalendarDays}
            label="יום ראשון בשבוע"
            colors={colors}
            onPress={() => setFirstDayOfWeek(firstDayOfWeek === 0 ? 1 : 0)}
            right={<ChevronValue value={firstDayOfWeek === 0 ? 'ראשון' : 'שני'} colors={colors} />}
          />
          <ToggleRow
            Icon={Globe}
            label="תפוצות (חגים)"
            value={diaspora}
            onValueChange={(v) => {
              setSettingsDiaspora(v);
              calendarSetDiaspora(v);
            }}
            colors={colors}
          />
          <ToggleRow
            Icon={CalendarDays}
            label="עברית למעלה"
            value={hebrewOnTop}
            onValueChange={toggleHebrewOnTop}
            colors={colors}
          />
        </Card>

        {/* ── מיקום וזמנים ── */}
        <SectionLabel title="מיקום וזמנים" colors={colors} />
        <Card colors={colors}>
          <SettingRow
            Icon={MapPin}
            label="המיקום שלי"
            colors={colors}
            onPress={() => router.push('/locationPicker' as any)}
            right={<ChevronValue value={currentLocationLabel} colors={colors} />}
          />
          <SettingRow
            Icon={Clock}
            label="שיטת חישוב"
            colors={colors}
            onPress={() => setZmanimPicker(true)}
            right={<ChevronValue value={zmanimLabel} colors={colors} />}
          />
        </Card>
        <CardNote
          text="מיקום אחד משמש גם לחישוב הזמנים וגם להתראות הדלקת נרות"
          colors={colors}
        />

        {/* ── התראות ── */}
        <SectionLabel title="התראות" colors={colors} />
        <Card colors={colors}>
          <SettingRow
            Icon={Bell}
            label="הרשאת התראות"
            colors={colors}
            onPress={() => { void permission.request(); }}
            right={<ChevronValue value={notificationLabel} colors={colors} />}
          />
          <InfoRow
            label="התראות מתוזמנות"
            value={scheduledLabel}
            colors={colors}
          />
          <ToggleRow
            Icon={Flame}
            label="התראות הדלקת נרות"
            value={candleLightingRemindersEnabled}
            onValueChange={handleCandleLightingToggle}
            colors={colors}
            accessibilityLabel="התראות הדלקת נרות"
          />
          {candleLightingRemindersEnabled && (
            <ChipsRow
              label="זמן מראש"
              options={[5, 10, 15, 30]}
              selected={candleLightingLeadMinutes}
              onSelect={setCandleLightingLeadMinutes}
              colors={colors}
            />
          )}
          <ToggleRow
            Icon={Bell}
            label="תזכורת ספירת העומר"
            value={omerRemindersEnabled}
            onValueChange={setOmerRemindersEnabled}
            colors={colors}
            accessibilityLabel="תזכורת ספירת העומר"
          />
          {omerRemindersEnabled && (
            <SettingRow
              label="זמן תזכורת"
              colors={colors}
              onPress={openTimePicker}
              accessibilityRole="button"
              accessibilityHint="פתח בורר שעה"
              accessibilityLabel={`זמן תזכורת: ${omerReminderTime}`}
              right={<ChevronValue value={omerReminderTime} colors={colors} />}
            />
          )}
        </Card>

      </ScrollView>

      {/* Pickers rendered outside ScrollView so they overlay the full screen */}
      <PickerModal
        visible={themePicker}
        title="ערכת צבעים"
        options={[
          { label: 'לפי המכשיר', value: 'system' },
          { label: 'בהיר',       value: 'light' },
          { label: 'כהה',        value: 'dark' },
        ]}
        selected={darkMode}
        onSelect={(v) => setDarkMode(v as 'system' | 'light' | 'dark')}
        onClose={() => setThemePicker(false)}
        colors={colors}
      />
      <PickerModal
        visible={zmanimPicker}
        title="שיטת חישוב זמנים"
        options={[
          { label: 'גר״א', value: 'GRA' },
          { label: 'מג״א', value: 'MGA' },
        ]}
        selected={zmanimMethod}
        onSelect={(v) => setZmanimMethod(v as 'GRA' | 'MGA')}
        onClose={() => setZmanimPicker(false)}
        colors={colors}
      />
      {timePicker}
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1 },
  content:   { paddingBottom: 48 },
  card: {
    marginHorizontal: 16,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  // Figma: row value = 14 Medium.
  valueText: { ...withFontFamily(typography.label, '500') },
  // No exact type-scale step matches the previous hand-picked 22 — nearest
  // step is displaySmall (20); delta of -2 noted, matches the row's Icon
  // size (20) so the chevron reads consistently with the leading glyph.
  chevron:   { ...withFontFamily(typography.displaySmall) },
  // Figma: explanatory note under a card = 11 Regular.
  note: {
    ...withFontFamily(typography.caption, '400'),
    textAlign: 'right',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
});

// RTL chip row for the candle-lighting lead-time selector.
const candleRowStyles = StyleSheet.create({
  chipsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 48,
  },
  chipsLabel: {
    flex: 1,
    ...withFontFamily(typography.bodyMedium),
    textAlign: 'right',
  },
  chips: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.full,
  },
  chipText: {
    ...withFontFamily(typography.bodySmall, '600'),
  },
});
