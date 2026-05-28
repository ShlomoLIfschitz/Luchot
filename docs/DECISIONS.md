# DECISIONS.md — Locked Architectural Decisions

> These decisions are LOCKED. Do not revisit unless the user explicitly reopens one.
> Each entry: context, choice, alternatives, implications.

## Offline-first, no backend ever
- Date: (pre-MVP, foundational)
- Context: Luchot is a personal Hebrew/Gregorian calendar. Privacy and reliability
  without connectivity are core to the product identity.
- Choice: All data local (SQLite). No backend, no account, no network calls.
- Alternatives considered: Cloud sync / BaaS (Firebase/Supabase) — rejected; adds
  complexity, privacy surface, and contradicts the product vision.
- Implications: No multi-device sync. Uninstall = data loss (export feature would be
  a separate future decision). Security profile is mobile-local-only.

## EventSchema is Google Calendar API-compatible
- Date: (pre-MVP)
- Context: Notes/events data shape needs a durable, interoperable structure.
- Choice: src/schemas/EventSchema.ts mirrors the Google Calendar API event shape.
- Alternatives considered: Custom minimal schema — rejected; would close the door on
  future import/export interoperability.
- Implications: Do not change EventSchema without architect approval. Future calendar
  import/export has a ready-made target shape.

## 4 bottom tabs + hamburger drawer
- Date: (v2 redesign)
- Context: Navigation model for the redesigned app.
- Choice: 4 bottom tabs (Hebrew calendar, Gregorian, Day, Zmanim) + hamburger drawer
  for settings and secondary screens.
- Alternatives considered: Drawer-only, or 5+ tabs — rejected for clarity and thumb reach.
- Implications: New top-level screens go in the drawer, not as new tabs, unless the
  user reopens this.

## @hebcal/core pinned to v5.x
- Date: Phase 4.x
- Context: hebcal v6 introduces breaking changes; learning-schedule expansion depends
  on it.
- Choice: Pin @hebcal/core to v5.x for now. v6 upgrade deferred to Phase 5, gated by
  the learning-expansion work.
- Alternatives considered: Upgrade to v6 now — rejected; breaking changes with no
  immediate payoff pre-APK.
- Implications: Learning expansion (Phase 5) is the trigger for the v6 upgrade.

## flexDirection 'row-reverse' for Hebrew RTL (not auto-flip, not CSS transform)
- Date: Phase 4.7
- Context: All six bugs fixed in Phase 4.7 were RTL/layout-related. Relying on
  flexDirection 'row' auto-flip produced inconsistent, hard-to-trace layout bugs.
- Choice: Use flexDirection 'row-reverse' explicitly for Hebrew RTL rows. First child
  lands on the right. Fix wrong icon/text order by swapping JSX child order.
- Alternatives considered: 'row' auto-flip (the old approach) — rejected, caused the
  4.7 cluster; CSS transforms — rejected, not idiomatic in RN and fragile.
- Implications: This supersedes older CLAUDE.md guidance. Drawer slides from left
  (anchor left:0, translateX -drawerWidth). Add explicit gap between flex:1 Hebrew
  labels and adjacent values. Prefer explicit dimensions over Yoga inference.

## expo-sqlite/legacy import path
- Date: Phase 4.7
- Context: First standalone APK crashed; investigation showed the expo-sqlite v14 API
  (openDatabaseAsync/openDatabaseSync) routes through a native module not present in
  Expo Go.
- Choice: Import from 'expo-sqlite/legacy' (classic v13 path: openDatabase +
  transactionAsync/executeSqlAsync).
- Alternatives considered: v14 async API — rejected; crashes in Expo Go. Upgrading SDK
  to make v14 work — rejected; out of scope, heavier risk.
- Implications: StorageService uses the legacy API. A future SDK upgrade (Phase 5+)
  may revisit this.
