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
- **Superseded 2026-11-02** by "Expo SDK 58 upgrade" below: `expo-sqlite/legacy` was
  removed in SDK 52, and the async API now ships in Expo Go.

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

## Custom Drawer (Drawer.tsx): three implementation constraints

- Date: 2026-06-01
- Context: APK versionCode 5 (first standalone build) revealed three bugs
  masked by Expo Go: drawer opened on entry (drawerWidth=0 race), left/right
  alternation on repeated open/close (raw translationX used as absolute
  position), and backdrop tap-to-dismiss unreliable (setState+setTimeout
  timing differed in standalone vs Expo Go JS batching).
- Choice: Three constraints now locked in Drawer.tsx:
  (1) Render deferred until screenWidth > 0 (return null guard); translateX
  shared value initialized to -1000 sentinel when width not yet resolved.
  (2) Swipe gesture is delta-based: gestureStartX shared value captures
  translateX.value at onStart; onUpdate applies gestureStartX + e.translationX
  as the new position (not raw e.translationX from zero).
  (3) Backdrop pointer-events controlled via Reanimated useAnimatedProps keyed
  on backdropOpacity.value — not React state + setTimeout. This runs on the
  UI thread in lockstep with the opacity animation.
- Alternatives considered: React state + setTimeout (rejected — unreliable
  on real Android); React ref for gestureStartX (rejected — refs are not
  accessible on the UI thread in Reanimated gesture callbacks, shared values
  are).
- Implications: Any future edit to Drawer.tsx must preserve these three
  constraints. Do not reintroduce state-based pointerEvents gating, raw
  translationX absolute assignment in gesture onUpdate, or unconditional
  render before screenWidth resolves.

## Candle-lighting reminders: computed fire time, not 09:00 all-day policy

- Date: 2026-06-01
- Context: Wave 3b-1 added candle-lighting reminders. The existing "All-day
  reminder fire time = 09:00 local" decision applies only to events without an
  intrinsic clock time (birthdays, yahrzeits). Candle-lighting has an intrinsic
  time (shkia − city offset), so the 09:00 policy does not apply.
- Choice: Candle-lighting notification fire time = candleLightingTime −
  leadMinutes, where candleLightingTime = shkia − cityOffsetMinutes (computed
  directly from ZmanimService.getZmanim().shkia, bypassing the Friday-only
  ZmanimResult.candleLighting field). leadMinutes is user-chosen (5/10/15/30,
  default 15).
- Alternatives considered: 09:00 on erev day (wrong — misses the connection to
  actual shkia time); using ZmanimResult.candleLighting directly (null for
  non-Fridays — cannot be used for Yom Tov eves).
- Implications: Any future zmanim-based reminder (havdalah alert, fast start/end)
  must similarly compute a real timestamp, not use the 09:00 all-day policy.
  The "All-day fire time = 09:00" decision remains valid for non-time-anchored
  events only.

## Reanimated worklet callbacks must never call Zustand store actions directly
- Date: 2026-06-01
- Context: Drawer.tsx onEnd worklet called closeDrawer() (a Zustand action)
  via runOnJS(closeDrawer). On real Android APK this caused a worklet
  serialization crash — Zustand actions are not serializable across the
  Reanimated worklet/JS boundary.
- Choice: Wrap Zustand actions in a plain local JS function before passing
  to runOnJS(). Pattern: const triggerClose = () => closeDrawer(); then
  runOnJS(triggerClose)(). The wrapper is a plain closure, not a store
  method, so Reanimated can serialize it safely.
- Alternatives considered: passing store actions directly (rejected —
  crashes on Android); using refs to hold the action (rejected — refs
  in worklets require extra Reanimated wiring).
- Implications: Any future Reanimated gesture handler or worklet that needs
  to trigger app state changes must use this triggerClose pattern. Do not
  pass Zustand actions, context callbacks, or non-serializable functions
  directly to runOnJS().

## Drawer.tsx: all hook calls must appear before any early return
- Date: 2026-06-01
- Context: The screenWidth===0 guard was implemented as an early return
  before hook declarations, violating React Rules of Hooks and causing
  a runtime error on cold start.
- Choice: All useState, useRef, useSharedValue, useAnimatedStyle,
  useAnimatedProps, and useEffect calls are placed unconditionally at the
  top of the component. The screenWidth guard renders null via a JSX
  conditional at the bottom of the render path (if (!screenWidth) return null
  placed after all hooks), not via an early return before them.
- Alternatives considered: early return before hooks (rejected — Rules of
  Hooks violation, runtime crash).
