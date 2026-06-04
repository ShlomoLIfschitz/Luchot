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
