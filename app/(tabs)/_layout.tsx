// app/(tabs)/_layout.tsx
// Phase 3.4 — v2 tab layout. Four visible tabs (עברי / לועזי / יום / זמנים).
// Phase 3.7a-2 — settings Tabs.Screen removed; Settings is now a standalone
// screen at app/settings.tsx, accessible only via the hamburger drawer.
//
// RTL note: the native base is locked to LTR (see DECISIONS.md — App locked
// to LTR base). React Navigation's bottom-tab bar therefore renders
// <Tabs.Screen> children left-to-right in JSX declaration order — it does
// NOT auto-flip for Hebrew. To read right-to-left (עברי first, on the
// RIGHT), the screens are declared in the REVERSE of their logical order
// (זמנים, יום, לועזי, עברי) while `unstable_settings.initialRouteName`
// keeps עברי as the tab that loads by default when entering the group.
// (expo-router 58 dropped the `initialRouteName` prop on <Tabs>.)

import { useCallback } from 'react';
import { Tabs, useFocusEffect, useRouter, useSegments } from 'expo-router';
import { Alert, BackHandler, View, Text, StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarIcon,
  CalendarDayIcon,
  ClockIcon,
  DayPageIcon,
} from '../../src/components/icons/FigmaIcons';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useSettingsStore } from '../../src/providers/SettingsProvider';
import { radius } from '../../src/constants/radius';
import { typography, withFontFamily } from '../../src/constants/typography';
import type { ThemeColors } from '../../src/hooks/useThemeColors';

export const unstable_settings = { initialRouteName: 'index' };

/** React Navigation hands tab colors as ColorValue; ours are always hex strings. */
function asColorString(color: ColorValue): string | undefined {
  return typeof color === 'string' ? color : undefined;
}

type TabGlyph = typeof CalendarIcon;

/** Figma tab icons are 22 px inside a 58×28 pill. */
const TAB_ICON_SIZE = 22;

/** Icon wrapped in a pill that lights up with `colors.accentLight` when the tab is active. */
function TabIcon({ Icon, color, focused, colors }: {
  Icon: TabGlyph;
  color: ColorValue;
  focused: boolean;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.iconPill, focused && { backgroundColor: colors.accentLight }]}>
      <Icon color={asColorString(color) ?? colors.textTertiary} size={TAB_ICON_SIZE} />
    </View>
  );
}

/** Label below the pill — bold + accent when active, regular + tertiary otherwise. */
function TabLabel({ children, color, focused }: { children: string; color: ColorValue; focused: boolean }) {
  return (
    <Text style={[styles.label, { color }, focused && styles.labelActive]}>
      {children}
    </Text>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments: string[] = useSegments();
  const defaultCalendarType = useSettingsStore((s) => s.defaultCalendarType);

  // Android back inside the tabs. The tab router's default ('firstRoute')
  // returns to the first DECLARED tab, which is זמנים because the tabs are
  // declared in reverse for RTL. Instead: any other tab goes back to the
  // month view chosen in Settings, and back on that view asks before exiting.
  // Registered only while the tab group is focused, so stack screens pushed
  // on top (settings, converter…) keep normal back; the open drawer's own
  // listener is newer and runs first.
  const homeTab = defaultCalendarType === 'gregorian' ? 'gregorian' : 'index';
  const currentTab = segments[1] ?? 'index';
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (currentTab !== homeTab) {
          router.navigate(homeTab === 'gregorian' ? '/(tabs)/gregorian' : '/(tabs)');
          return true;
        }
        Alert.alert('יציאה מהאפליקציה', 'האם אתה בטוח שברצונך לצאת?', [
          { text: 'ביטול', style: 'cancel' },
          { text: 'יציאה', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      });
      return () => sub.remove();
    }, [currentTab, homeTab, router]),
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          // Figma: 8 top, 47 content (28 pill + 3 + 16 label), 18 bottom.
          // With a system navigation bar the 18 was swallowed by the inset
          // and the label touched the bar, so keep 8 clear above any inset.
          height: 8 + 47 + Math.max(18, insets.bottom + 8),
          paddingTop: 8,
          paddingBottom: Math.max(18, insets.bottom + 8),
        },
      }}
    >
      {/* Declared last-to-first (זמנים…עברי) so that on the locked-LTR native
          base, left-to-right rendering puts עברי — the first logical tab —
          on the RIGHT. initialRouteName="index" keeps עברי as the tab shown
          by default; see the file-level RTL note above. */}
      <Tabs.Screen
        name="zmanim"
        options={{
          title: 'זמנים',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={ClockIcon} color={color} focused={focused} colors={colors} />
          ),
          tabBarLabel: ({ color, focused, children }) => (
            <TabLabel color={color} focused={focused}>{children}</TabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="day"
        options={{
          title: 'יום',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={DayPageIcon} color={color} focused={focused} colors={colors} />
          ),
          tabBarLabel: ({ color, focused, children }) => (
            <TabLabel color={color} focused={focused}>{children}</TabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="gregorian"
        options={{
          title: 'לועזי',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={CalendarDayIcon} color={color} focused={focused} colors={colors} />
          ),
          tabBarLabel: ({ color, focused, children }) => (
            <TabLabel color={color} focused={focused}>{children}</TabLabel>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'עברי',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={CalendarIcon} color={color} focused={focused} colors={colors} />
          ),
          tabBarLabel: ({ color, focused, children }) => (
            <TabLabel color={color} focused={focused}>{children}</TabLabel>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    paddingHorizontal: 18,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  label: {
    marginTop: 3,
    textAlign: 'center',
    ...withFontFamily(typography.caption),
  },
  labelActive: {
    ...withFontFamily(typography.caption, '700'),
  },
});