- Implications: Any future conditional render in Drawer.tsx must follow
  this pattern. This complements the three Drawer constraints locked on the
  same date (see "Custom Drawer (Drawer.tsx): three implementation
  constraints").

## OTA update strategy: expo-updates with EAS Update
- Date: 2026-06-02
- Context: JS-only fixes (bug patches, copy, minor UI tweaks) do not
  require a full EAS build — OTA delivery via expo-updates saves build
  quota and puts fixes in users' hands immediately on next app launch.
- Choice: expo-updates 0.25.28 (SDK 51 compatible) installed. OTA URL
  set to https://u.expo.dev/73dcf406-9cd1-4bec-a83c-cde688268f4a in
  app.json. runtimeVersion policy: sdkVersion (the update bundle must
  match the SDK of the installed build). Channel "preview" mapped to
  the preview EAS build profile; channel "production" mapped to the
  production profile. checkAutomatically: ON_LOAD.
- Workflow: JS-only fixes → eas update --branch preview --message "..."
  (or --branch production for release). Native changes (new packages,
  app.json modifications, new permissions, native config) → full
  eas build --profile preview (or production).
- Alternatives considered: none — this was the planned approach from
  the project roadmap.
- Implications: expo-updates is a native module; it must be present in
  the next EAS build before any OTA push will work. The first OTA-ready
  build is versionCode 7 (next scheduled build). Do not push eas update
  against earlier builds — they lack the native module.

## All SQLite access serialized through a single-flight queue in StorageService
- Date: 2026-06-03
- Context: Settings reverted and events failed to persist on the standalone
  Android build. Root cause: expo-sqlite/legacy deadlocks when two
  transactionAsync calls overlap on the one shared connection. The Promise.all
  in _layout.tsx (settings + location + notification loads), plus useNotes,
  useDatesNotes, and fire-and-forget setPref calls in LocationProvider, all
  issued overlapping transactions. A deadlocked transaction wedges the shared
  connection, blocking every later read and write for the session.
- Choice: StorageService routes every transactionAsync through a module-level
  promise-chain gate (runExclusive). Transactions run strictly one-at-a-time.
  ensureSchema is deduped via a cached promise. Callers may use Promise.all and
  fire-and-forget freely — the data layer guarantees single-flight.
- Alternatives considered: sequential awaits in _layout.tsx only (band-aid —
  leaves useNotes/useDatesNotes broken); per-call transaction merging
  (whack-a-mole); multiple connections / WAL (not reliable in legacy/Expo Go);
  non-legacy API (violates locked expo-sqlite/legacy decision).
- Implications: the readOnly-hang and concurrent-transaction footguns are now
  contained in one place. The 3s forceReady fallback in _layout.tsx stays as a
  safety net. No public StorageService signatures change.

## App locked to LTR base — I18nManager.forceRTL(false) / allowRTL(false)
- Date: 2026-06-03
- Context: Luchot is a Hebrew RTL app, but the layout convention is "use
  flexDirection 'row-reverse' explicitly" (locked, Phase 4.7). That convention
  only produces correct Hebrew layout if the NATIVE layer stays LTR. If the OS /
  React Native forces an RTL base, every 'row-reverse' row double-flips and the
  whole layout inverts — the source of the standalone-APK RTL drift this session.
- Choice: app/_layout.tsx, at module load, guards `if (I18nManager.isRTL)` and
  calls `allowRTL(false)` + `forceRTL(false)`. The app is pinned to an LTR base;
  Hebrew direction is achieved purely through 'row-reverse' + textAlign 'right' +
  JSX child order, never through native RTL.
- Alternatives considered: forceRTL(true) with plain 'row' auto-flip — rejected;
  this is exactly the auto-flip approach that caused the Phase 4.7 bug cluster and
  is incompatible with the locked 'row-reverse' convention.
- Implications: This is the prerequisite for the 'row-reverse' decision — the two
  are a pair. Do not call forceRTL(true) anywhere. New screens follow the
  'row-reverse' convention against an LTR base.

## settingsReady gate: render null until settings load, always release in finally, 3s forceReady fallback
- Date: 2026-06-03
- Context: Persisted settings (theme especially) load asynchronously from SQLite
  at startup. Rendering before they load flashes the default theme; but a load
  that throws (or hangs) must never freeze the app on a blank white screen.
- Choice: SettingsProvider exposes `settingsReady` (false until loadFromStorage
  completes). loadFromStorage always flips it true in a `finally` block, so even
  a thrown error releases the gate. app/_layout.tsx renders `null` until
  `settingsReady`, AND adds a 3-second `forceReady` setTimeout fallback so a
  promise that never settles (a hang) still can't freeze the UI.
- Alternatives considered: render immediately and re-theme on load — rejected
  (theme flash); gate with no timeout — rejected (a hung load freezes the app,
  which is exactly how the SQLite deadlock manifested as a blank screen).
- Implications: Both halves are load-bearing — do not remove the `finally`
  release or the 3s fallback. Note the fallback renders DEFAULT settings, so it
  masks an underlying load failure rather than fixing it; a persistent "settings
  revert" symptom means loadFromStorage is failing/hanging, not that the gate is
  wrong (see the runExclusive single-flight decision).

## Nominatim reverse-geocoding — the single permitted network exception
- Date: 2026-06-04
- Context: `expo-location`'s `reverseGeocodeAsync` is broken on Android SDK 50+
  (upstream NullPointerException in `getCountryCode`), so the GPS buttons in
  NoteEditor and Settings could not turn coordinates into a human-readable
  address. Every other geocoding path is either broken or unavailable offline.
- Choice: A single user-triggered HTTP call to nominatim.openstreetmap.org
  (OpenStreetMap reverse geocoding) is permitted ONLY when the user explicitly
  taps the GPS button in NoteEditor or in Settings. The call fires only on that
  explicit action (never automatic), sends only the coordinates (no other
  personal data), has a 5-second timeout, and fails silently with a graceful
  fallback (empty/editable field in NoteEditor; keep current city in Settings).
  Request carries `User-Agent: Luchot-App/1.0` per Nominatim usage policy.
  This is the ONLY network exception to the offline-first principle.
- Alternatives considered: `reverseGeocodeAsync` (broken upstream — rejected);
  bundling an offline geocoder dataset (heavy, no new deps allowed — rejected);
  staying coordinates-only with no address (rejected — user explicitly wants a
  readable location). A backend/proxy was rejected — it would reopen the
  "no backend ever" decision; a direct user-triggered fetch does not, the same
  way the .ics file decision did not.
- Implications: This narrows, but does not revoke, "offline-first, no backend
  ever" — there is still no backend, no account, no background/automatic network
  traffic, and the app remains fully functional offline (the call degrades to a
  silent no-op). Any FUTURE network call requires its own explicitly-reopened
  decision; this exception is scoped to user-triggered reverse-geocoding only.

## Gal C recurrence/time model (Session C1 data foundation)
- Date: 2026-06-04
- Context: Gal C adds event time + full recurrence (daily/weekly/monthly/yearly)
  + per-occurrence edit/delete. C1 laid the data foundation; C2–C4 build UI,
  time-end-to-end, and notifications on top. Five architectural choices were
  locked by the Architect and are now implemented.
- Choices:
  1. **Time storage reuses existing `start_datetime`/`end_datetime`** (ISO 8601,
     Google-Calendar `dateTime` vs `date` convention). NO `HH:MM` columns were
     added — the all-day-vs-timed distinction already exists in the schema.
  2. **Orthogonal recurrence model.** `recurrence_type ∈ {none,daily,weekly,
     monthly,yearly}` + a SEPARATE `recurrence_calendar ∈ {hebrew,gregorian}`
     (only meaningful for monthly/yearly; daily/weekly are always Gregorian).
     This REPLACES the old compound enum (`yearly_hebrew`/`yearly_gregorian`/
     `monthly_hebrew`/`monthly_gregorian`), which the v5 migration remaps in
     place. EventSchema.ts `RecurrenceType` was changed accordingly (architect-
     approved, one-time exception to the EventSchema lock).
  3. **Per-occurrence exceptions are separate rows**, not in-place edits of the
     master. An OVERRIDE row = `is_exception=1`, `recurrence_id=<master>`,
     `exception_date=<YYYY-MM-DD>`, `recurrence_type='none'`, `status='confirmed'`.
     A TOMBSTONE ("delete this occurrence") = same but `status='cancelled'`.
     Expansion overlays these onto the generated series (skip tombstone dates,
     replace override dates). Normal queries filter `is_exception=0` so exception
     rows never leak as standalone notes; they reach the UI only via the overlay.
  4. **Virtual recurring instances carry a composite id** `${masterId}:${YYYY-MM-DD}`
     (shallow-copied note, master never mutated) so a single occurrence is
     individually addressable. The master's real UUID still owns the DB row and
     all reminder scheduling. Delete/edit of an occurrence must extract the master
     id (C3 concern — flagged).
  5. **Named-column INSERT** in `StorageService.saveEvent` replaced the positional
     `VALUES(?,…)`. From now on every migration just adds a column with a DEFAULT
     and the INSERT keeps working — the positional-order fragility class is retired.
  6. **Cascade delete:** deleting a master soft-cancels the master (audit/ICS
     integrity) and HARD-deletes its exception/tombstone children
     (`DELETE … WHERE recurrence_id=?`) — children are meaningless without the master.
- Alternatives considered: HH:MM columns (rejected — duplicates start_datetime);
  compound recurrence enum kept (rejected — can't express daily; couples two axes);
  pre-generating all recurring instances as rows (rejected — breaks id-keyed dedup,
  multiplies writes, fights "runs forever"); editing the master in place for "this
  occurrence" (rejected — loses the series); positional INSERT kept (rejected — the
  recurring footgun that bit color_id/location).
- Implications: C2 (time UI + hourly schedule), C3 (recurrence picker + edit/delete
  dialogs that call `saveExceptionForOccurrence`/`saveTombstoneForOccurrence`), and
  C4 (daily/weekly/monthly reminders + yearly renewal prompt) build on this. The two
  write methods + renewal columns (`renewal_ask_suppressed`, `last_renewal_ask`) are
  schema/plumbing-ready but UNCALLED until C3/C4. Yearly renewal dialog hosts in root
  `_layout` (locked). Reminder-without-time = user picks the time explicitly, no
  silent 09:00 fallback for that case (locked; the 09:00 all-day policy remains for
  reminders where the user does NOT pick a time).

## Gal C C2 — event time end-to-end (UI + reminder anchor)
- Date: 2026-06-04
- Context: C2 wired event time into the UI on top of the C1 data foundation.
  Two choices needed locking beyond the C1 entry.
- Choices:
  1. **All-day reminder anchor = user-picked clock time − reminderMinutes.** When a
     reminder is enabled on an ALL-DAY event, NoteEditor prompts "באיזה שעה לתזכר?"
     and the picked time replaces 09:00 as the anchor; the existing lead-time chips
     ("שעה לפני" etc.) still subtract. So pick 20:00 + "שעה לפני" → fires 19:00.
     `saveNote` keeps a 09:00 path ONLY as a defensive fallback (the UI is contracted
     to always supply the picked time); it should never fire in normal use. Timed
     events keep `start.dateTime − reminderMinutes` as before.
  2. **Timed events store BOTH `start.date` AND `start.dateTime`.** `start.dateTime`
     is the precise time; `start.date` (the YYYY-MM-DD calendar day) is also persisted
     so `getEventsForGregorianDate` (which queries `WHERE start_date = ?`) still finds
     the event by day. `isAllDay` is derived from `start.dateTime == null`, NEVER from
     `start.date` presence — so storing both does not corrupt the all-day flag.
- UI structure: NoteEditor gained an additive "כל היום" toggle (default ON) +
  start/optional-end time pickers via a NEW `useTimeOfDayPicker` hook (Date I/O,
  honors `use24hTime`; the pre-existing string-based `useTimePicker` for the Omer
  reminder is untouched). day.tsx moved the hourly schedule to the אירועים tab with
  real hour bucketing from `start.dateTime` (all-day notes stay in NoteList via a new
  `onlyAllDay` prop; timed notes render in the grid); the activeTab now resets to
  'events' on every `selectedDate` change.
- Alternatives considered: one unified time-picker hook (rejected — the Omer picker
  needs string/forced-24h, event times need Date/setting-aware 24h; different
  contracts); storing only `start.dateTime` for timed events (rejected — breaks the
  `WHERE start_date=?` day query); fire-at-picked-time ignoring lead chips (rejected
  — makes the lead-time UI inconsistent between timed and all-day events).
- Implications: C3 (recurrence picker + edit/delete dialogs) must add an explicit
  `recurrenceType` to NoteEditor's `onSave` params (today recurrence is re-derived
  from `noteType`). The NoteList color quick-pick Modal remains DEAD CODE (no opener
  since the dot was removed); it was hardened in C2 to thread time/location but its
  reminder-anchor path would hit the defensive 09:00 — a latent (unreachable) edge to
  resolve if C3 re-wires it. Weekly recurrence DST drift (from C1) still to verify.

