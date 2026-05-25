import { useColorScheme } from 'react-native';
import { Colors } from '../constants/colors';
import { useSettingsStore } from '../providers/SettingsProvider';

export type ThemeColors = typeof Colors.light;

export function useThemeColors(): ThemeColors {
  const system = useColorScheme();
  const darkMode = useSettingsStore((s) => s.darkMode);
  const scheme = darkMode === 'system' ? (system ?? 'light') : darkMode;
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
