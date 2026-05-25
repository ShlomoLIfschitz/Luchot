// app/(tabs)/_layout.tsx
// Phase 3.4 — v2 tab layout. Four visible tabs (עברי / לועזי / יום / זמנים).
// Settings hidden from tab bar (href: null); accessible via hamburger (Phase 3.7).

import { Tabs } from 'expo-router';
import { BookOpenText, Calendar, Sun, Clock } from 'lucide-react-native';
import { useThemeColors } from '../../src/hooks/useThemeColors';

export default function TabLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'עברי',
          tabBarIcon: ({ color, size }) => <BookOpenText color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="gregorian"
        options={{
          title: 'לועזי',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="day"
        options={{
          title: 'יום',
          tabBarIcon: ({ color, size }) => <Sun color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="zmanim"
        options={{
          title: 'זמנים',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hidden from tab bar — accessible via hamburger (Phase 3.7)
        }}
      />
    </Tabs>
  );
}