## Gal C C3 — recurrence UI + per-occurrence edit/delete
- Date: 2026-06-05
- Context: C3 exposed recurrence in NoteEditor and wired the edit/delete-occurrence
  dialogs on top of the C1 exception/tombstone infrastructure.
- Choices:
  1. **Explicit recurrence picker replaces implicit `noteType→yearly`.** NoteEditor
     has a "חזרה" chip row (none/daily/weekly/monthly/yearly) for ALL event types,
     plus calendar-anchor chips (עברי/לועזי) shown ONLY for yearly. `saveNote` takes
     explicit `recurrenceType`/`recurrenceCalendar` (explicit wins; the old
     noteType-derived value remains a back-compat fallback for callers that omit it).
     Type chips (birthday/yahrzeit) no longer drive recurrence.
  2. **Composite-id is the addressing scheme for occurrence ops.** `splitInstanceId`
     (`src/utils/recurringId.ts`, `lastIndexOf(':')`) → `{masterId, occurrenceDate}`.
     occurrenceDate null ⇒ master/one-off ⇒ operate directly (no dialog).
  3. **Edit/delete recurring instance ⇒ a 2-choice Alert** ("לתאריך זה בלבד" /
     "לכל התאריכים") at EVERY trigger (NoteEditor toolbar, NoteList inline ✕, day.tsx
     grid). "this date" → `saveOccurrenceException`/`deleteOccurrence` (C1 override /
     tombstone writers, exposed as thin `useNotes` wrappers); "all dates" →
     `saveNote(masterId, …)` / `deleteNote(masterId)` (cascades). This also fixed a
     latent bug: NoteList's ✕ previously called `deleteNote(compositeId)` → silent
     no-op for recurring instances.
  4. **"לכל התאריכים" anchors on the master's original date, NOT the displayed
     occurrence.** A recurring instance is a shallow copy of the master, so its
     `gregorianDateStr` is the master's anchor; edit-all parses it as LOCAL midnight
     and passes it as `saveNote`'s `date`. Passing the occurrence date would shift the
     series.
  5. **Dead color quick-pick removed.** The NoteList color-picker Modal had no opener
     (confirmed: `setColorPickerNote` only ever called with null); removed with its
     state/styles/imports.
- Alternatives considered: keep implicit recurrence (rejected — can't express
  daily/weekly/monthly, and couples recurrence to note type); edit-in-place of the
  master for "this occurrence" (rejected in C1 — loses the series); anchoring edit-all
  on the occurrence date (rejected — shifts daily/weekly/monthly series).
- Orchestrator fix (integration gate): the C2 all-day+reminder DEFERRED-save effect
  reconstructed `onSave` with `note?.id` + `date`, ignoring C3's edit-all
  `masterId`+anchor — so editing a recurring all-day-with-reminder event (i.e. a
  birthday/yahrzeit, the common case) via "all dates" would have written a stray row
  at the composite id / occurrence date. Fixed by capturing the resolved save target
  `{id, date}` in `pendingSaveTarget` when deferring and consuming it in the effect.
- Implications: C4 (notifications) — daily/weekly/monthly events now exist but have NO
  reminder scheduling yet (`ensureAnnualReminders` still yearly-only); the yearly
  renewal prompt is still unbuilt. View-mode "עוגן תאריך" still shows calendarType for
  all recurrence types (cosmetic; consider hiding for non-yearly). `onSaveOccurrence
  Exception`/`onDeleteOccurrence` are optional props (no-op if a future caller forgets
  them) — all current callers pass them.

## Gal C C4 — recurring reminders + yearly renewal (Gal C closes)
- Date: 2026-06-05
- Context: C4 added reminder scheduling for daily/weekly/monthly events and the
  yearly renewal prompt, completing Gal C.
