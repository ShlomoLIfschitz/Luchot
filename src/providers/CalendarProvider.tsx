// src/providers/CalendarProvider.tsx

import { create } from 'zustand';
import { HDate } from '@hebcal/core';
import { dateService, DayData } from '../services/DateService';

type ViewMode = 'month' | 'week' | 'day';

interface CalendarState {
  viewMode: ViewMode;
  selectedDate: Date;
  today: Date;
  currentMonth: number;
  currentYear: number;
  monthData: DayData[];
  diaspora: boolean;
  notesVersion: number;
  currentHebrewYear: number;
  currentHebrewMonth: number;
  hebrewMonthData: DayData[];

  setViewMode: (mode: ViewMode) => void;
  setSelectedDate: (date: Date) => void;
  navigateMonth: (direction: 1 | -1) => void;
  navigateToMonth: (year: number, month: number) => void;
  setDiaspora: (value: boolean) => void;
  refreshMonth: () => void;
  incrementNotesVersion: () => void;
  navigateHebrewMonth: (direction: 1 | -1) => void;
  refreshHebrewMonth: () => void;
  navigateToHebrewMonth: (hYear: number, hMonth: number) => void;
}

// Compute today's Hebrew date once at store creation
const _todayHD = new HDate();

export const useCalendarStore = create<CalendarState>((set, get) => ({
  viewMode: 'month',
  selectedDate: new Date(),
  today: new Date(),
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  monthData: [],
  diaspora: false,
  notesVersion: 0,
  currentHebrewYear: _todayHD.getFullYear(),
  currentHebrewMonth: _todayHD.getMonth(),
  hebrewMonthData: [],

  setViewMode: (mode) => set({ viewMode: mode }),

  setSelectedDate: (date) => set({ selectedDate: date }),

  navigateMonth: (direction) => {
    const { currentMonth, currentYear } = get();
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1)  { newMonth = 12; newYear--; }
    const monthData = dateService.getMonthData(newYear, newMonth);
    set({ currentMonth: newMonth, currentYear: newYear, monthData });
  },

  navigateToMonth: (year, month) => {
    const monthData = dateService.getMonthData(year, month);
    set({ currentYear: year, currentMonth: month, monthData });
  },

  setDiaspora: (value) => {
    dateService.setDiaspora(value);
    get().refreshMonth();
  },

  refreshMonth: () => {
    const { currentMonth, currentYear } = get();
    const monthData = dateService.getMonthData(currentYear, currentMonth);
    set({ monthData });
  },

  incrementNotesVersion: () => set((s) => ({ notesVersion: s.notesVersion + 1 })),

  navigateHebrewMonth: (direction) => {
    const { currentHebrewMonth, currentHebrewYear } = get();
    // Anchor to day 15 — HDate.add(±1,'months') from day 1 can slip into the prior month boundary; day 15 is safely inside every Hebrew month in both directions.
    const stepped = new HDate(15, currentHebrewMonth, currentHebrewYear).add(direction, 'months');
    const newMonth = stepped.getMonth();
    const newYear = stepped.getFullYear();
    const hebrewMonthData = dateService.getHebrewMonthData(newYear, newMonth);
    set({ currentHebrewMonth: newMonth, currentHebrewYear: newYear, hebrewMonthData });
  },

  refreshHebrewMonth: () => {
    const { currentHebrewMonth, currentHebrewYear } = get();
    const hebrewMonthData = dateService.getHebrewMonthData(currentHebrewYear, currentHebrewMonth);
    set({ hebrewMonthData });
  },

  navigateToHebrewMonth: (hYear, hMonth) => {
    // Anchor to day 15 — avoids month-boundary slip when converting to Gregorian.
    const anchor = new HDate(15, hMonth, hYear);
    set({ currentHebrewYear: hYear, currentHebrewMonth: hMonth });
    get().refreshHebrewMonth();          // reads updated cursor via get()
    get().setSelectedDate(anchor.greg()); // sync Gregorian selectedDate
  },
}));
