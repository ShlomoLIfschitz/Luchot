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

import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpenText, Calendar, Sun, Clock, type LucideIcon } from 'lucide-react-native';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { radius } from '../../src/constants/radius';
import { typography, withFontFamily } from '../../src/constants/typography';
import type { ThemeColors } from '../../src/hooks/useThemeColors';

export const unstable_settings = { initialRouteName: 'index' };

/** React Navigation hands tab colors as ColorValue; ours are always hex strings. */
function asColorString(color: ColorValue): string | undefined {
  return typeof color === 'string' ? color : undefined;
}

/** Icon wrapped in a pill that lights up with `colors.accentLight` when the tab is active. */
function TabIcon({ Icon, color, size, focused, colors }: {
  Icon: LucideIcon;
  color: ColorValue;
  size: number;
  focused: boolean;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.iconPill, focused && { backgroundColor: colors.accentLight }]}>
      <Icon color={asColorString(color)} size={size} />
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 4,
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
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={Clock} color={color} size={size} focused={focused} colors={colors} />
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
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={Sun} color={color} size={size} focused={focused} colors={colors} />
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
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={Calendar} color={color} size={size} focused={focused} colors={colors} />
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
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon Icon={BookOpenText} color={color} size={size} focused={focused} colors={colors} />
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
    marginTop: 2,
    textAlign: 'center',
    ...withFontFamily(typography.caption),
  },
  labelActive: {
    ...withFontFamily(typography.caption, '700'),
  },
});