- Choices:
  1. **`ensureRecurringReminders` sweep-on-init** (additive to NotificationService,
     alongside the existing yearly/Omer/candle sweeps, wired in `_layout.tsx` init).
     Daily/weekly/monthly only; **Gregorian JS-Date arithmetic** (these types are
     calendar-independent by the locked model). Rolling window = 60 days forward,
     ≤20 occurrences/event. Fire time: timed → master's HH:MM on the occurrence day −
     lead; all-day → 09:00 − lead (locked anchor, same as yearly). Id namespace
     `evt-{eventId}-{YYYYMMDD}` (occurrence date). **Idempotency = cancel-then-
     reschedule per event**: each sweep cancels that event's `evt-{id}-*` set and
     reschedules the window, so edits to lead/time take effect and nothing duplicates.
     `ensureAnnualReminders` (yearly) untouched.
  2. **No circular import:** NotificationService does NOT reuse `expandRecurringNotes`/
     `eventToCalendarNote` (useNotes imports NotificationService) — it computes
     occurrences itself from CalendarEvent.
  3. **Yearly renewal prompt.** `getEventsNeedingRenewal()` = yearly + has reminder +
     `renewal_ask_suppressed=0` + `last_renewal_ask` null or older than 11 months
     (SQL `date('now','-11 months')`) + the most-recent past occurrence is ≥ the
     event's `created` (so a brand-new yearly event whose first anniversary hasn't
     arrived is NOT prompted). Hebrew anniversaries computed via HDate. Dialog hosted
     in root `_layout.tsx` (locked), gated on `settingsReady` with a once-per-launch
     ref guard, shown as SEQUENTIAL Alerts ("תזכורת שנתית" / "האם להמשיך…"). "המשך" →
     `confirmRenewal` (sets `last_renewal_ask` = today YYYY-MM-DD, re-arms ~1yr);
     "אל תשאל שוב" → `suppressRenewal` (`renewal_ask_suppressed=1`). Dismiss writes
     nothing and the event re-surfaces next launch (locked — ignored prompt never
     cancels the reminder). `last_renewal_ask` stored as YYYY-MM-DD to match the SQL
     `date()` comparison.
- Alternatives considered: reuse expandRecurringNotes for the sweep (rejected —
  circular import); skip-if-already-scheduled idempotency like Omer (rejected — would
  not reflect a changed lead/time; cancel-then-reschedule does); blocking the renewal
  prompt before render (rejected — runs after settingsReady, never blocks UI).
- Implications / KNOWN LIMITATION: recurring reminders are **not** exception/tombstone-
  aware — the sweep schedules the master series only, so a reminder can still fire for
  an occurrence the user deleted "לתאריך זה בלבד", and an override's edited time isn't
  used for its reminder. Deliberately out of C4 scope; the first post-Gal-C cleanup
  candidate (fetch exceptions + overlay in the sweep). Also: aggregate iOS 64-notif
  cap isn't enforced across events (only candle-lighting self-caps) — revisit if users
  hit it. With C4, **Gal C is complete (C1–C4).**

## Hebrew drum/wheel date picker (Slice 1 — header tap, month+year)
- Date: 2026-06-17
- Context: The Hebrew calendar tab's month-title tap opened `MonthYearPicker`, a
  GREGORIAN-month grid that drove the Gregorian cursor (`currentMonth/Year`) — but
  the Hebrew grid is driven by `currentHebrewMonth/Year`, so the picker did not
  correctly navigate the Hebrew tab (a latent mismatch). A true Hebrew month/year
  picker was wanted, drum/wheel style.
- Choices (locked by the Architect):
  1. **Tishrei-first display order** for the month wheel: תשרי, חשוון, כסלו, טבת,
     שבט, אדר (leap: אדר א׳ + אדר ב׳), ניסן, אייר, סיוון, תמוז, אב, אלול. Month-number
     sequence `7,8,9,10,11,12,[13 if leap],1,2,3,4,5,6` from `HDate.monthsInYear`.
     Leap-year month 12 is rendered "אדר א׳" (overriding the plain "אדר" name), 13 is
     "אדר ב׳"; common-year month 12 is "אדר".
  2. **Replace `MonthYearPicker` on the Hebrew tab** (not alongside). MonthGrid's
     title tap is now mode-aware: hebrew → `HebrewDatePicker`; gregorian →
     `MonthYearPicker` (UNCHANGED). MonthYearPicker still renders on the Hebrew tab
     but `pickerVisible` is never set there, so it stays hidden.
  3. **Hand-rolled ScrollView drum** (no new npm packages): `ITEM_HEIGHT=44`, 5
     visible rows, `snapToInterval` + `decelerationRate="fast"`, centering via
     `contentContainerStyle.paddingVertical = 2*ITEM_HEIGHT` (NOT `contentInset` —
     that is iOS-only and a no-op on Android, the primary target), index resolved in
     `onMomentumScrollEnd`. Sibling-`Pressable` backdrop (NEVER a
     `TouchableWithoutFeedback` wrapping the drums — the Android scroll-steal
     anti-pattern fixed earlier today).
  4. **New provider jump action** `navigateToHebrewMonth(hYear, hMonth)` — anchors on
     day 15 (like `navigateHebrewMonth(±1)`), sets the Hebrew cursor, calls
     `refreshHebrewMonth()`, and syncs `selectedDate` to the anchor's Gregorian date.
     `navigateHebrewMonth(±1)` left unchanged.
  5. **Data helpers in DateService** (centralize hebcal): `getHebrewMonthsForYear`
     (Tishrei-first, leap-aware, Hebrew names from the existing name table) and
     `getHebrewDaysInMonth` (wraps `HDate.daysInMonth(month, year)` — month first).
- Alternatives considered: keeping `MonthYearPicker` for both tabs (rejected — the
  Gregorian-cursor mismatch); a native wheel-picker package (rejected — no new deps);
  `contentInset` per the original spec (rejected — iOS-only, breaks Android centering);
  `@hebcal/core` English `getMonthName` for display (rejected — needs Hebrew names).
- Implications: Slice 2 (NoteEditor editable date row, day+month+year) reuses
  `HebrewDateWheel` (it already accepts an N-column array; add a day column) and
  `HebrewDatePicker`. The wheel + sheet are the reusable primitives. Year wheel is
  bounded to ±50 years around the opening year (no infinite drum). `getHebrewDaysInMonth`
  exists for the Slice-2 day column's length + clamping.

## Shabbat 4-city table: per-city minhag, Geonim 8.5° havdalah, Saturday-night anchor
- Date: 2026-06-17
- Context: The day-screen ShabbatCard was extended from a single-location candle row to
  a 4-fixed-city table (ירושלים, תל אביב, חיפה, באר שבע) + a user-location row, each
  showing הדלקת נרות + צאת שבת. The original spec had three errors that the user
  resolved (clarifying questions): `zmanim.getTzeit()` does not exist in kosher-zmanim;
  a flat 18-min candle offset; and using `candleLightingLeadMinutes` (a notification
  lead) as the halachic offset.
