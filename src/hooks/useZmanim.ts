import { useMemo } from 'react';
import { useLocationStore } from '../providers/LocationProvider';
import { getZmanim } from '../services/ZmanimService';
import { useSettingsStore } from '../providers/SettingsProvider';

export function useZmanim(date: Date) {
  const latitude = useLocationStore((s) => s.latitude);
  const longitude = useLocationStore((s) => s.longitude);
  const method = useSettingsStore((s) => s.zmanimMethod);
  return useMemo(
    () => getZmanim(date, latitude, longitude, 0, method),
    [date.getTime(), latitude, longitude, method]
  );
}
