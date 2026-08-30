import { useEffect, useRef, useState } from 'react';
import { Alert, useColorScheme, I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
} from '@expo-google-fonts/heebo';
import { StorageService } from '../src/services/StorageService';
import { useSettingsStore } from '../src/providers/SettingsProvider';
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { useLocationStore } from '../src/providers/LocationProvider';
import { dateService } from '../src/services/DateService';
import { Drawer } from '../src/components/drawer/Drawer';
import { NotificationService } from '../src/services/NotificationService';
import { isIsraelCoords } from '../src/utils/isIsraelCoords';
import * as Updates from 'expo-updates';

if (I18nManager.isRTL) {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

export default function RootLayout() {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const settingsReady = useSettingsStore((s) => s.settingsReady);
  const [forceReady, setForceReady] = useState(false);
  const system = useColorScheme();
  const scheme = darkMode === 'system' ? (system ?? 'light') : darkMode;

  // Heebo — approved UI font (src/constants/typography.ts FONT_FAMILY).
  // A load failure must NEVER permanently block render: fontsReady treats
  // fontError the same as a successful load (falls back to the system font).
  const [fontsLoaded, fontError] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    async function init() {
      console.log('[App] OTA bundle updateId:', Updates.updateId ?? 'embedded');
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
      await NotificationService.ensureRecurringReminders();
      const { omerRemindersEnabled, omerReminderTime } = useSettingsStore.getState();
      await NotificationService.ensureOmerReminders(omerRemindersEnabled, omerReminderTime);
      const { candleLightingRemindersEnabled, candleLightingLeadMinutes } =
        useSettingsStore.getState();
      const { latitude, longitude, placeName } = useLocationStore.getState();
      await NotificationService.ensureCandleLightingReminders(
        candleLightingRemindersEnabled,
        candleLightingLeadMinutes,
        candleLightingRemindersEnabled
          ? { lat: latitude, lng: longitude, il: isIsraelCoords(latitude, longitude), placeName }
          : null,
      );
    }
    init().catch(console.error);
  }, []);

  // Safety fallback: never block the UI forever. If loadFromStorage hangs
  // (a promise that never settles, so the finally guard cannot fire), force
  // render after 3s so the app can never freeze on a blank white screen.
  useEffect(() => {
    const t = setTimeout(() => setForceReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Yearly renewal prompt — runs AT MOST ONCE per launch, after settings load.
  const renewalRanRef = useRef(false);
  useEffect(() => {
    if (!settingsReady) return;
    if (renewalRanRef.current) return;
    renewalRanRef.current = true;

    async function runRenewalPrompts() {
      const due = await StorageService.getEventsNeedingRenewal();
      if (due.length === 0) return;

      function showAt(index: number) {
        if (index >= due.length) return;
        const event = due[index];
        Alert.alert(
          'תזכורת שנתית',
          `האם להמשיך לקבל תזכורת עבור ${event.summary}?`,
          [
            {
              text: 'המשך',
              onPress: async () => {
                await StorageService.confirmRenewal(event.id);
                showAt(index + 1);
              },
            },
            {
              text: 'אל תשאל שוב',
              style: 'destructive',
              onPress: async () => {
                await StorageService.suppressRenewal(event.id);
                showAt(index + 1);
              },
            },
          ],
          { cancelable: true, onDismiss: () => showAt(index + 1) },
        );
      }

      showAt(0);
    }

    runRenewalPrompts().catch(console.error);
  }, [settingsReady]);

  // All hooks are declared above this point — safe to early-return here.
  // Render nothing until persisted settings AND fonts are ready, so the UI
  // never flashes the default theme/system font before the stored
  // preference / Heebo is applied. forceReady (3s fallback, below) still
  // overrides both halves so a hung settings load OR a hung font load can
  // never freeze the UI on a blank screen.
  if (!forceReady && !(settingsReady && fontsReady)) return null;

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