- Choices (user-locked):
  1. **צאת שבת / havdalah = Geonim 8.5° tzeit** (`getTzaisGeonim8Point5Degrees`, exposed
     as `ZmanimResult.tzeitHakochavim`) — the standard Israeli tzeit, NOT `getTzais72`
     / Rabbeinu Tam.
  2. **Per-city minhag candle offset** via the existing `getCandleLightingOffset(lat,lng)`
     (Jerusalem 40, Haifa 30, Safed 40, else 18). The user row uses its own coords'
     offset. NOT a flat 18, NOT the Settings notification lead.
  3. **Havdalah is anchored to SATURDAY NIGHT (date+1)**, candle to the Friday `date`.
     `getCandleAndHavdalah` REUSES `getZmanim` for both days (no new kosher-zmanim
     instance): candle = `getZmanim(friday).candleLighting` (per-city offset already
     baked in), havdalah = `getZmanim(saturday).tzeitHakochavim`.
  4. **User row sourced from `LocationProvider`** (the zmanim location), gated on
     `source !== 'default'` (so the untouched-Jerusalem default doesn't duplicate the
     fixed Jerusalem row). Label resolved from `cityHebcalKey` via `findCityByKey().nameHe`,
     fallback 'המיקום שלי'. This is deliberately NOT the SettingsProvider candle-lighting
     city override (which drives notifications) — a user with a separate candle-lighting
     city will see the table user row reflect their main location.
  5. **ShabbatCard enhanced in place** at `src/components/zmanim/ShabbatCard.tsx` (not a
     new `calendar/` file): Friday → table; Saturday branch (צאת השבת + ר״ת, prop-driven)
     unchanged; the existing Props interface is kept so day.tsx needs no change.
- Alternatives considered: `getTzais72`/R"T (rejected — not the Israeli minhag, contradicts
  "no 72"); flat-18 or notification-lead offset (rejected — halachically wrong per city);
  re-instantiating kosher-zmanim (rejected — `getZmanim` already does per-city offset +
  Geonim 8.5° tzeit + caching); new duplicate ShabbatCard in calendar/ (rejected — the
  component already exists in zmanim/).
- Implications: any future multi-city / table zmanim view should reuse `getShabbatTable`
  / `getCandleAndHavdalah` and the per-city `getCandleLightingOffset`, and remember the
  Saturday-night anchor for havdalah. The "user location = LocationProvider, candle-lighting
  city = SettingsProvider override" split is intentional and may surface as a future
  unification task.

## Multi-day events — Slice A data foundation (non-recurring, overlap query, segment metadata)
- Date: 2026-06-18
- Context: Multi-day (start..end DAY range) events were requested. Investigation found the
  `events` table was ALREADY range-capable: `end_date`/`end_datetime` exist since v1 and are
  written (`saveEvent`) and read (`rowToEvent`). The real gap was that every write path
  collapsed `end` onto `start`, no query treated events as ranges, the `CalendarNote` mapping
  dropped `end.date`, and there is no span rendering or end-date editor. Built as Slice A
  (data) of a three-slice plan: A data → B editor → C rendering.
- Choices (user-locked):
  1. **Non-recurring only** for Slices A–C (`recurrence_type = 'none'`). The recurrence engine
     (yearly/monthly/weekly/daily expansion + exception/tombstone overlay + composite ids) ×
     multi-day is a combinatorial explosion for rare value; `expandRecurringNotes` stays
     SINGLE-DAY and untouched. Multi-day recurring is a separate, explicitly-reopened decision.
  2. **No structural migration — backfill + index only (v6).** `UPDATE events SET end_date =
     start_date WHERE end_date IS NULL` makes `end_date` guaranteed non-null, so the overlap
     predicate uses plain `end_date >= ?` (no COALESCE, indexable). Added index
     `idx_events_daterange (start_date, end_date)`. No column added (Google-Calendar shape lock
     preserved).
  3. **Range-overlap query semantics.** An event covers day D iff `start_date <= D AND end_date
     >= D`. `getEventsForGregorianDate` uses this (both args = D) so a span shows on days 2…N in
     the **Day view** (same title each day — user-confirmed). `getNotesInRange` uses interval
     overlap (`start_date <= gridEnd AND end_date >= gridStart`) so a span straddling the grid
     boundary (starting before gridStart) is caught.
  4. **`segment` metadata produced in the data layer, consumed in rendering.** `CalendarNote`
     gains `endDateStr` (the dropped `end.date`, now mapped) and transient
     `segment?: { isStart; isEnd }`. `useDatesNotes` expands a multi-day note into each covered
     day (clamped to the grid, DST-safe ms iterator) on shallow copies stamped with segment
     flags marking the event's TRUE start/end even on clamped interior days. DayCell/tagMapper
     ignore `segment` until Slice C.
  5. **Rendering = per-cell segment chips (Option A), NOT overlay bars.** A chip in every covered
     day, rounded only on the true start/end day (RTL-correct), square in between; week
     boundaries are automatic (each cell knows its own role). Chosen over absolute-positioned
     overlay bars (Option B) to avoid the project's #1 risk area (RTL/overlay geometry vs.
     `overflow:hidden`, the ScrollView, per-week measurement). Option B is optional later polish
     only if the user wants visually-fused bars.
- Alternatives considered: structural migration / new columns (rejected — columns already exist);
  COALESCE in the overlap query (rejected — backfill lets a plain index work); expanding recurring
  × multi-day now (rejected — combinatorial complexity, rare value); overlay bars (rejected for
  Slice C default — RTL risk); making the span Hebrew-anchored (rejected — store absolute
  Gregorian `end.date`, no Hebrew recurrence semantics on the span).
- Implications: Slice B adds the NoteEditor end-date picker (reuse `HebrewDateWheel`,
  validate `end >= start`, thread `endDate` through `onSave` → `saveNote`) — only then is the
  create→render loop device-verifiable. Slice C consumes `CalendarNote.segment` for chip
  styling. Slice D: `.ics` VEVENT all-day `DTEND` is EXCLUSIVE (last-day + 1) — `getAllEvents`
  already reads `end.date` but the export must add the +1. The `saveNote` defensive clamp
  (`end < start` → single-day) and the non-null `end_date` invariant are load-bearing for the
  query math — preserve them.

## Multi-day events — Slice C: top-lane span ordering + per-cell segment chips (Option A)
- Date: 2026-06-18
- Context: Slice C renders multi-day spans in the month grid. For per-cell segment chips to
  read as ONE continuous bar, a span must sit in the SAME vertical slot in every covered cell.
  The prior `buildDayTags` order (holiday → special → note) placed a span lower on days that
  also had a holiday, breaking the line. A rendering-order rule was needed.
