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
  loadFromStorage: () => Promise<void>;
  save: (key: string, value: string) => Promise<void>;
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

  toggleHebrew:      () => { const v = !get().showHebrew;    set({ showHebrew: v });    get().save('showHebrew', String(v)); },
  toggleGregorian:   () => { const v = !get().showGregorian; set({ showGregorian: v }); get().save('showGregorian', String(v)); },
  toggleHebrewOnTop: () => { const v = !get().hebrewOnTop;   set({ hebrewOnTop: v });   get().save('hebrewOnTop', String(v)); },
  setDiagonalDirection: (d) => { set({ diagonalDirection: d }); get().save('diagonalDirection', d); },
  setDarkMode:          (m) => { set({ darkMode: m });          get().save('darkMode', m); },
  setZmanimMethod:      (m) => { set({ zmanimMethod: m });      get().save('zmanimMethod', m); },
  setFirstDayOfWeek:    (d) => { set({ firstDayOfWeek: d });    get().save('firstDayOfWeek', String(d)); },
  setDefaultCalendarType: (t) => { set({ defaultCalendarType: t }); get().save('defaultCalendarType', t); },
  setDiaspora:          (v) => { set({ diaspora: v });           get().save('diaspora', String(v)); },

  loadFromStorage: async () => {
    const [
      showHebrew, showGregorian, hebrewOnTop, diagonalDirection,
      darkMode, firstDayOfWeek, defaultCalendarType, diaspora,
      zmanimMethod, omerReminders, use24hTime,
    ] = await Promise.all([
      StorageService.getPref('showHebrew',          'true'),
      StorageService.getPref('showGregorian',        'true'),
      StorageService.getPref('hebrewOnTop',          'true'),
      StorageService.getPref('diagonalDirection',    'tl-br'),
      StorageService.getPref('darkMode',             'system'),
      StorageService.getPref('firstDayOfWeek',       '0'),
      StorageService.getPref('defaultCalendarType',  'hebrew'),
      StorageService.getPref('diaspora',             'false'),
      StorageService.getPref('zmanimMethod',         'GRA'),
      StorageService.getPref('omerReminders',        'false'),
      StorageService.getPref('use24hTime',           'true'),
    ]);
    set({
      showHebrew:          showHebrew === 'true',
      showGregorian:       showGregorian === 'true',
      hebrewOnTop:         hebrewOnTop === 'true',
      diagonalDirection:   diagonalDirection as DiagonalDirection,
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
