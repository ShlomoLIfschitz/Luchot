import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StorageService } from '../src/services/StorageService';
import { useSettingsStore } from '../src/providers/SettingsProvider';
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { useLocationStore } from '../src/providers/LocationProvider';
import { dateService } from '../src/services/DateService';
import { Drawer } from '../src/components/drawer/Drawer';
import { NotificationService } from '../src/services/NotificationService';

export default function RootLayout() {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const system = useColorScheme();
  const scheme = darkMode === 'system' ? (system ?? 'light') : darkMode;

  useEffect(() => {
    async function init() {
      await StorageService.init();
      await Promise.all([
        useSettingsStore.getState().loadFromStorage(),
        useLocationStore.getState().loadFromStorage(),
        NotificationService.init(),
      ]);
      const diaspora = useSettingsStore.getState().diaspora;
      dateService.setDiaspora(diaspora);
      useCalendarStore.getState().refreshMonth();
      await NotificationService.ensureAnnualReminders();
      const { omerRemindersEnabled, omerReminderTime } = useSettingsStore.getState();
      await NotificationService.ensureOmerReminders(omerRemindersEnabled, omerReminderTime);
    }
    init().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} />
        {/* Drawer rendered AFTER Stack so it sits on top via z-stack
            (last child wins for absolute-positioned overlays). */}
        <Drawer />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