- Choices (user-approved):
  1. **Per-cell segment chips, NOT overlay bars (Option A).** Each covered day renders its own
     chip; `DayCell` rounds only the true outer corners via `CalendarNote.segment {isStart,
     isEnd}`. RTL: visual start = RIGHT edge → `isStart` rounds the right corners, `isEnd` the
     left, middle all-square. Chosen over absolute-positioned overlay bars to avoid the RTL/
     overflow/measurement risk (the project's #1 risk area).
  2. **Top-lane span ordering.** `buildDayTags` lifts span tags (notes with `segment` defined)
     to the FRONT of the tag array, before holiday/special/single-note tags, so a single span
     holds slot 0 every day and the bar aligns across the week. TRADE-OFF (accepted): on a day
     with a span + holiday, the holiday TAG can fall into `DayCell`'s `+N` overflow — but the
     green `isHoliday` cell background tint still conveys the holiday, so nothing is lost.
  3. **Title on the start day only; middle/end are blank colored bars** at a fixed height
     (`SEGMENT_CHIP_HEIGHT`) so titled and blank bars are the same height and line up. Avoids
     repeating the title on every covered day.
  4. **No edge-bleed.** Chips stay within the cell padding; square edges read as a run across
     the hairline cell gap. Negative-margin bleed-to-edge fights the cell's `overflow:'hidden'`
     + RTL geometry and is deliberately deferred.
- Alternatives considered: keep holiday-first order (rejected — spans misalign on holiday days);
  overlay bars (rejected — RTL/overflow risk); repeat title every day (rejected — noise, tag-slot
  competition); full lane assignment for overlapping spans (deferred — see limitation).
- Implications / KNOWN LIMITATIONS (deferred): multiple SIMULTANEOUSLY-OVERLAPPING spans are NOT
  lane-assigned — each renders, but 2+ on one day may not perfectly align; a span continuing in
  from the PREVIOUS month shows no title that month (the bar still signals it); edge-bleed not
  implemented. The memo comparator in `DayCell` now compares `segment.isStart/isEnd` — keep it,
  or cells won't re-render when a span's role flips. With Slice C, multi-day events (A–C) are
  functionally complete for the common case; Slice D (.ics DTEND+1, overlap lanes, bleed,
  multi-day recurring) remains backlog.

## Location unified into LocationProvider (supersedes the 2026-06-17 split)
- Date: 2026-08-30
- Context: The user had to configure their location in TWO places: LocationProvider
  (zmanim, Zmanim screen, ShabbatCard) and SettingsProvider's candleLighting*
  fields (candle-lighting notifications only), each with its own picker and its
  own GPS flow. The 2026-06-17 Shabbat-table entry deliberately kept them split
  and flagged it as "a future unification task". The user explicitly reopened it.
- Choice: LocationProvider is the single source of truth. candleLightingCity /
  Lat / Lng / PlaceName and their setters are removed; candleLightingRemindersEnabled
  and candleLightingLeadMinutes stay (they are notification preferences, not
  location). ensureCandleLightingReminders now RECEIVES the location as a
  parameter instead of resolving a city key itself, keeping the import graph
  one-directional (SettingsProvider -> LocationProvider, SettingsProvider ->
  NotificationService; neither imports back). A module-level subscription in
  SettingsProvider reschedules candle reminders when coordinates change.
- Migration: LocationProvider.loadFromStorage adopts any orphaned candle-lighting
  location prefs when it has no location of its own (or is still 'default'),
  then clears them. Guarded so it can never clobber a location the user set
  deliberately, and idempotent once the old keys are cleared.
- Alternatives considered: keeping the split (rejected - the user's complaint was
  precisely the duplication); making SettingsProvider the owner (rejected -
  LocationProvider already drives zmanim, the more fundamental consumer).
- Implications: a user who wanted zmanim for where they are but candle times for
  their home city can no longer express that. Accepted deliberately. Also added
  LocationProvider.placeName, because a GPS fix outside the 36 curated cities
  previously produced no readable location name anywhere in the UI.

## Device GPS acquisition is centralized and returns a typed result
- Date: 2026-08-30
- Context: GPS was implemented twice and divergently (locationPicker used
  getCurrentPositionAsync({}) with no accuracy and NO TIMEOUT - it could hang the
  spinner indefinitely; settings.tsx used Accuracy.Balanced plus its own inline
  Nominatim fetch). Neither checked whether location services were enabled, and
  neither distinguished a first-time denial from a permanently blocked one.
- Choice: one action, LocationProvider.acquireFromDeviceGps(), returning a
  discriminated union: ok:true or ok:false with reason in
  servicesDisabled | permissionDenied | permissionBlocked | timeout | error.
  It checks hasServicesEnabledAsync, inspects canAskAgain, races
  getCurrentPositionAsync against a 12s timer, falls back to reverse-geocoding
  for a display name, and never throws. The UI renders an inline status strip
  per reason.
- Alternatives considered: relying on the Expo API's own timeout options
  (rejected - inconsistent across versions); keeping Alert-only feedback
  (rejected - the user explicitly asked for a visible indicator).
- Implications: any future location entry point must call this action rather
  than talking to expo-location directly.

## Zod validation at the SQLite read boundary
- Date: 2026-08-30
- Context: EventSchema.ts contained only TypeScript interfaces despite its name,
  so StorageService.rowToEvent cast an untyped row straight into CalendarEvent.
  The project's "validate on read" rule was effectively unimplemented at the one
  place it mattered.
- Choice: CalendarEventSchema mirrors the interface and rowToEvent runs safeParse.
  A failing row is logged and DROPPED, never thrown - this executes against real
  installed user data spanning schema v1-v6, so rejecting a legitimate legacy row
  must never crash the calendar. Fields backed by nullable SQLite columns are
  permissive; only status (a 3-value set, unchanged since v1, and branch-critical
  downstream) is a closed enum.
- Alternatives considered: throwing on invalid rows (rejected - one corrupt row
  would take down the whole month view); strict enums everywhere (rejected - the
  v5 migration remapped recurrence values, so historical strings vary).
- Implications: NotificationSchema.ts remains deliberately schema-only per the
  2026-05-28 decision and was left untouched.

## Shared notification budget across all sweeps
- Date: 2026-08-30
- Context: Four independent sweeps schedule notifications (annual, recurring,
  Omer, candle-lighting). Only candle-lighting capped itself; ensureRecurringReminders
  capped at 20 PER EVENT with no cross-event budget. A user with several recurring
  reminders plus Omer plus candle-lighting could silently exceed the OS pending
  limit and lose notifications with no signal.
- Choice: a single ceiling of 60 (headroom under the ~64 platform limit). Each
  sweep collects candidates, then trims against the live scheduled count queried
  immediately before scheduling, keeping nearest-fire-time first. console.warn
  fires whenever trimming occurs.
- Alternatives considered: a shared in-memory counter threaded through every call
  (rejected - goes stale when a single sweep re-runs from a settings toggle).
- Implications: measuring ground truth each time keeps it correct even when one
  sweep runs in isolation.

## Heebo replaces the platform system font
- Date: 2026-08-30
- Context: Typography was 'System', which renders Hebrew differently on Android
  and iOS and gave no control over weight availability.
- Choice: @expo-google-fonts/heebo. Hebrew-first (Oded Ezer), with Latin forms
  that match for Gregorian numerals. FONT_FAMILY in src/constants/typography.ts
  is a single switch point. Font loading is folded into the existing settingsReady
  gate, and a font ERROR is treated as ready so a failed fetch can never block
  render; the 3s forceReady fallback still applies.
- Alternatives considered: staying on System (rejected - the user approved the
  typeface as part of the design); bundling a custom font file manually
  (rejected - the Google Fonts package handles licensing and asset wiring).
- Implications: Heebo is loaded at RUNTIME via useFonts with JS imports, and the
  expo-font plugin in app.json carries no `fonts` array, so nothing is embedded
  natively at build time. EAS Update ships assets alongside the JS bundle, so
  font changes ARE OTA-deliverable while runtimeVersion is unchanged.
  CORRECTED 2026-08-31: this entry originally claimed a font change always
  requires a full EAS build. That is only true when fonts are embedded at build
  time via the plugin's `fonts` array, which this project does not use. The
  general rule is: OTA covers JS/TS and runtime-loaded assets; a build is needed
  for native module changes, app.json changes (permissions, plugins, icon,
  splash), and anything that moves runtimeVersion.

## Android auto-backup left ENABLED
- Date: 2026-08-30
- Context: app.json sets no android:allowBackup, so Android's default (true)
  applies and the SQLite database - notes, birthdays, yahrzeits, GPS coordinates -
  is backed up to the user's Google Drive. This had never been an explicit decision.
- Choice: leave it enabled. The user chose this knowingly: with no export/restore
  feature yet, backup is the only thing standing between a device change and total
  data loss, and that outweighs the privacy cost of coordinates sitting in the
  user's own Drive.
- Alternatives considered: allowBackup=false (rejected - uninstall or a new device
  would mean irreversible data loss); disabling backup and building manual export
  first (deferred - real work, not blocking).
- Implications: revisit if a real export/restore feature ships. Note this is the
  one path by which local data leaves the device, so it belongs in any privacy
  description of the app.

## Week view is an hourly timeline; WeekGrid/WeekRow retired
- Date: 2026-08-30
- Context: The week screen showed a single horizontal row of DayCells (a mini
  month-row) plus a parasha banner. The approved redesign called for a real
  week view in the style of a high-end calendar.
- Choice: new WeekTimeline.tsx plus a pure weekTimelineLayout.ts geometry module -
  RTL day columns (Sunday rightmost), a pinned all-day row with true multi-day
  spanning bars, an hour grid with overlapping-event lane assignment, and a
  current-time indicator. WeekGrid.tsx and WeekRow.tsx deleted after confirming
  no remaining importers.
- CRITICAL constraint discovered during integration: auto-layout cannot express a
  block spanning multiple hours or a bar spanning multiple day columns, so the
  body uses absolute positioning. The first implementation had the header as a
  plain flex row (Sunday LEFT) while the grid positioned columns from the RIGHT -
  header and grid mirrored, putting every event under the wrong day label - and
  the all-day row's children were offset by the gutter width because their parent
  no longer started at x=0. Both compiled and typechecked cleanly.
  ALL THREE BANDS (header, all-day, grid) MUST derive x from the single shared
  columnLeft(i, containerWidth) against the same measured width. Do not
  reintroduce a flex row for any band.
- Alternatives considered: keeping the DayCell row (rejected - the user approved
  the timeline); a list library (rejected - this is a positioned grid).
- Implications: quick-add from the week screen is a FAB (bottom-end = bottom-LEFT
  in RTL). Multi-day HOLIDAY spans still render per-day because DayData.holidays
  carries no cross-day metadata - a data-layer change if ever wanted.

## DayCell visual model: top hairline, Hebrew numeral top-right, today as a circle
- Date: 2026-08-30
- Context: Every cell drew a full bordered, rounded box, and DESIGN.md's sketch
  put the primary date on the left.
- Choice: cells carry only a 1px top hairline (no left/right/bottom border, no
  radius) except when selected. The Hebrew numeral sits top-RIGHT - the reading
  start in RTL, and where a Hebrew-locale calendar puts it - with the Gregorian
  number small at top-left. "Today" is a filled accent circle around the numeral.
  Up to 3 chips (was 2). Holiday/Shabbat tints must cover the ENTIRE cell.
- Alternatives considered: keeping bordered cells (rejected - the border box is
  what made the grid read as dated); primary date on the left per the old sketch
  (rejected - contradicts RTL reading order).
- Implications: this supersedes the DayCell sketch in DESIGN.md. Row heights now
  flex to fill the screen WITH an explicit minHeight floor - never fully inferred,
  or the Yoga circular-height collapse returns.

## A sticky header's own style is hoisted by React Native - never put layout on it
- Date: 2026-08-31
- Context: The Day screen's tab bar rendered its two tabs stacked vertically,
  each full width, instead of side by side. Two rounds of "fixing" the styles
  changed nothing, because the styles were already correct. The tab-bar View
  was the element targeted by `stickyHeaderIndices`.
- Cause (React Native, not us): `ScrollViewStickyHeader.js` renders the sticky
  child as
    `<Animated.View style={[child.props.style, styles.header, {transform}]}>`
    `  {React.cloneElement(child, {style: styles.fill, onLayout: undefined})}`
  where `styles.fill` is `{flex: 1}`. The child's style is MOVED to the wrapper
  and the child is left with only `flex: 1`. Our `flexDirection: 'row-reverse'`
  landed on the wrapper - which has a single child, so it did nothing - and the
  tab bar fell back to the default `column`, with `alignItems: 'stretch'`
  giving each tab full width. Exactly the observed rendering.
- Choice: the element pointed at by `stickyHeaderIndices` must be a plain
  wrapper carrying only "chrome" that BELONGS on the hoisted wrapper -
  background, bottom border, margin. Any layout (flexDirection, gap,
  justifyContent) goes on an inner View one level down, where it survives.
- Alternatives considered: dropping the sticky behaviour (rejected - the tab bar
  scrolling away is a real usability loss now that the highlights strip sits
  above it); a fixed non-scrolling region (rejected - the highlights must scroll
  away or they would permanently occupy most of a Friday screen).
- Implications: applies to EVERY future sticky header in this app. The
  background must sit on the outer/hoisted View specifically - if it ends up
  only on the inner View, content shows through while the header is docked.
  Note that `tsc`, `expo-doctor` and a production bundle are all green in the
  broken state; this is only observable by looking at the screen.

## Google Calendar sync via the device calendar provider + .ics import (supersedes the 2026-05-28 one-way .ics decision)
- Date: 2026-11-01
- Context: Shlomo reopened "Google Calendar interoperability is one-way via .ics
  files" (2026-05-28): users should be able to opt in to syncing Luchot with their
  Google Calendar, both to import and to export easily. Three paths were weighed in
  the 2026-10-28 review.
- Choice: two mechanisms, both opt-in, neither adds a network call from Luchot:
  1. **Device calendar sync** through Android's CalendarContract via `expo-calendar`.
     Luchot reads and writes the calendars already on the device; the Google
     Calendar app's own sync adapter carries changes to and from Google's cloud.
     Luchot never talks to Google, holds no token, needs no account.
  2. **.ics import** (the missing half of Wave 4): the user picks or opens an .ics
     file and its events are added to local SQLite.
- Alternatives considered: Google Calendar API over OAuth directly from the device
  (rejected - calendar scopes are "sensitive", so Google app verification, a
  domain, a demo video and weeks of review; it would put a network client and a
  token in an offline-first app); .ics only (rejected - manual and one-shot, not
  the "easy import and export" Shlomo asked for).
- Implications:
  - "Offline-first, no backend ever" stands: no backend, no account, no network
    call from Luchot. Data reaches Google only through the user's own Google
    Calendar app, after the user turned sync on.
  - New OS permissions READ_CALENDAR / WRITE_CALENDAR, requested only when the user
    turns sync on. Triggers a `security-auditor` pass (new permission + new data
    path) and a Play Data safety update.
  - Inference, not verified against CalendarContract docs: a calendar Luchot
    creates itself is a LOCAL-account calendar and does NOT sync to Google. To
    reach Google, Luchot writes into an existing Google-account calendar the user
    picks.
  - Hebrew-date recurrences (yahrzeit, Hebrew birthday) have no RRULE equivalent;
    on export they are written as concrete yearly occurrences over a fixed window.
  - `EventSchema.ts` stays as is; sync bookkeeping (which device event id maps to
    which Luchot event) lives in a separate table, owned by `database-architect`.
  - The new settings screen and import flow are a new flow: Figma first.
  - "Notifications and export are user-triggered" (2026-05-28) is narrowed, not
    revoked: turning sync on is the explicit user action; after that, writes to
    the chosen calendar follow the user's own create/edit/delete in Luchot.
- Product choices (2026-11-02): Google events are a LIVE read-through overlay in
  Luchot's views (never copied into SQLite, edited in Google); Luchot personal
  events are written automatically on create/edit/delete once sync is on;
  hebcal holidays are never written; Hebrew-date yearly events are written 10
  years ahead and extended on app launch.

## Expo SDK 58 upgrade (Play target API 36), async expo-sqlite, fingerprint runtime
- Date: 2026-11-02
- Context: Google Play requires new apps and updates to target "Android 16 (API
  level 36) or higher" since 2026-08-31. SDK 51 targets API 34, so Luchot could not
  ship. Shlomo approved the plan (handoff 2026-11-01, Phase 1) with
  "expo-sqlite/legacy replaced" as an acceptance criterion.
