// app/(tabs)/_layout.tsx
// Phase 3.4 — v2 tab layout. Four visible tabs (עברי / לועזי / יום / זמנים).
// Phase 3.7a-2 — settings Tabs.Screen removed; Settings is now a standalone
// screen at app/settings.tsx, accessible only via the hamburger drawer.

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
    </Tabs>
  );
}
