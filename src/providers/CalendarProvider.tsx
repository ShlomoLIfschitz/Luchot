// src/providers/CalendarProvider.tsx

import { create } from 'zustand';
import { AppState, type AppStateStatus } from 'react-native';
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
  refreshToday: () => void;
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

  refreshToday: () => set({ today: new Date() }),
}));

// ── Task 5: keep `today` from going stale ──────────────────────────────────
// `today` was previously set once at store creation and never refreshed —
// MonthGrid/WeekGrid use it for the "today" highlight, so leaving the app
// open across midnight left the highlight on yesterday until a full
// restart. Two mechanisms, both set up exactly once here (this module is
// evaluated once per process — the module cache guarantees no duplicate
// listeners/timers):
//   1. AppState 'change' -> 'active': catches the common case (app was
//      backgrounded overnight, user reopens it the next day).
//   2. A self-rescheduling setTimeout firing just after local midnight:
//      catches the rarer case of the app staying foregrounded, unused,
//      across midnight (no background/foreground transition to hook into).
// Both paths funnel through the same day-changed check before calling
// refreshToday(), so this can never fire more than once per actual day
// change — no re-render storm.
function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

let midnightTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleMidnightRefresh(): void {
  if (midnightTimer) clearTimeout(midnightTimer);
  const now = new Date();
  // A few seconds past local midnight, to be safely on the new day's side.
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0);
  midnightTimer = setTimeout(() => {
    useCalendarStore.getState().refreshToday();
    scheduleMidnightRefresh(); // reschedule for the following midnight
  }, nextMidnight.getTime() - now.getTime());
}
scheduleMidnightRefresh();

AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state !== 'active') return;
  const { today } = useCalendarStore.getState();
  if (isSameLocalDay(today, new Date())) return;
  useCalendarStore.getState().refreshToday();
  scheduleMidnightRefresh(); // resync the midnight timer to the (now current) day
});