- Choice: jump straight to the current stable SDK 58 (RN 0.88, React 19, New
  Architecture, Reanimated 4 + worklets, Gesture Handler 3, expo-router 58,
  TypeScript 6). StorageService moves to `openDatabaseAsync` behind a `Txn` adapter;
  `runExclusive` stays. `runtimeVersion` policy becomes `fingerprint`. Unused native
  modules dropped (`expo-dev-client`, `@shopify/flash-list`) and the unused
  `date-fns`; only the 4 used Heebo weights are bundled.
- Alternatives considered: SDK 54 (last Old-Architecture SDK, smaller jump) -
  rejected: it would need another full upgrade within a year for the next Play
  target bump, and EAS support for older SDKs runs out first; hopping one SDK at a
  time - rejected: seven native rebuilds for no extra safety without device tests
  at each step; forcing targetSdk 36 on SDK 51 via expo-build-properties - rejected:
  Android 16 enforces edge-to-edge, which RN 0.74 does not handle.
- Implications:
  - The next build must be a FULL EAS build; no OTA reaches SDK 51 builds.
  - Same database file as before (`<filesDir>/SQLite/calendar.db`, both drivers);
    the upgrade-scenario check on a device with existing data is mandatory before
    any release.
  - Android 16 edge-to-edge is enforced: every screen's top/bottom insets need a
    visual check.
  - `@gorhom/bottom-sheet` is now v5 (Reanimated 4 support); the manual
    `BackHandler` wiring still applies.
  - `react-dom` is a direct dependency only to satisfy expo-router's peer; it is
    not bundled on native.

