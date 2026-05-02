import { useZmanim } from './useZmanim';
import { isAfterSunset } from '../services/ZmanimService';

/** Sunset flip hint for Hebrew date display (roadmap: extend with full logic). */
export function useSunsetFlip(forDate: Date) {
  const zmanim = useZmanim(forDate);
  return zmanim ? isAfterSunset(zmanim) : false;
}
