// app/settings.tsx
// Phase 3.7a-2 — Settings relocated from app/(tabs)/settings.tsx to a
// standalone screen accessible only via the hamburger drawer.
//
// Changes from the old tab-based version:
//   - Dead toggles removed: showHebrew, showGregorian
//   - Icon background squares removed; plain lucide icons used instead
//   - All hex color literals replaced with design tokens
//   - PickerModal uses overlay.modal, radius.xl, colors.textInverse
//   - ScreenHeader added with title "הגדרות" (hamburger + back context)
//   - "עברית למעלה" toggle kept — field is live and will drive the
//     universal date header in Phase 3.7c

import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, Switch, StyleSheet, ScrollView, Pressable,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Moon,
  Globe,
  CalendarDays,
  Clock,
  MapPin,
  Bell,
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
import { findCityByKey } from '../src/constants/cities';
import { findNearestCity } from '../src/utils/locationLookup';
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
                  <View style={[
                    pickerStyles.radio,
                    { borderColor: colors.accent },
                    selected === opt.value && { backgroundColor: colors.accent },
                  ]}>
                    {selected === opt.value && (
                      <View style={[pickerStyles.radioDot, { backgroundColor: colors.textInverse }]} />
                    )}
                  </View>
                  <Text style={[pickerStyles.optionLabel, { color: colors.textPrimary }]}>
                    {opt.label}
                  </Text>
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
  title:       { fontSize: 16, fontWeight: '700', marginBottom: 14, textAlign: 'right' },
  option:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    marginLeft: 12, justifyContent: 'center', alignItems: 'center',
  },
  radioDot:    { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { flex: 1, fontSize: 15, textAlign: 'right' },
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, colors }: { title: string; colors: ThemeColors }) {
  return (
    <Text style={[sectionStyles.header, { color: colors.accent }]}>{title}</Text>
  );
}

const sectionStyles = StyleSheet.create({
  header: {
    fontSize: 12, fontWeight: '700', letterSpacing: 0.8,
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 8,
    textAlign: 'right', textTransform: 'uppercase',
  },
});

// ─── Setting Row ──────────────────────────────────────────────────────────────
// Plain lucide icon — no iconBg colored squares (stale iOS pattern removed).
// IconComponent uses ComponentType<any> for the same reason as DrawerItem:
// Lucide's SvgProps chain makes narrower types incompatible with propTypes.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = React.ComponentType<any>;

