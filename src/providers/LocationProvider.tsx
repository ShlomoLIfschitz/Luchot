import { create } from 'zustand';
import { DEFAULT_LAT, DEFAULT_LNG } from '../constants/config';

interface LocationState {
  latitude: number;
  longitude: number;
  setLocation: (lat: number, lng: number) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: DEFAULT_LAT,
  longitude: DEFAULT_LNG,
  setLocation: (latitude, longitude) => set({ latitude, longitude }),
}));
