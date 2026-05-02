// src/providers/SettingsProvider.tsx

import { create } from 'zustand';
import { StorageService } from '../services/StorageService';

export type ZmanimMethod = 'GRA' | 'MGA' | 'RABBANUT';
export type DiagonalDirection = 'tl-br' | 'tr-bl';
export type DefaultCalendarType = 'hebrew' | 'gregorian';
export type ViewMode = 'month' | 'week' | 'day';
export type FirstDayOfWeek = 0 | 1; // 0=Sunday, 1=Monday

interface SettingsState {
  // Display
  showHebrew: boolean;
  showGregorian: boolean;
  hebrewOnTop: boolean;
  diagonalDirection: DiagonalDirection;
  darkMode: 'system' | 'light' | 'dark';
  firstDayOfWeek: FirstDayOfWeek;

  // Calendar
  defaultCalendarType: DefaultCalendarType;
  rememberLastView: boolean;
  defaultViewMode: ViewMode;
  diaspora: boolean;

  // Zmanim
  zmanimMethod: ZmanimMethod;
  use24hTime: boolean;

  // Notifications
  omerReminders: boolean;

  // Actions
  toggleHebrew: () => void;
  toggleGregorian: () => void;
  toggleHebrewOnTop: () => void;
  setDiagonalDirection: (d: DiagonalDirection) => void;
  setDarkMode: (m: 'system' | 'light' | 'dark') => void;
  setZmanimMethod: (m: ZmanimMethod) => void;
  setFirstDayOfWeek: (d: FirstDayOfWeek) => void;
  setDefaultCalendarType: (t: DefaultCalendarType) => void;
  setDiaspora: (v: boolean) => void;
  loadFromStorage: () => void;
  save: (key: string, value: string) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  showHebrew: true,
  showGregorian: true,
  hebrewOnTop: true,
  diagonalDirection: 'tl-br',
  darkMode: 'system',
  firstDayOfWeek: 0,
  defaultCalendarType: 'hebrew',
  rememberLastView: false,
  defaultViewMode: 'month',
  diaspora: false,
  zmanimMethod: 'GRA',
  use24hTime: true,
  omerReminders: false,

  toggleHebrew: () => { const v = !get().showHebrew; set({ showHebrew: v }); get().save('showHebrew', String(v)); },
  toggleGregorian: () => { const v = !get().showGregorian; set({ showGregorian: v }); get().save('showGregorian', String(v)); },
  toggleHebrewOnTop: () => { const v = !get().hebrewOnTop; set({ hebrewOnTop: v }); get().save('hebrewOnTop', String(v)); },
  setDiagonalDirection: (d) => { set({ diagonalDirection: d }); get().save('diagonalDirection', d); },
  setDarkMode: (m) => { set({ darkMode: m }); get().save('darkMode', m); },
  setZmanimMethod: (m) => { set({ zmanimMethod: m }); get().save('zmanimMethod', m); },
  setFirstDayOfWeek: (d) => { set({ firstDayOfWeek: d }); get().save('firstDayOfWeek', String(d)); },
  setDefaultCalendarType: (t) => { set({ defaultCalendarType: t }); get().save('defaultCalendarType', t); },
  setDiaspora: (v) => { set({ diaspora: v }); get().save('diaspora', String(v)); },

  loadFromStorage: () => {
    set({
      showHebrew: StorageService.getPref('showHebrew', 'true') === 'true',
      showGregorian: StorageService.getPref('showGregorian', 'true') === 'true',
      hebrewOnTop: StorageService.getPref('hebrewOnTop', 'true') === 'true',
      diagonalDirection: StorageService.getPref('diagonalDirection', 'tl-br') as DiagonalDirection,
      darkMode: StorageService.getPref('darkMode', 'system') as any,
      firstDayOfWeek: Number(StorageService.getPref('firstDayOfWeek', '0')) as FirstDayOfWeek,
      defaultCalendarType: StorageService.getPref('defaultCalendarType', 'hebrew') as DefaultCalendarType,
      diaspora: StorageService.getPref('diaspora', 'false') === 'true',
      zmanimMethod: StorageService.getPref('zmanimMethod', 'GRA') as ZmanimMethod,
      omerReminders: StorageService.getPref('omerReminders', 'false') === 'true',
    });
  },

  save: (key, value) => StorageService.setPref(key, value),
}));
