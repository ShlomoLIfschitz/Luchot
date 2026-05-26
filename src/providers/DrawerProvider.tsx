// src/providers/DrawerProvider.tsx
// Global drawer open/close state. Tiny zustand store, modeled on
// CalendarProvider/SettingsProvider/LocationProvider patterns.
// No persistence — drawer state should not survive app restarts.

import { create } from 'zustand';

interface DrawerState {
  isOpen: boolean;
  open:   () => void;
  close:  () => void;
  toggle: () => void;
}

export const useDrawerStore = create<DrawerState>((set, get) => ({
  isOpen: false,
  open:   () => set({ isOpen: true }),
  close:  () => set({ isOpen: false }),
  toggle: () => set({ isOpen: !get().isOpen }),
}));
