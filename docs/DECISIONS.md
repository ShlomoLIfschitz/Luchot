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

## Google Calendar interoperability is one-way via .ics files (not live sync)
- Date: 2026-05-28
- Context: User wants Luchot events to reach Google Calendar and vice versa. True
  two-way sync requires a backend, OAuth, and network calls — which would break the
  "offline-first, no backend ever" decision.
- Choice: One-way interoperability through .ics files, both directions. EXPORT writes
  an .ics file and hands it to the Android share sheet (user picks Google Calendar /
  Drive / email as the destination). IMPORT reads an .ics file the user opens with or
  selects in Luchot, and adds the events to local SQLite. No network calls, no OAuth,
  no background sync — Google is merely a share target / file source.
- Alternatives considered: Two-way live sync (backend + OAuth) — rejected; breaks
  offline-first, the core product identity. No interoperability at all — rejected;
  user explicitly wants it.
- Implications: This does NOT violate "no backend ever" — .ics is a file, not a
  network call. The EventSchema is already Google-Calendar-compatible, so .ics
  mapping is direct. Future two-way sync remains possible (add OAuth atop the existing
  schema) but is a separate, explicitly-reopened decision if ever pursued.

## Notifications and export are user-triggered, never autonomous background actions
- Date: 2026-05-28
- Context: A "remind me to export to Google" capability is wanted, but anything the
  app does on its own on a timer (auto-export, background sync) would erode the
  offline-first / no-background-network posture.
- Choice: The app may REMIND the user to act (a local notification: "you have N new
  events since last export — export now?"), but the user always performs the actual
  export/import manually. The app reminds; the user executes. No data leaves the
  device, and no file is written or shared, without an explicit user action.
- Alternatives considered: Auto-export on a schedule — rejected; that's background
  autonomous behavior. No reminders at all — rejected; loses the "don't forget to
  sync" value the user wanted, which is cheap to add atop NotificationService.
- Implications: The reminder-to-export feature rides on the same NotificationService
  built for Omer/candle-lighting/event reminders. All notifications are local
  (expo-notifications scheduled locally), never push, never server-driven.

## NotificationRecord schema includes renewal and recurrence fields (schema-only)
- Date: 2026-05-28
- Context: NotificationRecordSchema was being defined in Phase 5 Wave 1. The
  user locked additional fields before the schema was finalized, to avoid a
  future SQLite migration when renewal logic is eventually built.
- Choice: `NotificationRecordSchema` includes `recurrence` (none/daily/weekly,
  default 'none'), `renewalPolicy` (never/annual/september, default 'never'),
  `lastConfirmedAt` (optional date), and `color` (optional token key from
  DESIGN.md tag colors). These fields are SCHEMA-ONLY — no renewal logic is
  implemented in Wave 1.
- Alternatives considered: Add fields when logic is built — rejected; would
  require a SQLite migration on real user data, which is high-risk.
- Implications: When the renewal feature is built, it must respect this schema
  contract. Renewal behavior: 'annual' fires one year after `createdAt` or
  `lastConfirmedAt`; 'september' fires Sept 1 annually (school-year reset).
  Both have a ~30-day grace period (recently-confirmed notifications not
  re-prompted). Ignored prompts do NOT auto-cancel the notification. The
  `color` field stores the token KEY (e.g. 'tagHoliday'), not a raw hex —
  the UI layer resolves keys via `src/constants/colors.ts`.

## All-day reminder fire time = 09:00 local on event day minus reminderMinutes
- Date: 2026-05-28
- Context: Wave 2 added per-event reminders. Most Luchot events are all-day
  (no start.dateTime, only start.date — birthdays, yahrzeits, anniversaries).
  A concrete fire-time policy was required for all-day events, since
  "minutes before" has no natural anchor without a clock time.
- Choice: Fire at 09:00 local time on the event day, minus reminderMinutes.
  "יום לפני" (1440 min) → 09:00 the previous day. Timed events (start.dateTime
  present) use dateTime - reminderMinutes as usual. Both paths implemented in
  useNotes.saveNote and NotificationService.ensureAnnualReminders.
- Alternatives considered: midnight of event day (too early, disruptive);
  user-configurable default time (deferred — adds a persisted setting, not
  needed for Wave 2). 09:00 is a conventional morning alert time.
- Implications: All future waves that schedule reminders (Omer, candle-lighting,
  .ics export reminders) MUST use this policy for all-day events. Do not invent
  a different hour per-feature.

## Omer reminders: fixed user-chosen fire time, settings-only, no DB row

- Date: 2026-05-30
- Context: Wave 3a added daily Sefirat HaOmer reminders. Unlike Wave 2 event
  reminders (each backed by an event row in SQLite with a NotificationRecord-style
  ID), the Omer is a computed calendar entity — it exists automatically every spring
  via DateService/hebcal, with no DB row to attach a reminder to.
- Choice: The ONLY persisted state for Omer reminders is two user settings:
  `omerRemindersEnabled` (boolean, default false) and `omerReminderTime` (string
  "HH:mm", default "21:00"). No NotificationRecord is written. No DB schema change.
  Fire time is fixed (user-chosen), NOT tied to tzeit or location — deliberately
  location-independent. Scheduling uses the existing sweep-on-init model with a
  rolling 10-day window and stable id namespace `omer-{YYYYMMDD}`.
- Alternatives considered: Tzeit-based fire time (requires ZmanimService + location
  per day, architecturally heavier — deferred to Wave 3b candle-lighting which needs
  it anyway); writing a NotificationRecord row (no natural entity to attach it to —
  adds schema complexity for no benefit).
- Implications: This establishes the pattern for all computed-entity reminders
  (non-DB, settings-only, sweep-on-init). Wave 3b candle-lighting notifications are
  explicitly OUT of scope here and will use a different (location/astronomical) fire
  time approach. Any future computed-entity reminder should follow this pattern unless
  the architect explicitly reopens it.

## Sweep-on-init scheduling model for recurring reminders
- Date: 2026-05-28
- Context: Recurring events (birthday/yahrzeit) need annual reminders. Two
  approaches considered: (a) on-delivery rescheduling (app listens for
  notification delivery and immediately schedules the next year), or (b)
  sweep on each app startup that checks and fills any scheduling gap.
- Choice: Sweep-on-init. On each app launch, NotificationService.ensureAnnualReminders()
  fetches all events with reminder_minutes set and recurrenceType yearly_*,
  computes the next future occurrence, and schedules it if not already in the
  scheduled set. No on-delivery rescheduling is used.
- Alternatives considered: On-delivery rescheduling — rejected; requires a
  background notification handler that runs even when the app is closed, which
  is fragile on Android and contradicts the "user-triggered" principle. Calendar
  triggers (platform repeating) — rejected; expo-notifications annual repeat
  support is inconsistent cross-platform.
- Implications: The sweep must remain cheap (fetch + diff). A single event.id
  can appear in the scheduled set at most once — saveNote never schedules
  recurring events (it only persists reminder_minutes); ensureAnnualReminders
  is the sole scheduler for yearly_* events. This prevents double-schedule and
  stale-date collisions.
