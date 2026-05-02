import { useMemo } from 'react';

export interface CalendarNote {
  id: string;
  summary: string;
}

export function useNotes(date: Date | null) {
  return useMemo(() => ({ notes: [] as CalendarNote[] }), [date?.getTime()]);
}