function SettingRow({
  Icon, label, right, onPress, colors, isLast = false,
}: {
  Icon: IconComponent;
  label: string;
  right: React.ReactNode;
  onPress?: () => void;
  colors: ThemeColors;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      style={[
        rowStyles.row,
        { backgroundColor: colors.surface },
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Icon size={20} color={colors.textSecondary} />
      <Text style={[rowStyles.label, { color: colors.textPrimary }]}>{label}</Text>
      <View style={rowStyles.right}>{right}</View>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16, gap: 14, minHeight: 54,
  },
  label: { flex: 1, fontSize: 15, textAlign: 'right' },
  right: { flexDirection: 'row', alignItems: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const colors = useThemeColors();
  const {
    hebrewOnTop, diaspora, use24hTime,
    darkMode, zmanimMethod, firstDayOfWeek,
    toggleHebrewOnTop,
    setDarkMode, setZmanimMethod, setFirstDayOfWeek,
    setDiaspora: setSettingsDiaspora,
  } = useSettingsStore();

  const router = useRouter();
  const calendarSetDiaspora = useCalendarStore((s) => s.setDiaspora);
  const { cityHebcalKey, latitude, longitude } = useLocationStore();

  const permission = useNotificationPermission();

  const [scheduledCount, setScheduledCount] = useState<number | null>(null);

  useEffect(() => {
    NotificationService.getScheduled().then(n => setScheduledCount(n.length)).catch(() => setScheduledCount(0));
  }, []);

  const [themePicker, setThemePicker] = useState(false);
  const [zmanimPicker, setZmanimPicker] = useState(false);

  // Derive current city name for display in the location row
  const currentCityName = useMemo(() => {
    if (cityHebcalKey) {
      const entry = findCityByKey(cityHebcalKey);
      if (entry) return entry.nameHe;
    }
    const { city } = findNearestCity(latitude, longitude);
    return city.nameHe;
  }, [cityHebcalKey, latitude, longitude]);

  const themeLabel =
    darkMode === 'system' ? 'לפי המכשיר' : darkMode === 'dark' ? 'כהה' : 'בהיר';
  const zmanimLabel = zmanimMethod === 'MGA' ? 'מג״א' : 'גר״א';

  const notificationLabel =
    permission.status === null ? '...' :
    permission.isGranted ? 'מופעל' :
    permission.isDenied ? 'חסום — פתח הגדרות' :
    'לא הופעל';

  const trackColor = { false: colors.border, true: colors.accent };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="הגדרות" />
      <ScrollView contentContainerStyle={styles.content}>

        {/* ── מראה ── */}
        <SectionHeader title="מראה" colors={colors} />
        <View style={[styles.card, { borderColor: colors.border }]}>
          <SettingRow
            Icon={Moon}
            label="ערכת צבעים"
            colors={colors}
            onPress={() => setThemePicker(true)}
            right={
              <>
                <Text style={[styles.valueText, { color: colors.textSecondary }]}>
                  {themeLabel}
                </Text>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
              </>
            }
            isLast
          />
        </View>

        {/* ── לוח שנה ── */}
        <SectionHeader title="לוח שנה" colors={colors} />
        <View style={[styles.card, { borderColor: colors.border }]}>
          <SettingRow
            Icon={CalendarDays}
            label="עברית למעלה"
            colors={colors}
            right={
              <Switch
                value={hebrewOnTop}
                onValueChange={toggleHebrewOnTop}
                trackColor={trackColor}
              />
            }
          />
          <SettingRow
            Icon={Globe}
            label="תפוצות (חגים)"
            colors={colors}
            right={
              <Switch
                value={diaspora}
                onValueChange={(v) => {
                  setSettingsDiaspora(v);
                  calendarSetDiaspora(v);
                }}
                trackColor={trackColor}
              />
            }
          />
          <SettingRow
            Icon={CalendarDays}
            label="יום ראשון בשבוע"
            colors={colors}
            onPress={() => setFirstDayOfWeek(firstDayOfWeek === 0 ? 1 : 0)}
            right={
              <>
                <Text style={[styles.valueText, { color: colors.textSecondary }]}>
                  {firstDayOfWeek === 0 ? 'ראשון' : 'שני'}
                </Text>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
              </>
            }
            isLast
          />
        </View>

        {/* ── זמנים ── */}
        <SectionHeader title="זמנים" colors={colors} />
        <View style={[styles.card, { borderColor: colors.border }]}>
          <SettingRow
            Icon={Clock}
            label="שיטת חישוב"
            colors={colors}
            onPress={() => setZmanimPicker(true)}
            right={
              <>
                <Text style={[styles.valueText, { color: colors.textSecondary }]}>
                  {zmanimLabel}
                </Text>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
              </>
            }
          />
          <SettingRow
            Icon={Clock}
            label="שעון 24 שעות"
            colors={colors}
            right={
              <Switch
                value={use24hTime}
                onValueChange={(v) => {
                  useSettingsStore.setState({ use24hTime: v });
                  useSettingsStore.getState().save('use24hTime', String(v));
                }}
                trackColor={trackColor}
              />
            }
          />
          <SettingRow
            Icon={MapPin}
            label="מיקום"
            colors={colors}
            onPress={() => router.push('/locationPicker' as any)}
            right={
              <>
                <Text style={[styles.valueText, { color: colors.textSecondary }]}>
                  {currentCityName}
                </Text>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
              </>
            }
            isLast
          />
        </View>

        {/* ── התראות ── */}
        <SectionHeader title="התראות" colors={colors} />
        <View style={[styles.card, { borderColor: colors.border }]}>
          <SettingRow
            Icon={Bell}
            label="התראות"
            colors={colors}
            onPress={() => { void permission.request(); }}
            right={
              <>
                <Text style={[styles.valueText, { color: colors.textSecondary }]}>
                  {notificationLabel}
                </Text>
                <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
              </>
            }
          />
          <SettingRow
            Icon={Bell}
            label={scheduledCount === null ? '...' : scheduledCount === 0 ? 'אין התראות מתוזמנות' : `${scheduledCount} התראות מתוזמנות`}
            colors={colors}
            right={<View />}
            isLast
          />
        </View>

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
  valueText: { fontSize: 14 },
  chevron:   { fontSize: 22, marginLeft: 2 },
});
