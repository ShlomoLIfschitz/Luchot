// src/providers/CalendarProvider.tsx

import { create } from 'zustand';
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

  setViewMode: (mode: ViewMode) => void;
  setSelectedDate: (date: Date) => void;
  navigateMonth: (direction: 1 | -1) => void;
  setDiaspora: (value: boolean) => void;
  refreshMonth: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  viewMode: 'month',
  selectedDate: new Date(),
  today: new Date(),
  currentMonth: new Date().getMonth() + 1,
  currentYear: new Date().getFullYear(),
  monthData: [],
  diaspora: false,

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

  setDiaspora: (value) => {
    dateService.setDiaspora(value);
    get().refreshMonth();
  },

  refreshMonth: () => {
    const { currentMonth, currentYear } = get();
    const monthData = dateService.getMonthData(currentYear, currentMonth);
    set({ monthData });
  },
}));
