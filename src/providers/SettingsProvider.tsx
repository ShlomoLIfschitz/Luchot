// src/providers/SettingsProvider.tsx
// Phase 3.7a-2 — removed 5 dead fields from v1:
//   showHebrew, showGregorian (v2 has separate tabs instead)
//   diagonalDirection (diagonal DayCell layout removed in v2)
//   rememberLastView, defaultViewMode (v2 has fixed tab navigation)
// Also removed: DiagonalDirection + ViewMode type exports, and the
// toggleHebrew / toggleGregorian / setDiagonalDirection actions.
//
// Kept:
//   hebrewOnTop + toggleHebrewOnTop (drives universal header — Phase 3.7c)
//   defaultCalendarType + setDefaultCalendarType (usage TBD in 3.7b/c)

import { create } from 'zustand';
import { StorageService } from '../services/StorageService';

export type ZmanimMethod = 'GRA' | 'MGA' | 'RABBANUT';
export type DefaultCalendarType = 'hebrew' | 'gregorian';
export type FirstDayOfWeek = 0 | 1; // 0=Sunday, 1=Monday

interface SettingsState {
  // Display
  hebrewOnTop: boolean;
  darkMode: 'system' | 'light' | 'dark';
  firstDayOfWeek: FirstDayOfWeek;

  // Calendar
  defaultCalendarType: DefaultCalendarType;
  diaspora: boolean;

  // Zmanim
  zmanimMethod: ZmanimMethod;
  use24hTime: boolean;

  // Notifications
  omerReminders: boolean;

  // Actions
  toggleHebrewOnTop: () => void;
  setDarkMode: (m: 'system' | 'light' | 'dark') => void;
  setZmanimMethod: (m: ZmanimMethod) => void;
  setFirstDayOfWeek: (d: FirstDayOfWeek) => void;
  setDefaultCalendarType: (t: DefaultCalendarType) => void;
  setDiaspora: (v: boolean) => void;
  loadFromStorage: () => Promise<void>;
  save: (key: string, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hebrewOnTop: true,
  darkMode: 'system',
  firstDayOfWeek: 0,
  defaultCalendarType: 'hebrew',
  diaspora: false,
  zmanimMethod: 'GRA',
  use24hTime: true,
  omerReminders: false,

  toggleHebrewOnTop: () => { const v = !get().hebrewOnTop; set({ hebrewOnTop: v }); get().save('hebrewOnTop', String(v)); },
  setDarkMode:          (m) => { set({ darkMode: m });          get().save('darkMode', m); },
  setZmanimMethod:      (m) => { set({ zmanimMethod: m });      get().save('zmanimMethod', m); },
  setFirstDayOfWeek:    (d) => { set({ firstDayOfWeek: d });    get().save('firstDayOfWeek', String(d)); },
  setDefaultCalendarType: (t) => { set({ defaultCalendarType: t }); get().save('defaultCalendarType', t); },
  setDiaspora:          (v) => { set({ diaspora: v });           get().save('diaspora', String(v)); },

  loadFromStorage: async () => {
    const [
      hebrewOnTop, darkMode, firstDayOfWeek, defaultCalendarType,
      diaspora, zmanimMethod, omerReminders, use24hTime,
    ] = await Promise.all([
      StorageService.getPref('hebrewOnTop',          'true'),
      StorageService.getPref('darkMode',             'system'),
      StorageService.getPref('firstDayOfWeek',       '0'),
      StorageService.getPref('defaultCalendarType',  'hebrew'),
      StorageService.getPref('diaspora',             'false'),
      StorageService.getPref('zmanimMethod',         'GRA'),
      StorageService.getPref('omerReminders',        'false'),
      StorageService.getPref('use24hTime',           'true'),
    ]);
    set({
      hebrewOnTop:         hebrewOnTop === 'true',
      darkMode:            darkMode as 'system' | 'light' | 'dark',
      firstDayOfWeek:      Number(firstDayOfWeek) as FirstDayOfWeek,
      defaultCalendarType: defaultCalendarType as DefaultCalendarType,
      diaspora:            diaspora === 'true',
      zmanimMethod:        zmanimMethod as ZmanimMethod,
      omerReminders:       omerReminders === 'true',
      use24hTime:          use24hTime === 'true',
    });
  },

  save: (key, value) => StorageService.setPref(key, value),
}));