## Reminders use USE_EXACT_ALARM (calendar-app exemption) and the HIGH channel
- Date: 2026-11-03
- Context: on the first SDK 58 build (target API 36) a reminder 2 minutes ahead
  was saved but never showed. expo-notifications schedules with
  `setExactAndAllowWhileIdle` only when `canScheduleExactAlarms()` is true;
  otherwise it falls back to `setAndAllowWhileIdle`, which Doze may defer by a
  long time. The app declared neither exact-alarm permission. Separately, the
  trigger carried no `channelId`, so notifications went to expo's fallback
  channel instead of our HIGH-importance `default` channel (no heads-up).
- Choice: declare `android.permission.USE_EXACT_ALARM` (granted at install, no
  prompt) and pass `channelId: 'default'` on every scheduled trigger.
- Alternatives considered: SCHEDULE_EXACT_ALARM (denied by default on Android 14+
  for new installs; the user would have to find a system settings screen) -
  rejected; `delivery: 'alarmClock'` (shows an alarm icon in the status bar
  until delivery; meant for alarm clocks) - rejected; keep inexact delivery -
  rejected: a calendar reminder that arrives late is a broken feature.
- Implications: Play allows USE_EXACT_ALARM for calendar apps (per Android docs
  and secondary sources; current Play policy text not verified) and requires a
  declaration in Play Console (Shlomo's). `app.json` change: full EAS build.
  Not yet verified on a device.

## "Support the project": one-time tips through Google Play Billing, no ads
- Date: 2026-11-03
- Context: Shlomo asked whether a bottom banner ad would be acceptable. Ads were
  rejected again: VISION.md says the app "**לא** מציגה פרסומות — לעולם", an ad SDK
  adds constant network traffic and the advertising ID (tracking), and the content
  of the ads cannot be fully controlled. Shlomo accepted the alternative: "קיבלתי את
  החלופה של "תמיכה בפרויקט"", and chose Google Play Billing over an external link.
- Choice: a "תמיכה בפרויקט" item in the drawer opens a screen with three one-time
  consumable in-app products (10 ₪ / 25 ₪ / 50 ₪ in the Figma frames; the real
  prices come from Play in the user's local currency). A tip unlocks nothing:
  every feature stays free for everyone.
- Alternatives considered: banner ads (above) - rejected; an external link
  (Buy Me a Coffee / PayBox / Bit) - rejected: Play's Payments policy exempts from
  Play Billing only "tax exempt donations", so a tip to the developer risks
  rejection or suspension; a paid "pro" tier - not requested.
- Implications:
  - No network call from Luchot's own code: the purchase runs inside the Play
    Store app. The offline-first rule and the single Nominatim exception stand.
  - A new native dependency (IAP library) and the BILLING permission: full EAS build.
  - Shlomo's steps: a Play Console payments profile (merchant account) and the
    three in-app products. Google keeps a service fee on each purchase.
  - Play's Data Safety form must list purchase history (handled by Google Play).
  - UI is a new flow: Figma frames E1–E4 (section "תמיכה בפרויקט") need Shlomo's
    approval before any code.

## Device calendar sync: how Luchot events are written (Phase 3)
- Date: 2026-11-03
- Context: Phase 3 of the 2026-11-01 sync decision. Luchot events are written to
  the one Google calendar the user picks; the shape of the device events had to
  be chosen without changing `EventSchema.ts` (locked).
- Choice:
  - A new additive table `device_sync_map` (schema v8: luchot_id, occ_key,
    device_event_id, calendar_id, payload_hash) maps every Luchot event to the
    device events it was written as. The pure planner `DeviceSyncPlan.ts`
    computes the wanted device events; `DeviceSyncService.ts` applies the diff.
  - One-off events → one device event. Gregorian series (daily / weekly /
    monthly / yearly) → one device event with a recurrence rule; tombstoned and
    overridden dates are written as cancelled occurrences, and each override as
    its own event. Hebrew-date series (yearly / monthly) → one device event per
    occurrence, today → today + 10 years; the window is extended on every launch.
    Past occurrences are kept while the series exists.
  - Not written: hebcal holidays (never stored), events imported from an .ics
    file (they already live in the calendar they came from), reminders/alarms
    (Luchot schedules its own notifications; writing alarms would notify twice).
  - Google events are read live (`getOverlayEvents`) through the Phase 2 mapping
    (`IcsParser.toCalendarEvent`), never stored; events Luchot wrote itself are
    filtered out of the overlay by `device_sync_map`.
  - Turning sync off stops every read and write; the mapping table stays, so
    turning it back on continues where it left off.
- Alternatives considered: one recurring device event for Hebrew-date series -
  impossible (RRULE has no Hebrew calendar); expanding Gregorian series too -
  rejected: a daily event would be 3,650 device events; storing the device id in
  `events` - rejected: `EventSchema.ts` is locked.
- Implications: native dependency `expo-calendar` + READ/WRITE_CALENDAR: full EAS
  build. Existing events are written only when created, edited or deleted after
  sync is turned on (open question for Shlomo, see the PR).
