import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StorageService } from '../src/services/StorageService';
import { useSettingsStore } from '../src/providers/SettingsProvider';
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { dateService } from '../src/services/DateService';

export default function RootLayout() {
  useEffect(() => {
    StorageService.init();
    useSettingsStore.getState().loadFromStorage();
    const diaspora = useSettingsStore.getState().diaspora;
    dateService.setDiaspora(diaspora);
    useCalendarStore.getState().refreshMonth();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
