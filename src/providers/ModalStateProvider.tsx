// src/providers/ModalStateProvider.tsx
// Global "a state-holding modal is open" flag. Tiny zustand store, modeled
// on DrawerProvider's pattern. No persistence — must always start false on
// a fresh launch (a value frozen from a previous session could otherwise
// wedge this permanently true).
//
// Purpose: `useOtaUpdates` (src/hooks/useOtaUpdates.ts) needs to know
// whether it is safe to call `Updates.reloadAsync()` — a reload discards
// all in-memory JS state, which would silently destroy an unsaved draft in
// `NoteEditor` (title, date, recurrence, reminder — held in local component
// state, not in a store). `NoteEditor` sets this flag true while open and
// false when it closes (see its `visible`-prop effect); `useOtaUpdates`
// only reloads while it reads false.
//
// Deliberately NOT a general modal manager: one boolean is all this needs.
// If more than one state-holding modal is added later, prefer a shared
// counter (`openCount`, incremented/decremented) over duplicating this
// store, so two modals open at once can't have the second one's close
// prematurely mark everything safe.

import { create } from 'zustand';

interface ModalStateState {
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

export const useModalStateStore = create<ModalStateState>((set) => ({
  isModalOpen: false,
  setModalOpen: (open) => set({ isModalOpen: open }),
}));
