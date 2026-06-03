import { useEffect } from 'react';
import { useColorScheme, I18nManager } from 'react-native';
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

if (I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

export default function RootLayout() {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const settingsReady = useSettingsStore((s) => s.settingsReady);
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
      const { candleLightingRemindersEnabled, candleLightingLeadMinutes, candleLightingCity } =
        useSettingsStore.getState();
      await NotificationService.ensureCandleLightingReminders(
        candleLightingRemindersEnabled,
        candleLightingLeadMinutes,
        candleLightingCity,
      );
    }
    init().catch(console.error);
  }, []);

  // All hooks are declared above this point — safe to early-return here.
  // Render nothing until persisted settings are loaded so the UI never
  // flashes the default theme before the stored preference is applied.
  if (!settingsReady) return null;

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
