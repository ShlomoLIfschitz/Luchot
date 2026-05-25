import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StorageService } from '../src/services/StorageService';
import { useSettingsStore } from '../src/providers/SettingsProvider';
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { dateService } from '../src/services/DateService';

export default function RootLayout() {
  const darkMode = useSettingsStore((s) => s.darkMode);
  const system = useColorScheme();
  const scheme = darkMode === 'system' ? (system ?? 'light') : darkMode;

  useEffect(() => {
    async function init() {
      await StorageService.init();
      await useSettingsStore.getState().loadFromStorage();
      const diaspora = useSettingsStore.getState().diaspora;
      dateService.setDiaspora(diaspora);
      useCalendarStore.getState().refreshMonth();
    }
    init().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
