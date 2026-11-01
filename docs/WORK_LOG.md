# Luchot — Work Log

> Session-by-session log of what got done, what was decided, and what's open. Updated by Claude Code at the end of each session per `CLAUDE.md` spec.
>
> Most recent entries first. Backfilled entries cover work that predates this log.

---

## 2026-11-01 — Session: review + Google Calendar sync decision

**Phase:** Phase 5 (planning, no app code changed)
**Branch / PR:** `docs/device-calendar-sync`

### What was done
- Full read-only review (code, architecture, app size, UI/UX, Play readiness). Blocker found: Expo SDK 51 targets API 34; Google Play requires API 36 for new apps and updates since 2026-08-31.
- Shlomo reopened the 2026-05-28 ".ics one-way" decision and chose "יומן המכשיר + ייבוא ics". Recorded in DECISIONS.md (2026-11-01); ROADMAP Wave 4 updated.
- Plan written: `docs/handoffs/2026-11-01-device-calendar-sync.md` (SDK upgrade → .ics import → device calendar sync).

### Decisions made
- Google sync through the device calendar provider (`expo-calendar`), no OAuth, no network from Luchot. See DECISIONS.md.

### Open issues / blocked
- Four product questions in the handoff, section 6 (Shlomo).
- On-device verification list from 2026-08-31 still open.

### Next steps
- Answer the handoff questions, then Phase 1: Expo SDK upgrade.

---

## 2026-11-01 — Session: single orchestration model (handoff files)

**Phase:** tooling (no app code changed)
**Branch / PR:** `docs/handoff-orchestration`

### What was done
- `docs/agentic/agents.md`: the two-layer "Architect Claude (separate chat)" model with pasted prompts and pasted-back reports replaced by one model: Shlomo → Claude Code → sub-agents; the task spec is Shlomo's request or a handoff file; small changes are made directly, large or specialized work is delegated.
- `docs/agentic/ownership.md`: execution-sequence step 1 — stop for a conflict with a spec or a locked decision, or a product decision; other ambiguity is decided and reported.
- `CLAUDE.md`: `EventSchema.ts` changes need Shlomo's approval (locked decision) instead of "architect approval"; dropped the stale "(new — created alongside this update)".

### Decisions made
- One orchestration model: no separate Architect chat in the loop. Handoff files carry plans between sessions.

### Open issues / blocked
- None.

### Next steps
- None from this change.

---

## 2026-10-29 — Session: Play Store release rules

**Phase:** tooling (no app code changed)
**Branch / PR:** `docs/play-store-release`

### What was done
- `docs/agentic/deploy.md`: a "Play Store release" section — release order, the `runtimeVersion` (`sdkVersion`) trap, and the store requirements (privacy policy, Data safety form).
- `CLAUDE.md`: one rule — an OTA to `production` or `eas submit` is closed-list stop 1; an OTA to `preview` is free; after a native change the next production release is a full build.

### Decisions made
- The upgrade-scenario check on a device with existing data is mandatory for every production release, not only schema changes: store users have no backup.

### Open issues / blocked
- Privacy policy and the Data safety form are Shlomo's, before the first store release.

### Next steps
- None from this change.

---

## 2026-10-29 — Session: agentic workflow setup (`/ai-workflow-setup`)

**Phase:** tooling (no app code changed)
**Branch / PR:** `chore/agentic-workflow`

### What was done
- **Context:** `CLAUDE.md` 451 → 145 lines. Orchestration model, roster, execution sequence, ownership, delegation, the seven parallel-dispatch rules, the full DoD rationale, state discipline and the project tree moved verbatim to `docs/agentic/` behind one-line pointers. Added the agentic workflow block (handoff files, verify command), `docs/handoffs/_TEMPLATE.md`, `docs/agentic/local-first.md`, `security.md`, `deploy.md`, and a stub `docs/API.md`. Lost-text check: 0 lost lines, 0 broken pointers.
- **Guardrails:** project hooks in `.claude/hooks/` (track changes, lint the changed file, stop reminder in `remind` mode pointing at `docs/WORK_LOG.md`). No ESLint config, so the lint hook passes silently.
- **CI:** `.github/workflows/ci.yml` runs typecheck, `expo-doctor` and `expo export --platform android` on every PR (Node 20.18.1, no secrets).
- **Deploy audit:** `docs/agentic/deploy.md` filled in. Repo classified `free` in `~/.claude/guard-merge.json` (a merge deploys nothing; releases are manual `eas` commands).

### Decisions made
- The global "Claude decides and does" replaces "approval before any task"; the closed list of stops lives in `~/.claude/CLAUDE.md`.
- Work moves from direct commits on `main` to one branch + PR per task; CI must be green; Claude merges.
- Dependencies: `npx expo install` only; a native dependency, or an `app.json`/`eas.json` edit, forces a full EAS build and is flagged in the report instead of asked first.
- `eas update --branch preview` is not a stop: only Shlomo uses the preview APK. `eas update --branch production` and `eas submit` stay blocked by the guard.
- The Hebrew summary section of `CLAUDE.md` was dropped: it duplicated the English section.

### Open issues / blocked
- None from this session. The 2026-08-31 "START HERE NEXT SESSION" list below still stands.

### Next steps
- Next app task follows the new flow: branch → PR → CI green → merge.

---

## 2026-08-31 — Session: device-test rounds + NEXT-SESSION PLAN

**Phase:** Phase 5
**Commits:** `de5ed42` (device-test pass), `d39bd4e` (font weights + day layout), plus doc commits.
**Published:** OTA to `preview` twice. **The device was confirmed running `de5ed42`, one update behind, at the end of the session.**

### What was fixed this session
1. **Month grid row height (the visible break).** `weekRow` was `flex: 1` + minHeight; RN's ScrollView stretches flex children when content is shorter than the viewport, so a 6-week month inflated rows to ~206px. Replaced with a measured `clamp(available / weekCount, 88, 132)` applied as an explicit height. Scroll now only when rows genuinely overflow.
2. **Nikud stripping.** hebcal returns some holiday names vowelized and some not. `stripNikud()` normalizes them; geresh/gershayim preserved (they sit inside the naive 0591–05C7 range).
3. **Card grouping** on Day/Zmanim via the shared `Card`/`SectionLabel`.
4. **🔴 Font weights were completely dead.** `FONT_FAMILY` was the single string `'Heebo_400Regular'`, and in RN a concrete `fontFamily` makes `fontWeight` inert — the entire app rendered at flat Regular. `withFontFamily` is now weight→family aware with a type-safe override; 32 call sites converted.
5. **Day screen restructure** — highlights (holiday / parasha / Omer / Rosh Chodesh / ShabbatCard) hoisted ABOVE the tab control and populated on every day (parasha uses `upcomingParasha`); duplicate date hero removed (~240px); tabs sticky via `stickyHeaderIndices={[1]}` with the strip wrapped in one unconditional View so the index can't shift.

### 🚨 START HERE NEXT SESSION

**1. Fix the update-delivery loop — do this FIRST, it is costing a round trip every time.**
`expo-updates` with `checkAutomatically: ON_LOAD` downloads on one launch and applies on the NEXT. Two sessions were lost to "I see no change" when the change was already in the code and verified. Add a foreground check + `Updates.reloadAsync()` (or at minimum a visible "update ready" indicator) so an OTA lands in one launch during this iteration phase. JS-only, OTA-deliverable.

**2. Verify what is already built but never seen on a device.** All of this is code-verified and gate-green, but visually unconfirmed:
- **Week screen — never seen at all.** It had two real geometry bugs (header mirrored vs grid; all-day row offset by the gutter) that typecheck and bundling could not catch. Highest risk item in the app.
- Day screen restructure + sticky tabs (this session's work)
- Font weights across every screen
- Month grid on a **6-week month** specifically (e.g. Tishrei) — the Yoga row-collapse class
- Drawer: swipe, backdrop tap, active item now bold
- QuickActionSheet closing on the Android hardware back button
- Location migration on an install that has existing candle-lighting prefs
- MonthYearPicker's chunked+reversed Hebrew month grid

**3. App size** (all measured, none applied — each needs a build to verify):
- `expo-dev-client` — 0 imports, required by nothing; a native dev-menu module with no business in a distribution build
- `@shopify/flash-list` — 0 imports, required by nothing; unused native module
- 5 of 9 Heebo weights are bundled but never loaded (~285KB)
- The `preview` profile builds a **universal APK** carrying all 4 ABIs — usually ~50% of size. `production` already emits an AAB.
- ⚠️ Do NOT remove `luxon`, `expo-linking`, or `@expo/vector-icons` — they look unused in our code but are required transitively by `kosher-zmanim`, `expo-router`, and `expo`.

**4. Add a `typography.glyph` step.** Three agents independently hit this: UI glyphs (`›` `✓` `↗`) have no matching type step, so each mapped to the nearest with a 1–3px delta. The NoteEditor checkmark shrank 14→11px as a result.

### Deferred (need a data-layer field first)
- Special-Shabbat name (שבת שובה, שבת הגדול) — `DayData` has no field; deriving it from `holidays[]` would be guesswork.
- Multi-day holiday spans in the week all-day row — `DayData.holidays` carries no cross-day metadata, so Chol HaMoed renders one chip per day.

### Delivery rule (corrected this session)
OTA covers JS/TS and runtime-loaded assets, **including fonts loaded via `useFonts`**. A full build is needed only for native module changes, `app.json` changes, or a `runtimeVersion` move. An earlier claim that Heebo forced a build was wrong and has been corrected in DESIGN.md, DECISIONS.md and ROADMAP.md.

---

## 2026-08-30 — Session: Location unification + full UI redesign (Figma-first)

**Phase:** Phase 5
**Sub-agents:** local-data-builder ×2 (Zod/dead-code/race; location unification + GPS + notification budget + upcomingParasha), mobile-ui-builder ×7 (compile repair; tokens; calendar core + font; day/zmanim; settings/location/details; week timeline; drawer/editor/tabbar; RTL cleanup), security-auditor (read-only audit), Explore ×2 (read-only review). Orchestrator: code review synthesis, CLAUDE.md gap analysis, Figma design system + 20 screens, delegation planning, integration gate, docs, commits.
**Status:** Code complete. DoD: typecheck 0, expo-doctor 17/17, expo install --check clean. **On-device verification OPEN.**
**Commits:** `0b26677` (data layer), `5f02771` (UI redesign).

### What was done

**1. Read-only review pass (3 parallel agents)** — data layer, UI/RTL, security. Findings drove everything below. Security posture came back clean (no network beyond the documented Nominatim call, no AsyncStorage, no telemetry SDKs, all SQL parameterized).

**2. Location unified (user-requested; reopens the 2026-06-17 split).** `LocationProvider` is now the single source of truth. `SettingsProvider.candleLighting{City,Lat,Lng,PlaceName}` removed; `candleLightingRemindersEnabled`/`LeadMinutes` kept. Added `placeName` (a GPS fix outside the 36 curated cities previously produced no readable name anywhere) and a one-time migration adopting existing candle-lighting prefs so upgrading users don't silently revert to Jerusalem. New `acquireFromDeviceGps()` checks location services, distinguishes denied vs permanently-blocked permission, enforces a 12s timeout (there was none — the spinner could hang forever), and never throws.

**3. Data-layer hardening.** `EventSchema.ts` had no runtime schema despite its name — added `CalendarEventSchema` + `safeParse` in `rowToEvent` (drops a malformed row with a warning rather than throwing, since this runs against real v1–v6 user data). Shared 60-notification budget across all four sweeps (only candle-lighting self-capped before). `useNotes.load()` cancellation guard. `CalendarProvider.today` now refreshes. Nominatim consolidated + coordinates rounded to 3 decimals. Deleted dead `TorahService.ts`, `useCalendar.ts`, `createEvent()`.

**4. Figma design system built and approved BEFORE any UI code** (user's explicit instruction). File: `Luchot — Design System & Screens`. 4 pages — Foundations (32 tokens as Variables with Light/Dark modes, type scale, spacing, radius, elevation), Components, 10 light screens, 10 dark screens.

**5. UI redesign implemented** across 7 parallel agents on disjoint file sets. Highlights: DayCell top-hairline instead of a border box + Hebrew numeral moved to the top-RIGHT + today as a filled circle; MonthGrid merged header with the **Gregorian month RANGE** subtitle; week view rebuilt as a real hourly timeline; Friday parasha card; GPS status UI with all 5 failure states; Heebo font.

### Decisions made
Seven new entries in DECISIONS.md (2026-08-30): location unification, Heebo, Android auto-backup left enabled, week view as hourly timeline, DayCell RTL/visual model, Zod-on-read, notification budget.

### Orchestrator integration gate — caught what the automated checks could not
Both `tsc` and `expo-doctor` were green while **two real geometry bugs** sat in `WeekTimeline.tsx`:
- The day-columns header was a plain flex `row` (Sunday LEFT) while the grid positioned `columnLeft(0)` at the RIGHT — header and grid mirrored, so every event rendered under the wrong day label.
- The all-day row's children used `columnLeft(…)` measured against the full container width, but their parent already started after the 34px gutter — bars shifted right and clipped. The hourly grid did *not* have this bug, which is exactly what made it easy to miss.
Both returned to the authoring agent and fixed by collapsing all three bands onto one shared `columnLeft()` so they cannot diverge again.
Also rejected a proposed scope cut: the agent had dropped quick-add from the week screen (a functional regression). Restored as a FAB per the approved design.
Also caught six files assigned to nobody, still carrying known defects (`MonthYearPicker` Hebrew months in Latin reading order; three picker hooks with "accidentally correct" plain-`row` button rows + hardcoded `rgba`; `NoteList` header; `CandleIcon` hex) — cleaned up in a follow-up pass.

### Open issues / blocked
- **On-device verification NOT done** (orchestrator cannot drive an emulator). Priority checks: Heebo renders and the 3s font-gate fallback works on cold start; week timeline column alignment across header/all-day/grid on a real device width; 6-week month row heights (the Yoga collapse class); Android back button closing QuickActionSheet; the location migration on an install that has existing candle-lighting prefs; drawer swipe + backdrop after the restyle.
- `MonthYearPicker`'s `row-reverse` + `flexWrap` was reasoned from flexbox semantics, not rendered — worth an eyeball.
- Heebo adds font assets → **the next build must be a full EAS build, not an OTA update.**
- Deferred: special-Shabbat name (e.g. שבת שובה) needs a new `DayData` field; multi-day holiday spans in the week all-day row need cross-day metadata.

### Next steps
Device-verify, then EAS build (not OTA). Optional follow-ups: the notification-permission rows' placement in Settings, and multi-day holiday spanning.

---

## 2026-06-18 — Session: Multi-day events — Slice C (span chip rendering)

**Phase:** Phase 5 (multi-day events)
**Sub-agents:** mobile-ui-builder (DayCell per-corner span radii + fixed bar height + memo; tagMapper top-lane ordering + blank-middle label). Orchestrator: Option A reconfirmed + 2 sub-decisions resolved with user (top-lane ordering w/ holiday-bump trade-off; blank middle bars); delegation plan (approved); integration gate; docs; commit.
**Status:** Code complete. DoD: typecheck 0, expo-doctor 17/17. **On-device verification open** (orchestrator can't drive an emulator). Slice B was device-verified before this slice.

### What was done (mobile-ui-builder) — cosmetic only, month grid
- **`DayCell.tsx`:** `DayCellTag` gained `segment?: { isStart; isEnd }`. Segment chips get per-corner radii — **RTL: visual start = RIGHT** so `isStart` rounds the right corners, `isEnd` rounds the left, middle is all-square; no-segment chips unchanged (uniform `radius.xs`). Added `SEGMENT_CHIP_HEIGHT = 18` `minHeight` so blank middle/end bars match the titled start bar height and line up. `memo` comparator extended to compare `segment.isStart/isEnd` (else a cell won't re-render when a span's role flips).
- **`tagMapper.ts`:** user notes split into `spanTags` (segment defined) vs `normalNoteTags`; **spans emitted FIRST** (top lane) so a bar holds the same slot every day → aligns across the week. Label rule: title on `isStart` only, `''` on middle/end. Holiday/special/single-note ordering among themselves unchanged; spans simply lifted to the front.

### Decisions made
- Logged **Multi-day Slice C — top-lane span ordering** in DECISIONS.md (2026-06-18): spans render before holiday/special/note tags so single-span bars align; accepted trade-off — on a span+holiday day the holiday TAG may fall into DayCell's `+N` overflow, but the green `isHoliday` cell tint still conveys it.

### Notes / scope held
- No data/query/schema/hook change — `CalendarNote.segment` already stamped by `useDatesNotes` (Slice A). MonthGrid, useNotes, StorageService, day.tsx untouched.
- Option A (per-cell segment chips) — **no edge-bleed** (chips stay within cell padding; square edges read as a run across the hairline gap). Negative-margin bleed deliberately deferred.

### Open issues / blocked
- **On-device verification NOT done:** confirm a 3-day span shows right-rounded titled start, square blank middle, left-rounded blank end (same color/height), stays aligned on a day that also has a holiday, wraps correctly across a week boundary, and single-day chips look unchanged.
- **Known limits (deferred):** multiple *simultaneously-overlapping* spans aren't lane-assigned (each renders, but 2+ on one day may not align); a span continuing in from the previous month shows no title that month; edge-bleed not implemented.
- Not yet committed/pushed/OTA'd at time of writing (orchestrator commits this entry).

### Next steps
- Device-verify Slice C, then push + OTA if desired. Multi-day events feature (A–C) is then functionally complete for the common case.
- Remaining backlog: **Slice D** — `.ics` VEVENT all-day `DTEND` EXCLUSIVE (last-day + 1) on export; optional overlapping-span lane assignment; optional edge-bleed; multi-day recurring (separate decision).

---

## 2026-06-18 — Session: Multi-day events — Slice B (end-date picker UI)

**Phase:** Phase 5 (multi-day events)
**Sub-agents:** mobile-ui-builder (new `HebrewFullDatePicker` day+month+year sheet + NoteEditor multi-day toggle/end-date row/view-field + `endDate` threading). Orchestrator: 2 UX forks resolved with user (Hebrew drum, behind a toggle); delegation plan (approved); pre-flight verified DateService helpers exist; integration gate; docs; commit.
**Status:** Code complete. DoD: typecheck 0, expo-doctor 17/17. **On-device verification still open** (orchestrator cannot drive an emulator).

### UX decisions (user-locked this session)
- End-date input = **Hebrew 3-column drum** (day+month+year), reusing `HebrewDateWheel`; returns Gregorian via `HDate.greg()`; clamp `end >= start`.
- Entry point = **"מרובה ימים" toggle**, visible only when `allDay === true` (and, per scope, `recurrenceType === 'none'`); OFF by default = single day.

### What was done (mobile-ui-builder)
- **NEW `src/components/calendar/HebrewFullDatePicker.tsx`** — sibling of `HebrewDatePicker` (the latter UNCHANGED, since MonthGrid relies on its `onConfirm(hYear,hMonth)` signature). 3 columns `[day, month, year]` (day rightmost under row-reverse). Day length/clamp via `getHebrewDaysInMonth(hMonth, hYear)` (month-first arg order); month list via `getHebrewMonthsForYear`; year ±50. Clamps day on month/year change and month on leap→common year change. Sibling-Pressable backdrop, Gregorian caption, ביטול/אישור. PURE — `onConfirm(greg)` only; no clamping (NoteEditor owns the `end >= start` clamp).
- **`src/components/notes/NoteEditor.tsx`** — added `endDate?: Date` to `Props.onSave`; new state `multiDay`/`endDate`/`endPickerVisible`; reset effect seeds them from `note.endDateStr` (multi-day iff `endDateStr > gregorianDateStr`); guard effect auto-clears `multiDay` when `!allDay || recurrenceType !== 'none'`; "מרובה ימים" toggle (gated `allDay && recurrenceType==='none'`) + "עד תאריך" chip row (Hebrew label via `getDayData(endDate).hebrewDate`) opening the picker; clamp on confirm via `formatDateKey(greg) < formatDateKey(date)` string compare; view-mode "עד תאריך" read-only field for existing multi-day notes; `endDate` threaded into `doDirectSave` only when `multiDay && allDay && recurrenceType==='none'` (else `undefined` = single-day, Slice A back-compat).

### Notes / scope held
- No data-layer change — `saveNote` already accepts `endDate` (Slice A). Timed branch, reminder logic, and recurring occurrence-exception/tombstone paths untouched.
- Multi-day kept mutually exclusive with recurrence (guard effect) — no multi-day-recurring rows can be created, consistent with the locked non-recurring scope.

### Open issues / blocked
- **On-device verification (the DoD's manual Android step) NOT done** — create a 3-day all-day event, confirm it shows on all 3 days in Day view + Month grid (plain chips — span styling is Slice C), the toggle hides for recurring/timed, picking an earlier end clamps to start, and editing an existing multi-day note re-populates the toggle + end date + view field.
- Not OTA'd (per user: push without OTA). Slice B is JS-only and OTA-eligible when desired.

### Next steps
- Device-verify Slice B. Then **Slice C:** segment-aware chip styling in DayCell/tagMapper (consume `CalendarNote.segment` — rounded start/end, square middle, RTL-correct). Confirm Option A vs B visual with user at that point.

---

## 2026-06-18 — Session: Multi-day events — Slice A (data foundation)

**Phase:** Phase 5 (multi-day events)
**Sub-agents:** database-architect (v6 migration: backfill `end_date` + index + SCHEMA.md), local-data-builder (CalendarNote `endDateStr`/`segment`, `saveNote(endDate)`, overlap queries, `useDatesNotes` per-day expansion). Orchestrator: read-only investigation + independent proposal; Slice A delegation plan (user-approved); sequencing (db-arch → data layer); integration gate; docs; commit.
**Status:** Complete. DoD passed (typecheck 0, expo-doctor 17/17). JS+migration — no native change.

### Key finding (investigation)
The `events` table was **already multi-day-ready at the storage layer**: `end_date`/`end_datetime` columns exist since v1 and are written (`saveEvent`) and read (`rowToEvent`). The feature gap was never storage — it was that every write path collapsed `end` onto `start`, no query treated events as ranges, the UI dropped `end.date` at the `CalendarNote` mapping, and there is no span rendering / end-date editor. So Slice A needed **no structural migration** — only a backfill + index and a read/mapping/expansion layer.

### Scope (locked for Slices A–C, user-confirmed)
- **Non-recurring only** (`recurrence_type = 'none'`). Recurring expansion (`expandRecurringNotes`) stays single-day, untouched.
- Rendering direction: **per-cell segment chips (Option A)**, NOT overlay bars — chosen to avoid the project's #1 risk area (RTL/overlay geometry).
- Day view: a multi-day event shows on **every** day in its range (same title each day).
- Slice order: **A (data) → B (editor) → C (rendering polish)**.

### What was done
- **database-architect — v6 migration.** New `schemaV6Migrated` block inside the existing `ensureSchema` transaction (after v5): `UPDATE events SET end_date = start_date WHERE end_date IS NULL` (guarantees `end_date` non-null → overlap query needs no COALESCE) + `CREATE INDEX IF NOT EXISTS idx_events_daterange ON events (start_date, end_date)`. Idempotent (flag + WHERE-guard + IF NOT EXISTS). `docs/SCHEMA.md` updated (migration history v6, `end_date` non-null note, Indexes section).
- **local-data-builder — data layer.**
  - `CalendarNote` (useNotes.ts): added `endDateStr?: string | null` (mapped `e.end?.date` in `eventToCalendarNote` — previously dropped) and transient `segment?: { isStart; isEnd }` (produced by expansion, **consumed in Slice C**, unused now).
  - `saveNote`: added `endDate?: Date` param; all-day branch sets `end.date = formatDateKey(endDate ?? date)` with a defensive clamp (`end < start` → single-day). Timed branch unchanged. No caller wired yet (Slice B) — back-compat: omitting `endDate` = single-day, byte-identical.
  - Overlap queries (StorageService.ts): `getEventsForGregorianDate` → `start_date <= ? AND end_date >= ?` (both args = day) so days 2…N show in Day view; `getNotesInRange` → interval-overlap (`start_date <= gridEnd AND end_date >= gridStart`) so spans straddling the grid boundary are caught. Sole caller of `getNotesInRange` confirmed = `useDatesNotes`.
  - `useDatesNotes`: direct-notes loop now expands a multi-day note into each covered day (clamped to the grid), DST-safe ms-step iterator, stamping `segment` flags on shallow copies. Single-day path and the recurring `instances` loop unchanged.

### Decisions made
- Logged **Multi-day events (Slice A data foundation)** in DECISIONS.md (2026-06-18): storage was already range-capable; non-recurring scope; overlap-query semantics; `end_date` backfilled non-null + index; `segment` metadata produced in data layer / consumed in rendering; Option-A per-cell segment chips chosen over overlay bars.

### Open issues / blocked
- **No device verification yet** — Slice A ships no UI to create a multi-day event, so the full create→render loop is verifiable only after **Slice B** (end-date picker). Slice A verification was: SQL-overlap correctness trace (agent-provided, code-confirmed) + typecheck + expo-doctor. A hand-inserted `end_date > start_date` row is the only way to exercise rendering before Slice B.
- **`.ics` export (Slice D):** `getAllEvents` already reads `end.date`, but iCal all-day `DTEND` is **exclusive** (must be last-day + 1). VEVENT export needs that adjustment — flagged, out of Slice A.
- **Multi-day recurring:** explicitly deferred (separate future decision).

### Next steps
- **Slice B:** NoteEditor end-date picker (reuse `HebrewDateWheel`), validation (`end >= start`), thread `endDate` through `onSave` → `saveNote`. Then device-verify the create→render loop.
- **Slice C:** segment-aware chip styling in DayCell/tagMapper (rounded start/end, square middle, RTL-correct) consuming `CalendarNote.segment`. Confirm Option A vs B visual with user at that point.

---

## 2026-06-17 — Session: Shabbat card — 4-city table + user location row

**Phase:** Phase 5 (Shabbat card enhancement)
**Sub-agents:** local-data-builder (Wave 1: ZmanimService `getCandleAndHavdalah`/`getShabbatTable`/`FIXED_CITIES` + `useShabbatTable` hook), mobile-ui-builder (Wave 2: ShabbatCard Friday-table rewrite). Orchestrator: read-only investigation that surfaced 4 spec-vs-code conflicts → user clarified 3 decisions; two-wave sequencing; integration gate; docs; commit + OTA.
**Status:** Complete. DoD passed (typecheck 0, expo-doctor 17/17). JS-only — OTA pushed.

### Conflicts caught before building (user-resolved)
- The spec's `zmanim.getTzeit()` **does not exist** in kosher-zmanim (node-verified). The spec also self-contradicted ("tzeit hakochavim (R״T)" vs "do not use 72"). → **Geonim 8.5°** (`getTzaisGeonim8Point5Degrees`), not R״T/72.
- Spec's flat 18-min / `candleLightingLeadMinutes` candle offset would be halachically wrong. → **Per-city minhag** via existing `getCandleLightingOffset` (ירושלים 40, חיפה 30, else 18).
- Spec said create `src/components/calendar/ShabbatCard.tsx`, but a ShabbatCard already exists in `zmanim/`. → **Rewrite in place**, keep Saturday behavior, day.tsx untouched.

### What was done
- **Wave 1 (local-data-builder).** ZmanimService: `getCandleAndHavdalah(date, lat, lng)` REUSES `getZmanim` — candle = Friday `getZmanim(date).candleLighting` (per-city offset baked in), **havdalah = Saturday `getZmanim(date+1).tzeitHakochavim`** (Geonim 8.5°; correct Saturday-night anchor). `getShabbatTable(date, userLat?, userLng?, userLabel?)` → 4 fixed cities + optional user row (last, `isUserRow`). `FIXED_CITIES` exported. New `useShabbatTable(date)` hook: pulls LocationProvider coords/source/cityHebcalKey; gates the user row on `source !== 'default'` (no duplicate Jerusalem); label via `findCityByKey().nameHe` fallback 'המיקום שלי'; memoized; does NOT read SettingsProvider.
- **Wave 2 (mobile-ui-builder).** `src/components/zmanim/ShabbatCard.tsx` rewritten in place: Friday → header (הדלקת נרות / צאת שבת) + per-row table (city name flex:1 rightmost, two 72px centered time cells, `row-reverse`), user row bold + `colors.accent`, divider only when `rows.length > 4`; `useShabbatTable` called before the early return (Rules of Hooks). Saturday branch (צאת השבת + ר״ת) and the Props interface UNCHANGED → day.tsx needed no edit (Task 4 was a no-op; ShabbatCard was already wired there). Title uses `colors.tagShabbat` (`colors.holiday` doesn't exist in ThemeColors).

### Decisions made
- Logged **Shabbat 4-city table** in DECISIONS.md (2026-06-17): Geonim 8.5° havdalah; per-city minhag offset; Saturday-night havdalah anchor via `getZmanim` reuse; user row from LocationProvider (gated on source≠default), distinct from the SettingsProvider candle-lighting override; ShabbatCard enhanced in place.

### Orchestrator note (sample verification)
- Node-verified Friday **2026-06-19** times: ירושלים 19:07 / 20:29 · תל אביב 19:31 / 20:32 · חיפה 19:20 / 20:34 · באר שבע 19:29 / 20:29 (הדלקה / צאת). Jerusalem candle (40-min minhag) correctly earlier than Tel Aviv (18-min). NOTE: the engine uses elevation=0 throughout, so the DoD's "Jerusalem later via elevation" does not manifest — candle ordering is driven by per-city offset + sunset, as designed.

### Open issues / blocked
- **Behavioral change:** Friday card's user row now reflects the **LocationProvider** location, not the SettingsProvider candle-lighting city override (per the locked decision). A user who set a separate candle-lighting city for notifications will see the table user row track their main location. Candidate for the future LocationProvider+SettingsProvider unification.
- Device verification: confirm the table renders on a Friday with correct RTL column alignment and the user row + divider; non-Fri/Sat shows nothing; Saturday still shows צאת השבת + ר״ת.

### Next steps
- On-device Friday/Saturday check; consider Slice-2 of the Hebrew date picker (separate backlog).

---

## 2026-06-17 — Session: Hebrew drum date picker — Slice 1 (header tap, month+year)

**Phase:** Phase 5 (Hebrew date picker, slice 1 of 2 — header tap; Slice 2 = NoteEditor date row, separate session)
**Sub-agents:** local-data-builder (Wave 1: DateService `getHebrewMonthsForYear`/`getHebrewDaysInMonth` + CalendarProvider `navigateToHebrewMonth`), mobile-ui-builder (Wave 2: `HebrewDateWheel` + `HebrewDatePicker` + MonthGrid mode-aware wiring). Orchestrator: ran the pre-flight design consult, two-wave sequencing, integration gate (fixed a `.value`→`.month` typecheck error), DoD, docs, commit + OTA.
**Status:** Complete. DoD passed (typecheck 0, expo-doctor 17/17). JS-only — OTA pushed.

### What was done

- **Wave 1 — data (local-data-builder).** `DateService.getHebrewMonthsForYear(hYear)` returns `{month, nameHe}[]` in **Tishrei-first** order, leap-aware (13 entries with אדר א׳ at pos 6 / אדר ב׳ at pos 7; common year 12 entries with single אדר at pos 6), Hebrew names from the existing name table. `DateService.getHebrewDaysInMonth(hMonth, hYear)` wraps `HDate.daysInMonth(month, year)`. `CalendarProvider.navigateToHebrewMonth(hYear, hMonth)` — day-15 anchor, sets Hebrew cursor, `refreshHebrewMonth()`, syncs `selectedDate` to the anchor's Gregorian date. `navigateHebrewMonth(±1)` untouched. Node-verified the leap/common month lists.
- **Wave 2 — UI (mobile-ui-builder).** New `HebrewDateWheel` (pure presentational N-column drum: per-column `WheelColumn` with its own ref/effect, `ITEM_HEIGHT=44`, `snapToInterval`+`decelerationRate=fast`, centering via `contentContainerStyle.paddingVertical=2*ITEM_HEIGHT`, highlight band `pointerEvents=none`, `row-reverse` so month is rightmost). New `HebrewDatePicker` (bottom-sheet modal, sibling-`Pressable` backdrop, month+year columns, year range ±50, leap-aware month clamp on year change, Gregorian-equivalent caption, אישור/ביטול). MonthGrid title tap is now mode-aware: hebrew → `HebrewDatePicker` (→ `navigateToHebrewMonth` + close); gregorian → `MonthYearPicker` unchanged.

### Decisions made

- Logged **Hebrew drum date picker (Slice 1)** in DECISIONS.md (2026-06-17): Tishrei-first order; replace MonthYearPicker on the Hebrew tab; hand-rolled ScrollView drum with `paddingVertical` (not iOS-only `contentInset`) and sibling-Pressable backdrop; `navigateToHebrewMonth` jump action; DateService hebcal helpers.

### Orchestrator fix (caught at the integration gate)

- HebrewDatePicker's month/year `onIndexChange` handlers read `.value` off the `monthList`/`newMonths` arrays (shape `{month, nameHe}`, property is `.month`) — TS2339, two sites. Fixed `.value`→`.month` directly (one-symbol fix; cold re-spawn was the expensive path). typecheck re-verified 0.

### Open issues / blocked

- **Slice 2 not built:** NoteEditor editable date row (day+month+year) — reuses `HebrewDateWheel` (add a day column) + `HebrewDatePicker`; `getHebrewDaysInMonth` already exists for the day column length + clamp. Separate session.
- **Device verification still needed** (the one thing static review can't prove): Android drum snapping with no scroll-steal/snap-back; first/last items reach center (the `paddingVertical` fix); month-swipe on the calendar still coexists with the modal; leap-year Adar I/II appear and clamp correctly.

### Next steps

- On-device test per the DoD checklist; then Slice 2 (NoteEditor date row).

---

## 2026-06-17 — Micro-entry: MonthGrid 6-row month scroll + auto-scroll

**Sub-agents:** mobile-ui-builder (`src/components/calendar/MonthGrid.tsx`). Orchestrator: ran the pre-flight (parent-screen ScrollView check), DoD gate, commit + OTA.
**Status:** Complete. DoD passed (typecheck 0, expo-doctor 17/17). JS-only — OTA pushed.

- **Problem:** 6-week-row months render 660px (6×110) and the last row was clipped behind the bottom tab bar — unreachable. MonthGrid is a locked manual `View` grid (NOT a FlatList).
- **Pre-flight:** confirmed neither parent screen (`app/(tabs)/index.tsx`, `app/(tabs)/gregorian.tsx`) has a ScrollView, so wrapping the grid internally introduces no nested-ScrollView conflict. Also noted the wrapping `GestureDetector` Pan uses `.failOffsetY([-15,15])` → it yields to vertical drags, so the new vertical ScrollView coexists with month-swipe.
- **Fix:** the week-rows block is extracted into a `gridRows` const and rendered conditionally — `weekCount > 5` (i.e. 6-row months) wraps it in a `ScrollView` (`ref`, `style={styles.gridScroll}` = `flex:1`, no scroll indicator); ≤5-row months keep the byte-for-byte-unchanged static `<View>` (the common path, no behavior change). The day-name header stays pinned above the conditional. A `useEffect([needsScroll, selectedRowIndex])` auto-scrolls to `selectedRowIndex * 110` when a 6-row month mounts/changes, with a `selectedRowIndex >= 0` guard (no scroll when selectedDate isn't in the displayed month). `weekRow` height stays 110; no FlatList; RTL untouched; new `gridScroll` style is a StyleSheet token (no inline).

### Next steps (on-device verification)
- A 6-row month (e.g. a month starting late in the week) shows all 6 rows and scrolls to the selected day's row; month-swipe (horizontal) still works alongside vertical scroll; a 5-row month renders unchanged (no scroll, no jump); both Hebrew (RTL) and Gregorian tabs.

---

## 2026-06-17 — Micro-entry: NoteEditor Android scroll-blocking fix

**Sub-agents:** mobile-ui-builder (restructure in `src/components/notes/NoteEditor.tsx`). Orchestrator: diagnosed the root cause, ran the DoD gate, removed the now-dead `TouchableWithoutFeedback` import, committed + OTA.
**Status:** Complete. DoD passed (typecheck 0, expo-doctor 17/17). JS-only — OTA pushed.

- **Follow-up to the keyboard-scroll fix earlier today.** The `ScrollView` added for keyboard handling scrolled "stickily" and snapped back to 0 on Android. Root cause: the ScrollView was nested inside two `TouchableWithoutFeedback` wrappers (the backdrop `onClose` TWFB and an empty "swallow taps" guard); on Android a wrapping TWFB wins the move-responder mid-drag and cancels the native scroll (canonical anti-pattern). Fix: removed BOTH TWFB wrappers; the backdrop tap-to-dismiss is now a sibling `Pressable onPress={onClose} style={StyleSheet.absoluteFill}`, rendered JSX-first inside `View(s.overlay)` so the sheet paints on top. The `ScrollView` now has no touchable ancestor → uncontested responder chain. KAV, ScrollView props, sheet styles, and all RTL rows unchanged. Removed the orphaned `TouchableWithoutFeedback` import.
- Final nesting: `Modal → View(s.overlay) → [Pressable(backdrop) | KeyboardAvoidingView → View(s.sheet) → ScrollView]` (Pressable and KAV are siblings).

---

## 2026-06-17 — Session: NoteEditor UX fixes (keyboard scroll + inline reminder-time chip)

**Phase:** Phase 5 (post-Gal-C cleanup)
**Sub-agents:** mobile-ui-builder (both fixes in `src/components/notes/NoteEditor.tsx`). Orchestrator: read-only investigation, surfaced a locked-decision conflict for the user's call, ran the DoD gate, committed + OTA.
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 17/17). JS-only — OTA pushed.

### What was done

- **Bug 5 — keyboard hid NoteEditor fields (mobile-ui-builder).** The bottom-sheet content was already inside a `KeyboardAvoidingView` but not scrollable, so opening the keyboard pushed the title off the top with no way to reach it. Fix: wrapped the view/edit mode ternary in a bounded `ScrollView` (`keyboardShouldPersistTaps="handled"`, `showsVerticalScrollIndicator={false}`) inside `View(s.sheet)` below the drag handle, and added `maxHeight: '85%'` to `s.sheet` to give the ScrollView bounds. The KAV got **no** `flex:1` (that would unpin the bottom sheet); both `TouchableWithoutFeedback` close-guards and all `row-reverse` rows preserved.
- **Bug 4 — reminder time prompt re-fired on every save (mobile-ui-builder).** Previously, saving an all-day event with a reminder fired the time picker as a modal prompt every time (deferred-save via `pendingSaveTarget` + `triggerSaveWithReminderTime`). Replaced with an **always-visible inline "שעת תזכורת" chip** shown when `allDay && reminderEnabled`, directly below the reminder toggle; tapping it opens the existing `useTimeOfDayPicker`. Removed the `pendingSaveTarget`/`triggerSaveWithReminderTime` state, the deferred-save effect, and the save-time auto-prompt branch in `doDirectSave`; `onSave` now always passes a concrete `reminderTime` (`allDay ? reminderTime : null`), so the locked C2 defensive-09:00 path never fires silently. `reminderTime` default stays 09:00 — now the honest displayed default rather than a hidden fallback.

### Decisions made

- **Approach chosen by user: inline time chip (UI-only)** over (a) full end-to-end persistence of the clock-time or (b) implementing the brief's "guard the prompt" literally. Rationale: option (b) would have hit the C2 defensive-09:00 fallback on every re-save of an existing all-day reminder (the clock-time is not persisted in `CalendarNote`), silently resetting the user's chosen time — a regression. The inline chip kills the repeating prompt while always supplying a concrete time. No new DECISIONS.md entry (no new architectural lock; respects the existing C2 contract).

### Open issues / blocked

- **KNOWN CAVEAT (accepted) — reminder clock-time is not persisted.** Re-editing an existing all-day reminder shows 09:00 in the chip, not the originally-picked time, because `CalendarNote` stores only `reminderMinutes` (the lead), never the clock anchor. Acceptable for now. True fix = persist `reminderClockTime` end-to-end (database-architect migration + local-data-builder save/load + UI) — a separate future task.
- Pre-existing post-Gal-C backlog unchanged: exception-aware recurring reminders; LocationProvider+SettingsProvider unify; Holiday card; Hebrew month/year picker; weekly-DST verify.

### Next steps

- **On-device verification (this feature):** open NoteEditor, tap title → keyboard no longer hides it, can scroll to all fields; create an all-day birthday with a reminder → "שעת תזכורת" chip appears showing 09:00, no auto modal on save; tap chip → picker opens, picked time persists in the chip and is used for the notification; edit an existing all-day reminder → chip shows 09:00 (the accepted caveat), saving does not silently break the reminder; timed events still anchor off start time (no chip).

---

## 2026-06-17 — Micro-entry: expo-doctor baseline 16/17 → 17/17

- Committed the standalone `POST_NOTIFICATIONS` permission gate on the event-reminder toggle in NoteEditor (`acf610c`).
- During that commit's DoD gate, `npx expo-doctor` reported **17/17 checks passed** — the long-standing metro.config.js custom-config warning (which had held the baseline at 16/17 since a4889c3) resolved itself automatically. No config was touched to achieve this.
- **expo-doctor baseline upgraded 16/17 → 17/17.** Updated CLAUDE.md (English DoD code-comment block, the build-gate paragraph, the react-native-svg known-issue note, and the Hebrew DoD summary) to drop the metro.config.js warning as a known/accepted failure. Docs-only change; no OTA.

---

## 2026-06-05 — Session: Gal C — C4 recurring reminders + yearly renewal (Gal C closes)

**Phase:** Phase 5 (Gal C, session 4 of 4 — closes Gal C: event time + full recurrence)
**Commits:** (this session) C4 reminders + renewal + this docs entry
**Sub-agents:** local-data-builder (Wave 1: NotificationService.ensureRecurringReminders + StorageService getRecurringRemindableEvents/getEventsNeedingRenewal/confirmRenewal/suppressRenewal), mobile-ui-builder (Wave 2: _layout.tsx init wiring + sequential yearly-renewal Alert dialog). Orchestrator: ran the DoD gate.
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline, no new deps). JS-only — ready for OTA (push pending user go).

### What was done

- **Wave 1 — reminders + renewal logic (local-data-builder).** `NotificationService.ensureRecurringReminders()` — additive sweep for daily/weekly/monthly reminders: 60-day forward window, ≤20/event, Gregorian JS-Date occurrence generation (daily/weekly/monthly with day-of-month skip for non-existent days), fire time = timed→master HH:MM on occurrence−lead / all-day→09:00−lead, id `evt-{eventId}-{YYYYMMDD}`, cancel-then-reschedule per event for idempotency. No useNotes/expandRecurringNotes import (circular-safe). `ensureAnnualReminders` untouched. StorageService: `getRecurringRemindableEvents` (daily/weekly/monthly + reminder + is_exception=0), `getEventsNeedingRenewal` (SQL pre-filter on yearly/reminder/not-suppressed/11-month grace + JS check that the most-recent occurrence has passed since `created`, hebrew via HDate), `confirmRenewal` (last_renewal_ask=today YYYY-MM-DD), `suppressRenewal` (renewal_ask_suppressed=1).
- **Wave 2 — init wiring + renewal dialog (mobile-ui-builder).** `app/_layout.tsx`: `await NotificationService.ensureRecurringReminders()` added after `ensureAnnualReminders()` in init (sequential). New `useEffect` gated on `settingsReady` with a `useRef` once-per-launch guard → `getEventsNeedingRenewal()` → SEQUENTIAL Alerts ("תזכורת שנתית" / "האם להמשיך לקבל תזכורת עבור {summary}?"): "המשך"→confirmRenewal+next, "אל תשאל שוב"→suppressRenewal+next, dismiss→next without writing (reappears next launch). All hooks before the early return; non-blocking.

### Decisions made

- Logged **Gal C C4** in DECISIONS.md (2026-06-05): sweep-on-init recurring reminders (60d/20-cap, evt-{id}-{date} ids, cancel-then-reschedule, Gregorian arithmetic, no circular import); yearly renewal prompt (criteria, confirm/suppress, root _layout host, sequential Alerts, dismiss=reappear, YYYY-MM-DD last_renewal_ask). **Gal C complete (C1–C4).**

### Open issues / blocked

- **KNOWN LIMITATION — recurring reminders are NOT exception/tombstone-aware.** The sweep schedules the master series only, so a reminder can still fire for an occurrence deleted "לתאריך זה בלבד", and an override's edited time isn't used. Deliberately out of C4 scope — first post-Gal-C cleanup candidate (fetch exceptions + overlay in the sweep).
- **Aggregate iOS 64-notification cap** not enforced across events (only candle-lighting self-caps). Revisit if hit.
- View-mode "עוגן תאריך" cosmetic note (from C3) unchanged.

### Next steps

- **On-device verification (this feature):** daily event w/ reminder ~2 min out → notification arrives; weekly → correct weekday; all-day recurring → fires at 09:00−lead; a yearly event past its anniversary (with reminder) → renewal dialog on next launch; "המשך" → gone, reminder stays, re-arms; "אל תשאל שוב" → never reappears; dismissed → reappears next launch; brand-new yearly (anniversary not passed) → no dialog; non-yearly recurring → no dialog.
- **OTA push** on user go: `eas update --branch preview --message "feat: Gal C — C4 recurring reminders + yearly renewal"`.
- **Gal C is closed.** Post-Gal-C backlog (from earlier sessions): exception-aware reminders; unify LocationProvider+SettingsProvider; Holiday card (Yom Tov); Hebrew month/year picker; weekly-DST verify.

---

## 2026-06-05 — Session: Gal C — C3 follow-up bugfix (recurrence anchor gate)

**Phase:** Phase 5 (Gal C, C3 follow-up bug fix)
**Commits:** (this session) the NoteEditor anchor-gate fix + this docs note
**Sub-agents:** none — single-file targeted fix applied directly by the orchestrator (exact change pre-diagnosed; cold sub-agent spawn for one gate is the expensive path).
**Status:** Complete. DoD: typecheck 0 errors. JS-only — OTA pushed.

### What was done

- **`src/components/notes/NoteEditor.tsx` — view-mode recurrence anchor gate.** Root cause (both reported symptoms, one gate): the view-mode "עוגן תאריך" block was gated on `isRecurring` (`noteType !== 'note'`). That over-showed the calendar label for any birthday/yahrzeit/anniversary regardless of `recurrenceType` (reported "label shows for all events"), AND under-showed it for a plain `note`-type event set to yearly (`isRecurring` is false for `note`, reported "anchor chips don't appear for yearly"). It also read the legacy `calendarType` instead of `recurrenceCalendar`. Fix: gate on `recurrenceType === 'yearly' && recurrenceCalendar != null` and display `recurrenceCalendar`. Removed the now-orphaned `const isRecurring` (its sole consumer). The EDIT-mode anchor chips (gated on local `recurrenceType === 'yearly'`) were already correct — no change needed there.

### Open issues / blocked

- None new. C4 (notifications + renewal) remains the next Gal C session.

### Next steps

- On-device confirm: a yearly `note`-type event now shows its anchor in view mode; a birthday with non-yearly (or none) recurrence no longer shows the anchor; edit-mode עברי/לועזי chips appear when yearly.

---

## 2026-06-05 — Session: Gal C — C3 recurrence UI + per-occurrence edit/delete

**Phase:** Phase 5 (Gal C, session 3 of 4 — recurrence UI; C4 notifications + renewal follow)
**Commits:** (this session) C3 recurrence UI + this docs entry
**Sub-agents:** local-data-builder (Wave 1: saveNote explicit recurrence params + extended `saveExceptionForOccurrence` overrides + `getEventById`), mobile-ui-builder (Wave 2: `recurringId.ts` helper + NoteEditor recurrence picker/anchor chips + edit/delete-occurrence dialogs at all triggers + dead color-quick-pick removal). Orchestrator: added two `useNotes` occurrence wrappers, fixed a deferred-save/edit-all interaction bug, ran the DoD gate.
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline, no new deps). JS-only — ready for OTA (push pending user go).

### What was done

- **Wave 1 — data shape (local-data-builder).** `saveNote` gained explicit optional `recurrenceType` + `recurrenceCalendar` (explicit wins; old noteType→yearly stays as fallback; yearly defaults calendar to hebrew, monthly honors calendar, daily/weekly/none → no calendar). `saveExceptionForOccurrence` overrides extended to the full editable set (summary, location, colorId, category, allDay, startDateTime/endDateTime, reminderMinutes). New `StorageService.getEventById`.
- **Orchestrator — useNotes occurrence wrappers.** Added `deleteOccurrence(masterId, occurrenceDate)` (tombstone) and `saveOccurrenceException(masterId, occurrenceDate, overrides)` thin wrappers (StorageService call + notes refresh) so the UI consumes the hook, not StorageService directly (ownership: useNotes is data-layer).
- **Wave 2 — UI (mobile-ui-builder).** New `src/utils/recurringId.ts` `splitInstanceId`. NoteEditor: "חזרה" chip row (none/daily/weekly/monthly/yearly) for all types + yearly-only עברי/לועזי anchor chips; threads recurrenceType/recurrenceCalendar through onSave; inits from the edited note. Edit/delete recurring instance → 2-choice Alert ("לתאריך זה בלבד" / "לכל התאריכים") at NoteEditor toolbar, NoteList ✕, and day.tsx grid: this-date → saveOccurrenceException/deleteOccurrence; all-dates → saveNote(masterId, anchor=note.gregorianDateStr local-midnight)/deleteNote(masterId). Removed the dead color-quick-pick Modal + its state/styles/imports.

### Decisions made

- Logged **Gal C C3** in DECISIONS.md (2026-06-05): explicit recurrence picker replaces implicit derivation; composite-id addressing for occurrence ops; 2-choice edit/delete dialogs at every trigger; edit-all anchors on the master's original date; dead color-quick-pick removed.

### Orchestrator fix (caught at the integration gate)

- **Deferred-save (C2 all-day+reminder) ignored C3 edit-all target.** The C2 effect that runs after the reminder-time prompt rebuilt `onSave` with `note?.id` (composite) + `date` (occurrence), so editing a recurring **all-day-with-reminder** event (birthday/yahrzeit — the common case) via "לכל התאריכים" would write a STRAY row at the composite id / occurrence date instead of updating the master. Fixed: `doDirectSave` now stashes the resolved `{id, date}` in `pendingSaveTarget` before opening the reminder picker, and the deferred effect consumes it (correct masterId + series anchor). Applied directly by the orchestrator (NoteEditor UI logic, ~6 targeted edits; cold re-spawn was the expensive path). typecheck re-verified 0 after.

### Open issues / blocked

- **C4 scope:** daily/weekly/monthly events now exist but have NO reminder scheduling (`ensureAnnualReminders` is still yearly-only); the yearly renewal prompt ("האם להמשיך לקבל תזכורות?") is unbuilt. Both are C4.
- **View-mode "עוגן תאריך"** still shows calendarType for all recurrence types — cosmetic; consider hiding for non-yearly (C4 polish).
- **`onDeleteOccurrence`/`onSaveOccurrenceException` are optional props** (no-op if a future caller forgets them) — all current callers pass them.
- **Weekly DST drift** (from C1) still to verify on device.

### Next steps

- **On-device verification (this feature):** daily/weekly/monthly/yearly-hebrew/yearly-gregorian recurring events appear on the right days; edit/delete "לתאריך זה בלבד" affects only that date; "לכל התאריכים" affects the series without shifting the anchor; existing birthdays/yahrzeits still appear; non-recurring events show no dialog; **the birthday+reminder edit-all path** (the orchestrator-fixed interaction) saves correctly.
- **OTA push** on user go: `eas update --branch preview --message "feat: Gal C — C3 recurrence UI"`.
- **C4 — notifications + renewal:** daily/weekly/monthly reminder scheduling (sweep-on-init rolling window, per the locked model); yearly renewal prompt hosted in root `_layout` with `renewal_ask_suppressed`/`last_renewal_ask` (C1 columns, currently unused).

---

## 2026-06-04 — Session: Gal C — C2 event time end-to-end (UI)

**Phase:** Phase 5 (Gal C, session 2 of 4 — UI; C3 recurrence UI, C4 notifications follow)
**Commits:** (this session) C2 time UI + this docs entry
**Sub-agents:** local-data-builder (Wave 1: useNotes CalendarNote time fields + saveNote time/reminder persistence), mobile-ui-builder (Wave 2: useTimeOfDayPicker hook + NoteEditor all-day toggle/time pickers/reminder-time prompt + NoteList time display & color-quick-pick hardening + day.tsx tab-reset & hourly restructure). Orchestrator: reverted an over-reach (Wave 1 rewrote the existing Omer useTimePicker), ran the DoD gate.
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline, no new deps). JS-only — ready for OTA (push pending user go).

### What was done

- **Wave 1 — time data layer (local-data-builder).** `CalendarNote` gained `startDateTime`/`endDateTime`/`isAllDay`; `eventToCalendarNote` maps them (`isAllDay = start.dateTime == null`). `saveNote` gained OPTIONAL params `allDay` (default true), `startTime`, `endTime`, `reminderTime` (back-compat — existing callers unchanged). All-day → date-only; timed → stores `start.dateTime` AND `start.date` (so the `WHERE start_date=?` day query still finds timed events — Task 4 fix). All-day reminder fires at **reminderTime − reminderMinutes** (picked clock time replaces the hard-coded 09:00; 09:00 retained only as a commented defensive fallback).
- **Wave 2 — time UI (mobile-ui-builder).** New `src/hooks/useTimeOfDayPicker.tsx` (Date I/O, mirrors useDatePicker, honors `use24hTime` via is24Hour). NoteEditor: additive "כל היום" toggle (default ON) + start (required) / end (optional, clearable) time fields when off; reminder + all-day → prompts "באיזה שעה לתזכר?" before saving (deferred-save via a trigger effect, no double-save); `Props.onSave` widened with the 4 optional params. NoteList: HH:MM label as the last row-reverse child (left of summary) for timed notes; `onlyAllDay` prop; color quick-pick hardened to thread time+location. day.tsx: `useEffect([selectedDate]) → setActiveTab('events')`; hourly schedule moved to the אירועים tab with real `getHours()` bucketing of timed notes (tap a grid chip → opens editor via `gridEditNote`); all-day notes show in `NoteList onlyAllDay` above; torah tab keeps only ShabbatCard/holiday/Torah/Zmanim.

### Decisions made

- Logged **Gal C C2** in DECISIONS.md (2026-06-04): all-day reminder anchor = picked time − lead (no silent 09:00); timed events dual-store start.date + start.dateTime with isAllDay derived from dateTime presence; separate useTimeOfDayPicker hook (Omer useTimePicker untouched).

### Orchestrator fix (caught reviewing Wave 1)

- **Wave 1 over-reached by rewriting the existing `useTimePicker.tsx`** (a battle-tested string-based hook used by `settings.tsx` for the Omer reminder, forced-24h) into a Date API — breaking settings.tsx and changing working code. Reverted it (`git checkout HEAD -- src/hooks/useTimePicker.tsx`); the new event-time picker became a SEPARATE hook (`useTimeOfDayPicker`) built in Wave 2, the proper owner of interaction hooks. Net: Omer feature 100% untouched, no settings.tsx change, event times get a purpose-built setting-aware hook. typecheck re-verified 0 after revert.

### Open issues / blocked

- **NoteList color quick-pick is dead code** (no opener since the color dot was removed in an earlier session — `setColorPickerNote` is only ever called with null). Wave 2 hardened its save path (threads time/location) for if/when C3 re-wires it, but its reminder-anchor branch would hit the defensive 09:00 — a LATENT (currently unreachable) edge. Resolve when/if re-wired.
- **C3 hand-off:** NoteEditor `onSave` must add explicit `recurrenceType`/`recurrenceCalendar` when the recurrence picker lands (today recurrence is re-derived from `noteType`).
- **Weekly DST drift** (from C1) still to verify on device.

### Next steps

- **On-device verification (this feature):** timed event → appears in hourly grid at correct hour; all-day → NoteList above grid, no time label; reminder + all-day → prompted for time, not silent 09:00; navigate days → אירועים tab resets; NoteList timed row shows HH:MM; Omer reminder time picker in Settings still works (untouched, but confirm).
- **OTA push** on user go: `eas update --branch preview --message "feat: Gal C — C2 event time end-to-end"`.
- **C3 — recurrence UI:** recurrence picker (none/daily/weekly/monthly/yearly + hebrew/gregorian for yearly), edit/delete "לתאריך זה בלבד / לכל התאריכים" dialogs calling the C1 `saveExceptionForOccurrence`/`saveTombstoneForOccurrence`; thread recurrenceType through onSave; composite-id → master-id extraction for delete/edit.

---

## 2026-06-04 — Session: Gal C — C1 schema + data foundation (event time + recurrence)

**Phase:** Phase 5 (Gal C, session 1 of 4 — DATA ONLY; C2 time UI, C3 recurrence UI, C4 notifications follow)
**Commits:** (this session) C1 data-layer foundation + this docs entry
**Sub-agents:** database-architect (Wave 1: v5 migration + SCHEMA.md), local-data-builder (Wave 2: EventSchema enum + named-column INSERT + rowToEvent; Wave 3: expandRecurringNotes daily/weekly/monthly + composite ids + dedup; Wave 4: exception/tombstone read+write + cascade + caller audit). Orchestrator: verified the migration empirically (node:sqlite upgrade simulation), applied two forced type-compat fixes, ran the DoD gate.
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline, no new deps). NOT yet OTA-pushed — data-only, no user-visible change; hold for C2. No UI, no notification changes.

### What was done

- **Wave 1 — v5 migration (database-architect).** `StorageService.doCreateSchema` gains a `schemaV5Migrated`-gated block: 6 idempotent ALTERs (`recurrence_calendar`, `recurrence_id`, `is_exception` DEFAULT 0, `exception_date`, `renewal_ask_suppressed` DEFAULT 0, `last_renewal_ask`), all also added to CREATE TABLE for fresh installs. Then 4 in-transaction remap UPDATEs (`yearly_hebrew`→`yearly`+`hebrew`, etc.) ordered AFTER the ALTERs (recurrence_calendar must exist before it's written). `reminder_minutes`/`location` also back-filled into CREATE TABLE (harmless cleanup so fresh == upgraded). New `docs/SCHEMA.md` created.
- **Wave 2 — schema + INSERT (local-data-builder).** `EventSchema.RecurrenceType` → orthogonal `none|daily|weekly|monthly|yearly`; added optional `recurrenceCalendar`, `recurrenceId`, `isException`, `exceptionDate`, `renewalAskSuppressed`, `lastRenewalAsk` to `hebrewExtensions` (Google-Calendar core shape preserved). `saveEvent` positional `VALUES(?,…)` → **explicit named-column INSERT** (29 cols) — the key hygiene fix. `rowToEvent` null-safe-maps the 6 new columns.
- **Wave 3 — recurrence engine (local-data-builder).** `expandRecurringNotes` extended from yearly-only to daily/weekly/monthly/yearly; monthly/yearly honor `recurrenceCalendar` (HDate for hebrew, local-midnight JS Date for gregorian, skipping non-existent days in both); daily/weekly Gregorian-only with anchor lower-bound; yearly behavior preserved exactly. Virtual instances now carry composite id `${masterId}:${YYYY-MM-DD}` (shallow copy). `CalendarNote` gained `recurrenceType`/`recurrenceCalendar`. `useNotes` dedup fixed for composite ids (recurring masters excluded from the primary path; instances are authoritative — avoids the master-id/composite-id double-count).
- **Wave 4 — exceptions + audit (local-data-builder).** `getExceptions()` (returns is_exception=1 rows INCLUDING tombstones — no status filter). Overlay in `expandRecurringNotes` (optional 4th arg, no-op when empty): tombstone date → skip, override date → emit override content in-slot. Normal queries (`getEventsForGregorianDate/HebrewDate`, `getNotesInRange`, `getAllRecurringNotes`) gained `AND is_exception=0` so exception rows never leak as standalone notes. `useNotes`/`useDatesNotes` fetch + pass exceptions. New write methods `saveExceptionForOccurrence` / `saveTombstoneForOccurrence` (route through saveEvent; UNCALLED until C3). `deleteEvent` cascades: soft-cancel master + hard-delete `WHERE recurrence_id=?` children.

### Decisions made

- Logged the **Gal C recurrence/time model** in DECISIONS.md (2026-06-04): reuse start_datetime (no HH:MM cols); orthogonal recurrence_type + recurrence_calendar; per-occurrence exceptions as separate override/tombstone rows; composite instance ids; named-column INSERT; cascade-delete children. All architect-locked; the EventSchema enum change was an explicitly-approved one-time exception to the EventSchema lock.

### Orchestrator fixes (forced by the approved enum change)

- **Type-compat translations in `useNotes.saveNote` and `NotificationService.ensureAnnualReminders`** (applied directly, ~6 lines, behavior-preserving). Narrowing `RecurrenceType` broke `useNotes` (built `yearly_hebrew`/`yearly_gregorian`) and `NotificationService` (compared against them). Translated to `recurrenceType='yearly'` + `recurrenceCalendar` discrimination. Exact same runtime behavior (only yearly events get annual reminders; calendar from `recurrenceCalendar`, which the v5 remap populated for every existing yearly row). Done by orchestrator rather than a cold re-spawn for a forced 6-line consequence — consistent with the small-fix precedent. Documented as the only deviation.

### Migration verification (orchestrator, empirical)

- Built a pre-v5 events table in `node:sqlite`, inserted legacy `yearly_hebrew` birthday / `yearly_gregorian` yahrzeit / `monthly_hebrew` / `weekly` / `none` rows, ran the EXACT v5 ALTER+remap SQL: all legacy values remapped correctly, `weekly`/`none` untouched, remap idempotent (0 rows on re-run), named-column INSERT round-tripped the remapped birthday (29 cols=29 vals) with no loss and no duplicate rows. The on-device expo-sqlite run remains a user manual check (norm), but the SQL is proven.

### Open issues / blocked

- **Composite-id delete (C3 hand-off):** UI now receives notes with composite ids; `deleteNote`/edit must extract the master id before targeting the DB. Not a C1 regression (deleteNote still gets the master id from current call sites).
- **NoteList color quick-pick drops `location` (pre-existing bug, C3):** the color-only save omits `location`, silently clearing it. Flagged by the Wave 4 audit; UI file, not editable in C1.
- **`onSave`/`saveNote` need explicit `recurrenceType` (C3):** today recurrence is re-derived from `noteType` (birthday⇒yearly). The custom recurrence picker (C2/C3) must thread `recurrenceType`/`recurrenceCalendar` through `NoteEditor.onSave` and `saveNote` instead of re-deriving.
- **Weekly DST edge (C2 verify):** weekly expansion steps by pure ms; near an Israel DST transition a candidate could drift by an hour off local midnight. Daily re-extracts local parts (safe). Verify on device in C2.

### Next steps

- **C2 — time end-to-end:** NoteEditor all-day toggle + time picker writing `start.dateTime`; move the `לוח שעות` block to the אירועים tab with real hour bucketing from `start.dateTime`; time display in NoteList; fold in the activeTab-resets-on-date-change pending bug. Address the weekly DST verify.
- On-device upgrade smoke test (existing birthdays/yahrzeits still show on their anniversary; no data loss).

---

## 2026-06-04 — Session: Shabbat card in the Day "תורה וזמנים" tab

**Phase:** Phase 5 (Feature 2 of the GPS/Shabbat-card pair — completes the pair)
**Commits:** ae77c32 (extract reverseGeocode util), 81f5e81 (ShabbatCard component), 99539d7 (wire into day.tsx) + this docs entry (4)
**Sub-agents:** mobile-ui-builder (all 3 steps, one round — single owner, interdependent). Orchestrator: caught + fixed a Rules-of-Hooks violation, ran the DoD gate, committed, pushed OTA.
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline, no new deps). OTA pushed.

### What was done

- **Step 1 — extract reverseGeocode util (mobile-ui-builder).** Moved `reverseGeocodeNominatim(lat,lng)` verbatim out of `NoteEditor.tsx` into new `src/utils/reverseGeocode.ts` (one auditable network call, reusable). NoteEditor now imports it; behavior byte-for-byte unchanged.
- **Step 2 — ShabbatCard component (mobile-ui-builder, new file `src/components/zmanim/ShabbatCard.tsx`).** Renders only on Friday (`getDay()===5`: location + הדלקת נרות) and Saturday (`getDay()===6`: location + צאת השבת + ר״ת); returns null otherwise. Pure presentation — all zmanim/location arrive as props, **no network call, no useEffect**. RTL `row-reverse` + explicit `gap`, title `colors.tagShabbat` (token confirmed present in light `#6A4FB8` / dark `#9C82DC`), `colors.surface`/`radius.lg`/hairline border, tokens only. Times via `formatZmanTime` (null → '—' placeholder).
- **Step 3 — wire into day.tsx (mobile-ui-builder).** Inserted `<ShabbatCard>` as the FIRST child of the torah tab fragment, above the holiday banner. `resolvedLocationName` memo (first-non-null waterfall: `candleLightingPlaceName` → `candleLightingCity`→findCityByKey → location-store `cityHebcalKey`→findCityByKey → `findNearestCity` nearest). `cardZmanim` memo computes from the Settings candle-lighting coords (`getZmanim(selectedDate, candleLightingLat, candleLightingLng)`) when both are set, else falls back to the existing `useZmanim` result. Both memoized; existing `useZmanim`/`ZmanimList` usage untouched.

### Decisions made

- None new architecturally. Implements the locked session decisions (card location name from Settings offline — no auto-Nominatim; card zmanim from Settings candle-lighting coords for name/time consistency, with useLocationStore fallback; tzais = tzeitHakochavim 8.5°, ר״ת = tzeitRabbeinu/getTzais72; Fri/Sat only; RTL row-reverse + tokens).

### Orchestrator fix (caught at the integration gate)

- **Rules-of-Hooks violation in ShabbatCard.** The agent placed `useThemeColors()` AFTER the `if (day!==5 && day!==6) return null` guard, so the hook ran conditionally — on weekdays the component returned before calling it. Navigating Fri→weekday would crash with "rendered fewer hooks than expected." typecheck/expo-doctor cannot catch this (runtime/lint rule). This is the exact class LOCKED in DECISIONS.md (2026-06-01, "Drawer.tsx: all hook calls before any early return"). Moved `useThemeColors()` above the guard + added a comment citing the decision. Applied directly by the orchestrator (SendMessage to the warm agent is unavailable; a cold re-spawn for a one-hook reorder is the expensive path — consistent with the established small-fix precedent). typecheck re-verified 0 errors after.

### Open issues / blocked

- None. The GPS-in-Settings + Shabbat-card pair (Features 1 & 2) is complete.

### Next steps

- **On-device verification (this feature):** see the session report checklist — confirm the card shows on Fri (candle lighting) and Sat (tzais + ר״ת), is absent on weekdays, location row hidden when no name resolves, and the card's candle-lighting time matches Settings when GPS coords are set.
- Remaining backlog: Gal C — event time + recurrence (SQLite migration), a separate future session.

---

## 2026-06-04 — Session: GPS in Settings — Nominatim city + exact coords for candle lighting

**Phase:** Phase 5 (Feature 1 of the GPS/Shabbat-card pair; Feature 2 deferred to next session)
**Commits:** 9f82c22 (SettingsProvider), 2c2a7e1 (isIsraelCoords + NotificationService), f75600a (settings.tsx) + this docs entry (4)
**Sub-agents:** local-data-builder (Steps 1–3: SettingsProvider fields + isIsraelCoords + NotificationService override), mobile-ui-builder (Step 4: settings.tsx GPS button). Orchestrator: closed one under-scoped gap directly, ran the DoD gate, committed, pushed OTA.
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline, no new deps). OTA pushed.

### What was done

- **Step 1 — SettingsProvider (local-data-builder).** Added 3 persisted GPS fields — `candleLightingLat`/`candleLightingLng` (`number|null`) and `candleLightingPlaceName` (`string|null`) — wired in all three places (interface+default, setter, `loadFromStorage`) per the `use24hTime` rule (numbers `String()` on save, truthy-guard `parseFloat` on load so `''`→null not NaN). New `setCandleLightingLocation(lat,lng,placeName)` stores all three atomically and re-triggers reminders with a coordinate override. `setCandleLightingCity` now CLEARS the 3 GPS fields (GPS and curated-city are mutually exclusive).
- **Step 2 — isIsraelCoords util (local-data-builder, new file).** `isIsraelCoords(lat,lng)` bounding box (lat 29–33, lon 34–36). Source of truth for the il (Israel/diaspora) flag derived from coordinates.
- **Step 3 — NotificationService override (local-data-builder).** `ensureCandleLightingReminders` gains optional `override { lat, lng, placeName, il }`: when present, uses precise coords for `getZmanim`, `placeName` for the body label, `il` for erev-Yom-Tov detection, skipping the city-key lookup. When absent, the city-key path is byte-for-byte unchanged (back-compat for existing `candleLightingCity` users).
- **Step 4 — settings.tsx GPS button (mobile-ui-builder).** Replaced the coarse `findNearestCityKey` snap with a user-triggered Nominatim reverse-geocode (5s timeout, `User-Agent: Luchot-App/1.0`, city-level name `address.city ?? town ?? village`, silent fallback). Stores exact lat/lng + Hebrew city name via `setCandleLightingLocation`. City row + accessibility label prefer the stored place name; the update button and enable-on-location guard now recognize GPS-only state. Manual city picker retained as the offline fallback. Helper returns `{ success, permissionDenied }` so the enable-on-success and permission-denied UX is preserved.

### Decisions made

- None new architecturally. Implements the locked session decisions (Nominatim user-triggered + silent fallback — already in DECISIONS.md 2026-06-04; il from coordinate bounding box; curated-city pick clears GPS fields; back-compat for city-key users; 3-place persistence pattern).

### Orchestrator fix (found reviewing the local-data-builder report)

- **GPS-only users would lose reminders on toggle/lead-minute change.** The agent left `setCandleLightingRemindersEnabled` and `setCandleLightingLeadMinutes` on the city-key path. Since a GPS-only user has `candleLightingCity === null`, those calls hit the `!override && !city` guard → cancel reminders, reschedule nothing. The Step 3 brief required *all* existing callers to pass the override when coords are present, so this was completing the spec, not a deviation. Added a `buildCandleOverride(state)` helper (returns the override from current GPS fields, or undefined) and threaded it through both setters. Applied directly by the orchestrator (SendMessage to continue the warm agent is unavailable; a cold re-spawn for ~20 lines is the expensive path — consistent with the established single/small-fix precedent). typecheck re-verified 0 errors after.

### Open issues / blocked

- **`il` flag at offset cities:** `getCandleLightingOffset` still returns the default 18-min minhag for any non-special coords (correct); diaspora users get 18 min as expected. No action needed — noted for awareness.
- **Stale place name on curated re-pick** is handled (curated city pick clears GPS fields). No open item.

### Next steps

- **Feature 2 — Shabbat card** in day.tsx "תורה וזמנים" tab (next session). Still has one open design fork: whether the card computes its zmanim from the Settings candle-lighting coords or the app `useLocationStore` coords (raised in the prior planning report). Plus extracting `reverseGeocodeNominatim` from NoteEditor to `src/utils/reverseGeocode.ts`.
- **On-device verification (this feature):** see the checklist in the session report — confirm GPS fills the Hebrew city name, persists across kill/reopen, and existing curated-city users' reminders still fire.

---

## 2026-06-04 — Session: fix Hebrew backward navigation (HDate.add day-1 boundary)

**Phase:** Phase 5 (follow-up bug fix to Session B)
**Commits:** (this session) the one-line fix + this docs entry
**Sub-agents:** none — single-line fix applied directly by the orchestrator (exact change pre-diagnosed; cold sub-agent spawn for one line is the expensive path; consistent with the established single-line-fix precedent).
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done

- **`src/providers/CalendarProvider.tsx` — `navigateHebrewMonth` backward double-step fix.** Root cause (diagnosed prior turn, empirically confirmed): `new HDate(1, m, y).add(-1, 'months')` slips one day before the intended 1st (e.g. `1 Sivan → 30 Nisan` instead of `1 Iyyar`), so `getMonth()` reports the month **two** steps back — backward navigation jumped two months while forward was correct. Fix: anchor the stepping HDate to **day 15** instead of day 1. `navigateHebrewMonth` reads only `getMonth()`/`getFullYear()` from the stepped date, so the day is a pure pivot; day 15 is safely inside every Hebrew month (≥29 days) in both directions. Verified across all edge cases (Adar I/II, Tishrei/Elul year rollover, leap-year Nisan→Adar II). One-line change + explanatory comment; nothing else touched.

### Decisions made

- None new.

### Open issues / blocked

- Month/year picker still inert in Hebrew mode (carried over from Session B — needs a Hebrew-aware picker + `navigateToHebrewMonth`). Unchanged this session.

### Deviations

- Added a 2nd commit (this WORK_LOG entry) beyond the Architect's single-commit strategy, per CLAUDE.md end-of-session state discipline. The code change is exactly the one line specified.

### Next steps

- On-device confirm a full backward walk Tishrei → Elul → Av → Tammuz → Sivan → Iyyar → Nisan (no skip/repeat), plus a leap-year Nisan → Adar II → Adar I.

---

## 2026-06-04 — Session: Hebrew month navigation — exact HDate cursor (Session B)

**Phase:** Phase 5 (navigation bug fixes — Session B of the 2-session split; fixes Bug 1)
**Commits:** 6f6b3c9 (DateService), 781a59a (CalendarProvider), aa31a60 (MonthGrid + index.tsx) + this docs entry (4)
**Sub-agents:** local-data-builder (Tasks 1+2: DateService + CalendarProvider), mobile-ui-builder (Task 3: MonthGrid + index.tsx). Orchestrator: verified HDate arithmetic empirically, ran DoD, made one integration fix (see below).
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done

- **Pre-flight (orchestrator) — verified HDate month arithmetic in hebcal v5.x.** Ran a node check against the installed `@hebcal/core`: `new HDate(1, m, y).add(±1, 'months')` handles every edge case correctly — Adar I(12)→Adar II(13); Adar II(13)→Nisan(1); Elul(6)→Tishrei(7) year+1; Tishrei(7)−1→Elul(6) year−1; Nisan(1)−1→Adar II(13) in a leap year. So `HDate.add` is used directly — **no manual stepping needed**.
- **Task 1 — DateService (local-data-builder).** Extracted the per-day construction body of `getMonthData` into a private `buildDayData(date): DayData` that fetches that single day's hebcal events (same flags: il/omer/sedrot) and runs the identical classification + learning logic. `getMonthData` now loops and calls it — output unchanged (per-day fetch instead of one batched fetch; cached per month so amortized). Added `getHebrewMonthData(hYear, hMonth)`: iterates `1..HDate.daysInMonth(hMonth,hYear)`, maps each `HDate.greg()` through `buildDayData`. Cached under a distinct `he_${hYear}_${hMonth}_${diaspora}` key (cannot collide with Gregorian keys); `setDiaspora`'s existing `monthCache.clear()` invalidates Hebrew entries too.
- **Task 2 — CalendarProvider (local-data-builder).** Added a parallel Hebrew cursor — `currentHebrewYear`, `currentHebrewMonth`, `hebrewMonthData` (init from `new HDate()`) — plus `navigateHebrewMonth(direction)` (steps via `HDate.add`, reloads `hebrewMonthData`, does NOT touch `selectedDate` — view-only navigation, confirmed decision) and `refreshHebrewMonth()`. Gregorian cursor untouched.
- **Task 3 — MonthGrid + index.tsx (mobile-ui-builder).** In `mode==='hebrew'`, MonthGrid reads `hebrewMonthData` and drives both chevrons + swipe through `navigateHebrewMonth` (mode-aware `gridData`/`navigate` aliases). Header title now exact from `gridData[0].hebrewDate` (retires the `[14]` heuristic). `index.tsx` calls `refreshHebrewMonth()` on mount. Gregorian mode fully unchanged.

### Decisions made

- None new. Implements the confirmed decisions (Hebrew nav is view-only; getMonthData refactored-not-rewritten; hebcal v5.x HDate arithmetic).

### Orchestrator integration fix (found at the DoD gate)

- **Hebrew-tab Gregorian subtitle was frozen.** The sub-agent left `secondaryTitle` in hebrew mode pointing at `gregMonthName` (derived from the Gregorian cursor `currentMonth`/`currentYear`). Since the Hebrew tab never navigates the Gregorian cursor, the subtitle would stay stuck on today's Gregorian month while swiping through Hebrew months. Fixed in MonthGrid: in hebrew mode the secondary line is now derived from the Hebrew month's **midpoint** `gregorianDate` (`gridData[Math.floor(len/2)]`), so it tracks the displayed month. This completes Task 3's "secondaryTitle resolves correctly per mode" requirement. Done directly by the orchestrator (SendMessage to continue the warm agent is unavailable; a cold re-spawn for ~8 lines was the expensive path).

### Open issues / blocked

- **Month/year picker (`MonthYearPicker`) does nothing visible in Hebrew mode** — it still reads/writes the Gregorian cursor via `navigateToMonth`, which the Hebrew grid does not consume. So in hebrew mode the header-tap picker is effectively inert (it moves the Gregorian cursor, not the Hebrew grid). Explicitly out of scope this session; candidate for a follow-up (a Hebrew month/year picker + `navigateToHebrewMonth`).
- **Header chevrons** now correctly drive `navigateHebrewMonth` in hebrew mode — verify on device they agree with swipe direction.

### Next steps

- **Manual on-device verification (DoD):** navigate forward/backward Sivan → Tammuz → Av → Elul → Tishrei (year rollover) — no month skipped or repeated; titles exact. If in a leap year, verify Adar I → Adar II → Nisan. Confirm Gregorian tab unchanged and `selectedDate` unaffected by Hebrew navigation.
- Follow-up candidate: Hebrew-aware month/year picker.

---

## 2026-06-04 — Session: swipe direction (RTL) + horizontal-only gesture constraint

**Phase:** Phase 5 (navigation bug fixes — Session A of a 2-session split)
**Commits:** 2c929d4 (layout.ts), 098fdee (5 gesture handlers) + this docs entry (3)
**Sub-agents:** mobile-ui-builder (both tasks, one round, per Architect ownership assignment).
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done

- **Task 1 — `src/constants/layout.ts` (mobile-ui-builder, new file).** Single source of truth for swipe-to-time direction: `SWIPE_RTL_FORWARD = true` + `swipeDirection(velocityX): 1 | -1`. RTL convention — swipe right (vx>0) = forward in time (+1). Future LTR language support flips exactly one flag (or wires it to the language setting). Satisfies the "swipe direction easy to flip from one place" architecture requirement.
- **Task 2 — swipe direction fix + horizontal constraint on all 5 gesture handlers (mobile-ui-builder).** `MonthGrid.tsx`, `WeekGrid.tsx`, `app/(tabs)/day.tsx`, `app/(tabs)/zmanim.tsx`, `app/details.tsx`. Each: (a) imports `swipeDirection`; (b) gains an `onSwipe` JS callback (`useCallback((vx) => navigateXxx(swipeDirection(vx)))`); (c) the Pan gains `.activeOffsetX([-15,15]).failOffsetY([-15,15])` and the `.onEnd` worklet now calls `runOnJS(onSwipe)(e.velocityX)`. This (1) corrects the previously inverted mapping (was left→next/right→prev; now right→next/left→prev per the locked RTL rule) via the single `swipeDirection` source, and (2) restricts activation to horizontal so vertical gestures pass through to the ScrollView (Bug 2 + Bug 3 from the navigation diagnosis). `swipeDirection` is called inside the JS callback, never inside the worklet — preserves the locked runOnJS-not-direct-Zustand pattern.

### Decisions made

- None new. Implements the locked direction rule (swipe right = forward in time) and the "single-source RTL constant" architecture requirement.

### Open issues / blocked

- **Bug 1 (Hebrew-month navigation skips months) — deferred to Session B.** It's the heavier, architectural fix: `DateService.getHebrewMonthData` + a Hebrew cursor in CalendarProvider (HDate month arithmetic, Adar I/II + Tishrei rollover), then MonthGrid wiring. Diagnosed and planned; not yet implemented. Open question for that session: whether navigating the Hebrew month leaves `selectedDate` put (recommended) — confirm with Architect.
- **Header chevrons** (`‹` → navigateMonth(1), `›` → navigateMonth(-1)) are separate from swipe and were left unchanged; worth an on-device consistency check that arrows and the corrected swipe agree.

### Deviations

- Added a 3rd commit (this WORK_LOG entry) beyond the Architect's 2-commit strategy, per CLAUDE.md end-of-session state discipline. Code commits match the spec exactly.

### Next steps

- On-device confirm (see session report checklist): swipe right = next, swipe left = previous on all 5 screens; vertical swipes scroll (or no-op on the calendar tabs) instead of changing month/day.
- Session B: Bug 1 Hebrew-month navigation.

---

## 2026-06-04 — Session: swipe-crash fix + hebrewOnTop toggle + GPS Nominatim

**Phase:** Phase 5 (bug fixes + the first network exception)
**Commits:** (this session) swipe/hebrewOnTop fix, NoteEditor Nominatim, docs (3 — see deviation re: commit count)
**Sub-agents:** mobile-ui-builder (all code edits across Tasks 1–3, one round, per orchestrator authorization + Architect ownership assignment).
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done

- **Task 1 — swipe-gesture crash fix (mobile-ui-builder).** Five `Gesture.Pan().onEnd()` worklet callbacks called Zustand setters directly without `runOnJS` — the exact pattern locked-forbidden in DECISIONS.md (2026-06-01, "Reanimated worklet callbacks must never call Zustand store actions directly"). Wrapped each, mirroring the Drawer.tsx `runOnJS(triggerClose)` pattern: `app/(tabs)/day.tsx`, `app/(tabs)/zmanim.tsx`, `app/details.tsx` (all `runOnJS(navigateDay)(dir)`), `src/components/calendar/MonthGrid.tsx` (`runOnJS(navigateMonth)(dir)`), `src/components/calendar/WeekGrid.tsx` (extracted the inline `setSelectedDate` body into a `navigateWeek(direction)` useCallback, then `runOnJS(navigateWeek)(dir)`). `runOnJS` imported from `react-native-reanimated` in each. Mechanical only — no other gesture logic changed. **This was the highest-priority item (confirmed hard crash on device).**
- **Task 2 — hebrewOnTop toggle now visible (mobile-ui-builder).** Root cause (diagnosed prior session): the "עברית למעלה" setting only drove the small `ScreenHeader` two-line date (and the Week screen); but `day.tsx`, `zmanim.tsx`, and `details.tsx` each render a *second, prominent, hardcoded* big date header below ScreenHeader that always showed Hebrew-large-on-top, masking the setting. Fix: each of the three now reads `hebrewOnTop` from the settings store and swaps which date string is the large (primary) vs small (secondary) line. ScreenHeader untouched (already correct).
- **Task 3 — NoteEditor GPS → Nominatim (mobile-ui-builder).** `src/components/notes/NoteEditor.tsx`: removed the 3 TEMP DIAGNOSTIC `[GPS]` console.logs (commit 1b9090b) and the entire broken `reverseGeocodeAsync` try/catch + raw-coordinate fallback. Added module-level `reverseGeocodeNominatim(lat, lng)`: 5s `AbortController` timeout, `User-Agent: Luchot-App/1.0`, builds a Hebrew label from `address` tiers (amenity/shop/tourism → road → suburb/neighbourhood → city/town/village/county), returns `''` on any error/timeout/non-200. `handleGPS` now `setLocation(label)` — empty label leaves the field blank and editable, no Alert. Permission flow + `getCurrentPositionAsync` + `import * as Location` unchanged.

### Decisions made

- **DECISIONS.md (orchestrator):** logged the Nominatim reverse-geocoding exception (2026-06-04) — the single permitted network call (user-triggered GPS tap only, 5s timeout, silent fallback, no automatic calls). Explicitly authorized by the user; narrows but does not revoke "offline-first, no backend ever" (still no backend, no account, no background traffic; app fully functional offline). This is the ONLY network exception; any future network call needs its own reopened decision.

### Open issues / blocked

- **Date-display redundancy (future cleanup, do NOT fix now):** day/zmanim/details each show the date *twice* — once in `ScreenHeader` (small, already hebrewOnTop-aware) and once in the big hardcoded header (now also hebrewOnTop-aware after this session). Flagged by the Architect as a future cleanup candidate (drop the big header and rely on ScreenHeader, a UX decision beyond this session's scope).
- **Candle-lighting GPS + exact-coordinate storage (Nominatim in Settings)** remains open — deferred to a follow-up session (it's the heavier, schema-touching task: 3 new persisted SettingsProvider fields + NotificationService override + settings.tsx UI). The Nominatim exception logged this session already covers it.

### Deviations

- **3 commits instead of the Architect's 4.** The specified commit 1 (runOnJS) and commit 2 (hebrewOnTop) both edit `day.tsx`, `zmanim.tsx`, and `details.tsx` with interleaved hunks. Clean per-commit separation would need interactive `git add -p` (unavailable in this environment) or a revert-and-reapply dance on verified-working code (riskier). Merged into one commit covering both fixes; NoteEditor and docs remain their own commits as specified.

### Next steps

- On-device confirm (see session report checklist): swipe no longer crashes on all 5 screens; toggling "עברית למעלה" visibly flips the big date header on Day/Zmanim/Details; NoteEditor GPS fills a Hebrew address (or stays blank, never raw coords) and never crashes.
- Follow-up session: candle-lighting GPS + exact-coordinate storage (the deferred half of the GPS work).

---

## 2026-06-04 — Session: follow-up #3 — tab bar STRUCTURAL fix + GPS diagnostics

**Phase:** Phase 5 (bug fix + diagnostics)
**Commits:** f4f0efa, 1b9090b (2) + this docs entry
**Sub-agents:** none — orchestrator edited directly (user explicitly said "fix them yourself directly").
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done

- **Tab bar — STRUCTURAL fix (orchestrator, direct)** [f4f0efa] — `app/(tabs)/day.tsx`. **Root cause of the persistent stacking across 2 prior sessions:** the tab bar was the `stickyHeaderIndices={[1]}` child of the ScrollView. React Native re-parents a sticky header into an internal `ScrollViewStickyHeader` (Animated.View) wrapper with its own measurement/positioning; in this RTL + nested-flex case the wrapper never gave the row a stable full-width context, so the two Pressables collapsed and rendered stacked. Every prior fix (flex:1 → alignSelf:flex-end → justifyContent:flex-start) failed because they were all applied *inside* the broken sticky wrapper. **Fix:** moved the date header + tab bar OUT of the ScrollView, rendering them as normal fixed children of the root column View (tab bar below the date header); removed `stickyHeaderIndices`; added `scroll: { flex: 1 }` to the ScrollView so it fills the remaining space. A plain flex-row View lays the tabs out reliably (אירועים right, תורה וזמנים left, flush right, no wrapping) and, being outside the scroll viewport, the bar stays permanently visible (functionally sticky). Date header is now also fixed (no longer scrolls away).
- **GPS diagnostics (orchestrator, direct)** [1b9090b] — `src/components/notes/NoteEditor.tsx`. Added 3 TEMP DIAGNOSTIC `console.log`s in `handleGPS` (no label logic changed): the coords object after `getCurrentPositionAsync`, the full `reverseGeocodeAsync` results array (JSON), and the error message in the inner catch (changed `catch {` → `catch (e) {`). This will definitively show whether the geocoder returns data, returns empty, or throws on-device.

### Decisions made

- None new — tab bar fix is an implementation-level restructure within the existing locked design (two tabs, sticky-while-scrolling, RTL). Still no sticky-header dependency; bar is now a fixed top region.

### Open issues / blocked

- **GPS root cause still unconfirmed** — awaiting on-device logcat from the diagnostic logs. Once known, either remove the logs (if geocoder works and label now populates) or change approach (if geocoder throws/returns empty — within locked constraints: no new deps, no network backend). The TEMP DIAGNOSTIC logs MUST be removed in the next session.

### Next steps

- User runs the app, taps the GPS pin, and reports the `[GPS]` lines from logcat (see report for capture instructions).
- On-device confirm the tab bar now renders horizontally and stays pinned.

---

## 2026-06-04 — Session: follow-up #2 — tab bar (real fix), GPS label, color bar position

**Phase:** Phase 5 (UX polish)
**Commits:** b311863, 3e5822b, a59ed59 (3) + this docs entry
**Sub-agents:** mobile-ui-builder (all 3 UI edits, 1 round, per orchestrator authorization)
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done — incl. root cause of why the previous attempts didn't work

- **Tab bar (mobile-ui-builder)** [b311863] — `app/(tabs)/day.tsx`. **Root cause:** the previous fix put `alignSelf: 'flex-end'` on the tab bar, which is the **sticky header** (ScrollView `stickyHeaderIndices={[1]}`). `alignSelf:'flex-end'` makes the sticky header shrink to its content width, which under the sticky wrapper collapses so the Hebrew tab labels wrap → the tabs *looked* stacked. Fix: removed `alignSelf:'flex-end'`; the bar is now full-width with `flexDirection:'row-reverse'` + `justifyContent:'flex-start'` (packs tabs to the right edge in RTL) + `alignItems:'center'`. Tabs use padding only (no flex). Full-width bar also keeps the sticky background covering the screen.
- **GPS label (mobile-ui-builder)** [3e5822b] — `src/components/notes/NoteEditor.tsx`. Implemented the requested build: `parts = [name, street, city ?? district ?? subregion ?? region].filter(Boolean)`; assign label only when `parts.length > 0`; coordinates are the last resort. **Note on root cause:** the previous label logic was already functionally equivalent (it also only fell back to coords when all fields were empty). So if the field STILL shows raw coords after this OTA, the cause is NOT the label code — it's that `reverseGeocodeAsync` is either throwing on-device (Android Geocoder backend unavailable → caught → coords) or returning a first result whose name/street/locality are all null. That is the coordinate fallback working as designed, not a label bug. Flag for on-device check.
- **Color bar position (mobile-ui-builder)** [a59ed59] — `src/components/notes/NoteList.tsx`. Moved the 4dp color bar OUT of the bordered capsule. Each row is now a `row-reverse` wrapper View: bar is the first child (renders right, outside the capsule), capsule is second (flex:1, left), 4dp `gap`. `resolveHexColor` (already returns the actual color hex) reused for the bar.

### Decisions made

- None new — all three implement the locked follow-up spec.

### Open issues / blocked

- **GPS:** if coords still display after this update, the geocoder itself is the problem (throw or all-null result), not the label code — would need a different approach (e.g. accept that some locations only resolve to coords, or a different geocoding source — but no new deps / no network backend per locked decisions). Confirm on device first.
- The inert color-picker Modal in NoteList remains (from the dot removal two sessions ago) — still a future cleanup candidate.

### Next steps

- On-device confirm all three (see session report verification checklist).

---

## 2026-06-04 — Session: follow-up — tab bar layout + GPS label priority

**Phase:** Phase 5 (UX polish)
**Commits:** 1ed3f0e, ca058f4 (2) + this docs entry
**Sub-agents:** mobile-ui-builder (both UI edits, 1 round, per orchestrator authorization)
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done

- **Tab bar layout (mobile-ui-builder)** [1ed3f0e] — `app/(tabs)/day.tsx`: the two tabs were stacking instead of side by side. Right-aligned the `row-reverse` tab group (`alignSelf: 'flex-end'`), replaced `flex: 1` tabs with compact padding (`paddingHorizontal: 16, paddingVertical: 8`), and moved the active indicator from a separate `tabUnderline` View to a 2px `colors.accent` bottom-border on the active tab Pressable itself. Removed the `tabUnderline` style.
- **GPS address label (mobile-ui-builder)** [ca058f4] — `src/components/notes/NoteEditor.tsx` `handleGPS`: changed only the label-building logic to `[name, street, locality]` where `locality = city || district || subregion || region`, joined with ', '. Coordinate fallback (results empty / label empty) and the try/catch flow unchanged.

### Decisions made

- None new — both implement the locked follow-up spec from the Architect.

### Open issues / blocked

- Watch on device: with `alignSelf: 'flex-end'`, the sticky tab bar's background + bottom border now span only the (right-aligned) tab group width, not the full screen width. This is per spec; confirm scrolled content doesn't visibly bleed through to the left of the tab group when the bar is stuck.

### Next steps

- On-device confirm the two fixes (see verification checklist in the session report).

---

## 2026-06-04 — Session: Day screen tabs + view modal fixes + colored bars + GPS

**Phase:** Phase 5 (UX redesign + bug fixes)
**Commits:** c39e70b, 6e28a23, 9cca8cd, 8d36f2b (4) + this docs entry
**Sub-agents:** mobile-ui-builder (all UI edits, 3 rounds, per orchestrator authorization)
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done

**Pre-flight — lucide icons + GPS diagnosis (orchestrator)**
- Confirmed `Cake`, `Flame`, `Gem`, `FileText` exist in `lucide-react-native@1.16.0` before importing.
- GPS diagnosis: coordinate acquisition is NOT broken (NoteEditor uses the same `getCurrentPositionAsync` call that works in `app/locationPicker.tsx`). The silent failure was in result handling — `reverseGeocodeAsync` on Android can return `[]` (or an entry with null `street`/`city`) WITHOUT throwing, so the old `[r.street, r.city]` label was empty and the field silently stayed blank with no error.

**Issue 1 — GPS location (mobile-ui-builder)** [c39e70b]
- `src/components/notes/NoteEditor.tsx` `handleGPS` — isolated `reverseGeocodeAsync` in its own try/catch, widened candidate fields to `[name, street, city, district, subregion, region]`, de-dup via Set, and added a raw `lat,long` coordinate fallback so the field always populates. Existing GPS flow unchanged.

**Issue 2 — View modal fixes + icons (mobile-ui-builder)** [6e28a23]
- `NoteEditor.tsx` — removed the redundant "ערוך הערה" title from the VIEW-MODE header (kept ✕). Edit-mode title untouched.
- Tap-to-edit: each view-mode field is now a Pressable; summary/location rows focus their TextInput via refs + a `focusTarget` effect, others just switch to edit mode.
- Replaced emoji type icons with lucide (`note→FileText, birthday→Cake, yahrzeit→Flame, anniversary→Gem`, size 20 / textSecondary) in NoteEditor type chips + view row AND NoteList rows.

**Issue 3 — Colored left bar (mobile-ui-builder)** [9cca8cd]
- `src/components/notes/NoteList.tsx` — replaced the round color dot with a 4dp full-height vertical bar on the left edge of each row (last child in the `row-reverse` row; color = `resolveHexColor`). Style `colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 8 }`.

**Issue 4 — Day screen two-tab layout (mobile-ui-builder)** [8d36f2b]
- `app/(tabs)/day.tsx` — split into two internal tabs below the date header via `stickyHeaderIndices={[1]}`: **אירועים** (default — NoteList + a static "+ הוסף אירוע" button) and **תורה וזמנים** (read-only: holiday banner, Torah details, zmanim, hourly schedule). Removed the floating FAB and its now-unused `Plus`/`I18nManager` imports and `fab`/`bottomSpacer` styles. NoteEditor modal + `saveNote` retained (add button opens it).

### Decisions made

- None new — all changes implement the locked design decisions from the Architect prompt (two tabs, static add button, view-modal tap-to-edit, left color bar, GPS fix-not-replace, Option-style icon mapping).

### Open issues / blocked

- **Side effect of Issue 3:** the color dot doubled as the quick color-picker trigger. With the dot removed, the `colorPickerNote` Modal + state in NoteList are now **inert** (left in place per "do not refactor beyond spec"). Color is now edited via tapping a row → view mode → edit. Candidate for a future cleanup (remove the dead modal) or re-wire (make the bar tappable) if the Architect wants the shortcut back.
- Minor dead code retained per spec: `notesByHour` memo in day.tsx, and a few unused styles (`noteRow`, `noteText`, `hourNote`, `hourNoteText`). Harmless; tsc green (`noUnusedLocals` off).
- On-device verification needed (see Next steps).

### Next steps

- On-device confirm: (a) Day screen opens on "אירועים" tab; tab bar stays pinned while scrolling; (b) tapping a note → view modal with NO title, delete/edit/share toolbar; (c) tapping a field in view mode enters edit mode (summary/location focused); (d) GPS button fills the location field (address or lat,long fallback) and never silently no-ops; (e) lucide type icons render on chips + rows; (f) colored vertical bar on the left of each event row; (g) "+ הוסף אירוע" button sits below the list and never overlaps; (h) "תורה וזמנים" tab shows Torah/zmanim/hourly, read-only.

---

## 2026-06-04 — Session: bugfix wave — delete reachability, Rosh Chodesh dedup, scrollbar

**Phase:** Phase 5 (bug fixes)
**Commits:** d8dd5f4, 65ec66c, 02d4975 (3) + this docs entry
**Sub-agents:** mobile-ui-builder (all UI edits, per orchestrator authorization)
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done

**Pre-flight — StorageService positional INSERT audit (orchestrator)**
- The `INSERT OR REPLACE INTO events VALUES(?…)` is positional (23 `?`). Audited physical column order vs. saveEvent's argument array across install histories. Git confirms `color_id` was in CREATE TABLE since the **initial commit** (b38efee, position 18) — never appended via ALTER, so the v3 ALTER guard always no-ops. `reminder_minutes` (v2) and `location` (v4) were appended at the end in the same order the INSERT lists them. **Result: slots match for both fresh and upgraded installs — no mismatch.** (My earlier "latent risk" flag from the diagnosis session was over-cautious; git disproves it.)

**Issue 5 — Settings scrollbar (mobile-ui-builder)** [d8dd5f4]
- `app/settings.tsx` — added `showsVerticalScrollIndicator={false}` to the one remaining ScrollView (all other screens already had it).

**Issue 2 — Rosh Chodesh double tag (mobile-ui-builder)** [65ec66c]
- `src/utils/tagMapper.ts` — Rosh Chodesh was tagged twice: once from `dayData.holidays[]` ("ראש חודש סיון", rendered as a holiday tag) and once from the `isRoshChodesh` boolean (generic "ראש חודש"). Added a guard `hasRoshChodeshHoliday = dayData.holidaysEn.some(h => h.startsWith('Rosh Chodesh'))`; the boolean tag is skipped when that's true. Display-side fix only — Option A; DateService.ts / holidays[] untouched (locked).

**Issue 1 + 3 — Delete/view modal + colored dot on Day screen (mobile-ui-builder)** [02d4975]
- Root cause (from diagnosis): existing notes were static `<Text>` rows on the Day screen → never opened NoteEditor in view mode → the delete/edit/share toolbar (the only delete affordance in the editor) never rendered. The fully-wired `NoteList` (tap-to-open, colored dot, inline ✕ delete, `note` + `onDelete` passed to NoteEditor) was **never mounted anywhere**.
- `src/components/notes/NoteList.tsx` — added optional `hideAddButton?: boolean`; suppresses its built-in "+ הוסף הערה" button when true (keeps the "הערות" title). All existing delete/dot/editor wiring untouched.
- `app/(tabs)/day.tsx` — imported and mounted `<NoteList date={selectedDate} hebrewDate={dayData.hebrewDate} hideAddButton />` in place of the static "אירועי היום" rows; removed the (always-empty) per-hour note rendering from the hourly schedule. FAB and its create-new-note `NoteEditor` left unchanged. `notesByHour` memo left in place per spec (now unused; tsc passes — `noUnusedLocals` is off).

**Issue 4 — FAB overlap (no change required)**
- Verified geometry: bottom clearance = `bottomSpacer` 60 + `scrollContent.paddingBottom` 100 = 160px; FAB reaches 80px up (bottom 24 + height 56). NoteList now sits above the always-present 24-row hourly schedule, so note rows are never the bottom-most content and cannot be obscured. No code change made (see deviation note).

### Decisions made

- None new — all changes follow locked decisions (Option A for Issue 2; mobile-ui-builder owns UI; OTA for JS-only changes).

### Open issues / blocked

- **Deviation:** the plan anticipated a 4th commit for Issue 4 (FAB padding). With NoteList placed above the long hourly schedule and the existing 160px bottom clearance, no note row can be obscured by the FAB — so no edit was warranted. 3 issue-commits instead of 4; fabricating a padding change would be unnecessary churn.
- Minor: `notesByHour` memo (and a few now-unused styles: `noteRow`, `noteText`, `hourNote`, `hourNoteText`) are dead in day.tsx. Left untouched per spec; harmless (tsc green). Candidate for a future cleanup pass.
- On-device verification needed (see Next steps).

### Next steps

- On-device confirm: (a) tapping an existing note on the Day screen opens NoteEditor in **view mode** with the delete/edit/share toolbar; (b) delete from the toolbar removes the note and the list refreshes; (c) colored dot shows next to each note; (d) Rosh Chodesh shows a single tag in month/week grids; (e) Settings scrolls with no visible scrollbar; (f) FAB does not cover any note row.
- Note: the **previous** session's WORK_LOG listed "view mode appears when tapping existing note from NoteList" as a verification item — that path was never reachable until this session mounted NoteList.

---

## 2026-06-04 — Session: NoteEditor redesign — view/edit modes + toolbar + location field

**Phase:** Phase 5 (UX enhancement)
**Commits:** bd36070, c53d126 (2)
**Sub-agents:** mobile-ui-builder (NoteEditor + data layer additions, per orchestrator authorization)
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed.

### What was done

**Data layer — location field (mobile-ui-builder, authorized outside normal ownership)**

- `src/services/StorageService.ts` — v4 migration: `ALTER TABLE events ADD COLUMN location TEXT` (idempotent, try/catch). Added `schemaLocationMigrated` flag. INSERT updated from 22 → 23 positional `?` marks; `event.location ?? null` appended as the 23rd value (after `reminder_minutes`). `rowToEvent` maps `row.location ?? undefined`. `EventSchema.location` already existed (Google Calendar compat) — no schema file change needed.
- `src/hooks/useNotes.ts` — `CalendarNote` gains `location?: string | null`. `eventToCalendarNote` maps `e.location ?? null`. `saveNote` params and CalendarEvent construction include `location`, passed through to `StorageService.saveEvent`.

**NoteEditor redesign (mobile-ui-builder)**

`src/components/notes/NoteEditor.tsx` — full redesign with two rendering branches behind `isViewMode` boolean:

*View mode* (initial state when opening existing note):
- Read-only display: summary (large), type icon + label, location row (MapPin + text, hidden if empty), recurring anchor date, reminder label.
- Header: `row-reverse`, title (flex:1, right / JSX-first) + ✕ close (left / JSX-last).
- Bottom toolbar: 3 centered buttons (gap 32): 🗑 מחק → Alert confirmation → `onDelete` + `onClose` | 🔗 שתף → Alert "בפיתוח" | ✏ עריכה → `setIsViewMode(false)`.

*Edit mode* (initial state when creating new note, or after tapping עריכה):
- All existing fields preserved: summary TextInput, type chips, ColorPickerRow, recurring anchor, reminder toggle + lead-time chips.
- New location field: `row-reverse` row — TextInput `flex:1` (right / JSX-first) + MapPin GPS Pressable (left / JSX-last). GPS flow: `requestForegroundPermissionsAsync` → `getCurrentPositionAsync` → `reverseGeocodeAsync` → `"{street}, {city}"` or `"{city}"`. ActivityIndicator while loading. Permission denied → Alert "לא ניתן לקבל מיקום, אנא אפשר גישה למיקום בהגדרות". Error → Alert "לא ניתן לקבל מיקום".
- Header: same layout as view mode.
- Bottom: ביטול (closes modal) | שמור (accent). On save of **existing** note → `setIsViewMode(true)`. On save of **new** note → `onClose()`.

*Removed:* old Trash2 header button (from previous session). Delete now lives exclusively in view-mode toolbar.
*Added imports:* `expo-location`, `MapPin`, `Pencil`, `Share2`, `ActivityIndicator`.

### Decisions made

- None new — follows existing locked decisions (RTL row-reverse, no raw hex, StyleSheet.create, expo-location already installed).

### Open issues / blocked

- Location column already needed migration — `location TEXT` column did NOT exist in SQLite before this session (confirmed: grep found no `location` handling in StorageService). v4 migration handles all existing installs idempotently.
- On-device verification needed: (a) view mode appears when tapping existing note from NoteList; (b) edit mode appears when creating new note from day/month/week FAB; (c) GPS autofill works; (d) delete from toolbar fires Alert and removes note.
- OTA group ID: `3cff53cb-88eb-4bd6-b623-96655171a263` (branch `preview`, runtime `exposdk:51.0.0`, message "feat: NoteEditor redesign").

### Next steps

- On-device confirm the redesign.
- Next: event time + recurrence (new wave — SQLite migration needed, schema change required).

---

## 2026-06-03 — Session: date off-by-one fix + delete event UI

**Phase:** Phase 5 (bug fix + UX)
**Commits:** 14c19d5, ea4e05f (2)
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). OTA pushed to `preview`.

### What was done

**Fix: UTC/local date off-by-one (orchestrator direct — single-line fix in a utility, no sub-agent needed)**
- `src/utils/dateUtils.ts` — `formatDateKey()` switched from `toISOString().split('T')[0]` (UTC) to local `getFullYear/getMonth/getDate` components. Updated JSDoc to reflect the change.
- `src/hooks/useNotes.ts` — `saveNote` was building `dateStr` with a raw `toISOString().split('T')[0]` call instead of going through `formatDateKey`. Fixed: added `formatDateKey` to the import and replaced the raw call.
- `src/services/StorageService.ts` — Three raw UTC callers fixed: `getEventsForGregorianDate` (query key), `getNotesInRange` (range start and end bounds). Added `formatDateKey` import.

Root cause: In UTC+3 (Israel summer), `new Date(year, month, day)` at local midnight = UTC−3h the prior day. `toISOString()` was therefore returning the previous calendar date, causing events saved for day N to be stored and queried under day N−1 — showing one cell early in the Month grid.

**Feat: delete event UI (orchestrator direct — no sub-agent needed)**
- `src/components/notes/NoteEditor.tsx` — Added `Trash2` (lucide-react-native) button in header row, visible only when editing an existing note (`note` prop present + `onDelete` prop provided). Header uses `row-reverse`: title (`flex:1`) on right (JSX-first), trash on left (JSX-last). Alert on press: title `'מחק אירוע'`, message `'האם למחוק את האירוע לצמיתות?'`, buttons `ביטול` / `מחק` (destructive). On confirm: `onDelete(note.id)` then `onClose()`. Added `Alert` to React Native imports.
- `src/components/notes/NoteList.tsx` — Added `onDelete={deleteNote}` prop to the `<NoteEditor>` call.
- **NoteList existing delete verified:** NoteList already had a working ✕ `Pressable` delete button (lines 93-95) with a `confirmDelete` Alert (`'מחק הערה'` / `'למחוק "${note.summary}"?'`). Calls `useNotes.deleteNote` → soft-delete via `StorageService.deleteEvent` + `incrementNotesVersion`. Functionally correct, no changes needed.

### Decisions made

- None new — all changes follow existing locked decisions and RTL conventions.

### Open issues / blocked

- On-device verification needed: (a) events now appear on the correct day in Month grid; (b) Trash2 button appears in NoteEditor when editing; (c) delete removes the event from both NoteEditor and NoteList paths.
- OTA group ID: `75c6828b-a2b4-45fe-aea4-af264b0f28ab` (branch `preview`, runtime `exposdk:51.0.0`, message "fix: date + delete event").

### Next steps

- On-device confirm the date fix and delete UI.
- Next task: event time + recurrence (new wave — SQLite migration needed).

---

## 2026-06-03 — Session: RTL conformance + SQLite persistence arc

**Phase:** Phase 5 (maintenance / bug fix)
**Commits:** d5c1f8e, 0f772b8, 970eeac, 75e3c66, 6190c8c, 33b36a9 (6)
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline). 10 OTA update groups published to `preview` (6 fixes + 4 debug/instrumentation builds).

### Overview

Two intertwined debugging arcs on the standalone APK, both masked in Expo Go:
1. **RTL layout** — the `row-reverse` convention only holds if the app is locked to an LTR base; several screens had drifted off-convention.
2. **SQLite persistence** — nothing survived a kill/reopen (theme + all settings reverted, events vanished). Traced through a chain of fixes to a single root cause: concurrent `transactionAsync` deadlocks the legacy driver.

### What got done

**RTL conformance**
- **`d5c1f8e` — Lock LTR base (`forceRTL false`) so `row-reverse` holds (mobile-ui-builder).** `app/_layout.tsx` guards on `I18nManager.isRTL` and calls `allowRTL(false)` + `forceRTL(false)` at module load. This is the foundation the entire `flexDirection: 'row-reverse'` Hebrew-RTL convention depends on — if the native layer flips to RTL, every `row-reverse` row double-flips and breaks. (Instrumentation banner OTA preceded this to confirm which bundle was live.)
- **`970eeac` — RTL layout pass, 31 deviant items (mobile-ui-builder, Target A).** Swept components/screens for rows not conforming to the locked `row-reverse` + first-child-on-right convention and corrected 31 layout items. Fixes are JSX child-order / `flexDirection` corrections, not CSS transforms (per the locked RTL decision).

**SQLite persistence (the arc to root cause)**
- **`0f772b8` — Theme persistence + `settingsReady` gate (local-data-builder + mobile-ui-builder).** Root layout renders `null` until `settingsReady` flips true, so the UI never flashes the default theme before the stored `darkMode` preference is applied. First attempt at fixing the revert-on-restart symptom.
- **`75e3c66` — `settingsReady` deadlock fix: `finally` guard + 3s timeout fallback.** `loadFromStorage` now always releases the gate in a `finally` block (so a *throw* can't freeze the app on a blank white screen), and `_layout.tsx` adds a 3s `forceReady` fallback (so a *hang* can't freeze it either). This kept the app usable but, crucially, **masked** the underlying deadlock by rendering defaults after 3s — the symptom that looked like "settings don't persist."
- **`6190c8c` — Remove `readOnly` flag + batch prefs load.** Two findings: (a) `transactionAsync(cb, true)` (read-only variant) hangs forever on standalone Android — removed; all reads now use plain read-write transactions. (b) `loadFromStorage` was firing 12 concurrent `getPref` transactions via `Promise.all` — collapsed into a single `getAllPrefs()` batch transaction. Reduced but did not eliminate the deadlock (the concurrency *across* providers remained).
- **`33b36a9` — `runExclusive` single-flight queue (local-data-builder → `StorageService.ts` only).** Root cause confirmed by code trace: `_layout.tsx` ran `settings.loadFromStorage` + `location.loadFromStorage` + `NotificationService.init` concurrently via `Promise.all`, each issuing its own `transactionAsync`; two overlapping transactions on the one shared connection deadlock the legacy driver, wedging it for the whole session (settings revert via the 3s fallback; every later read/write — including event saves — hangs). Grep showed the same overlap pattern in `useNotes.ts` (3 reads), `useDatesNotes.ts` (2 reads), and `LocationProvider.tsx` (fire-and-forget `setPref`s) — i.e. **not startup-only**. Fix: a module-level `runExclusive` + `txnTail` promise chain that serializes every transaction; `dbAll`/`dbRun` run through it; `ensureSchema` deduped + serialized via a cached `schemaReady` promise (`doCreateSchema`). All public signatures, SQL, and other files unchanged — the gate makes the existing `Promise.all`/fire-and-forget call sites safe with zero changes to them.

### Decisions made (see DECISIONS.md, all 2026-06-03)

- **App locked to LTR base (`I18nManager.forceRTL(false)` / `allowRTL(false)`)** — the prerequisite for the `row-reverse` Hebrew-RTL convention.
- **`settingsReady` gate + 3s `forceReady` fallback** — never block the UI forever; always release the gate in `finally`.
- **All SQLite access serialized through `runExclusive` (single-flight queue) in StorageService** — `expo-sqlite/legacy` deadlocks on overlapping transactions. CLAUDE.md Known Issues / Quirks note added to match.

### OTA updates published this session (branch `preview`, runtime `exposdk:51.0.0`)

| Message | Group ID |
|---|---|
| fix: SQLite single-flight queue | a558dfe6-c5d0-4c42-a94f-0a7bcfb40649 |
| fix: SQLite persistence | ed7cd951-da1c-4c7f-9802-91de13fc107f |
| debug: trace setPref commit + loadFromStorage call | e5136d3f-c3ca-4f0e-91e8-431feee4326b |
| debug: StorageService SQLite logging | 678d0c03-0616-423f-a20b-78915635c609 |
| fix: settingsReady deadlock | ade2f314-b4fc-44cc-a8ef-bbba92de6e73 |
| fix: RTL layout pass — 31 deviant items corrected | 420671fb-79cc-42f9-8a79-0c4f2292f7d6 |
| debug: event date logging | 7c033d48-ecbd-4491-8942-c9729a369751 |
| fix: theme persistence | 3aa11e70-ce08-458c-86ce-f0f2e5022dad |
| fix: lock LTR base so row-reverse convention holds | 46854148-a93e-4c05-8eec-2b1e7bbca221 |
| debug: instrumentation banner | 89da838a-b6fb-4968-aa82-395884b65d2a |

### Open issues / blocked

- All verification this session was code-level + typecheck + expo-doctor + on-device symptom observation via OTA. The `runExclusive` fix still needs final on-device confirmation: theme persists across kill/reopen, events survive restart, and day + month views (the `useNotes`/`useDatesNotes` `Promise.all` paths) don't hang.
- OTA delivery requires a versionCode 7+ build carrying the expo-updates native module (per 2026-06-02 note). Earlier APKs won't receive these updates.

### Next steps

- Confirm SQLite persistence + no-hang on-device once the OTA lands on a versionCode 7+ build.
- The 4 `debug:`/instrumentation OTA bundles can be ignored going forward; the live fix is `a558dfe6…` (commit 33b36a9).

---

## 2026-06-02 — Session: expo-updates + EAS Update configuration

**Phase:** Phase 5 (infrastructure)
**Commits:** (see below)
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline).

### What got done

- **`expo-updates@0.25.28`** installed via `npx expo install` (SDK 51 compatible). Native module — requires the next EAS build before OTA delivery is active.
- **`app.json`** updated with `"updates"` block (URL, `fallbackToCacheTimeout: 0`, `checkAutomatically: ON_LOAD`) and `"runtimeVersion": { "policy": "sdkVersion" }`.
- **`eas.json`** updated: `"channel": "preview"` added to `preview` profile, `"channel": "production"` added to `production` profile. `base` profile (shared config, not a build target) left unchanged.
- No runtime code changes — expo-updates operates via the native layer automatically on app launch.

### Decisions made

- OTA update strategy locked in DECISIONS.md: JS-only fixes → `eas update --branch preview`, native changes → full `eas build`.

### Open issues / blocked

- OTA delivery will not work until the next full EAS build (versionCode 7) includes the expo-updates native module. Do not push `eas update` against earlier APKs.
- Bug A (dark/light theme persistence) remains open.

### Next steps

- Queue EAS build versionCode 7 (includes expo-updates + all Wave 4b + bug-fix commits).
- After that build is installed, JS-only fixes can be pushed via `eas update --branch preview --message "..."`.

---

## 2026-06-02 — Session: Phase 5 — Four bug fixes

**Phase:** Phase 5 (maintenance)
**Commits:** `d56470f` (fix: drawer starts closed on cold start), `8769ddf` (fix: Settings RTL — correct JSX child order), `d0c5cfd` (fix: global notesVersion in Zustand), `4fded59` (fix: remove export button from Day screen)
**Status:** Complete. DoD passed (typecheck 0 errors, expo-doctor 16/17 baseline).

### What got done

- **Fix 1 — Drawer cold start:** Added `if (drawerWidth === 0) return;` guard as the first line of the `useEffect` in `src/components/drawer/Drawer.tsx`. Root cause: on first render with `screenWidth = 0`, `drawerWidth = 0`, and the closed-branch computed `withTiming(-0) = withTiming(0)` — the fully open position — before the panel was even mounted. Drawer would flash open then close as dimensions resolved.

- **Fix 2 — Settings RTL:** Corrected JSX child order in `app/settings.tsx` for five sections. Per DECISIONS.md, first child in `row-reverse` lands on the RIGHT. Omer toggle (A), Omer time row (B), candle-lighting toggle (C), candle-lighting city row (D) all had label and control reversed. PickerModal option rows (E) changed to `row-reverse` + label first/radio last + `marginLeft` → `marginRight` on radio. `SettingRow` (standard rows) was already correct and untouched.

- **Fix 3 — Global event refresh:** Added `notesVersion: number` and `incrementNotesVersion()` to `CalendarProvider` (Zustand). Updated `useNotes.ts` to replace the local `useState(0)` `refreshKey` with `notesVersion` from the store; `setRefreshKey(k => k + 1)` replaced with `incrementNotesVersion()`. Return value aliased as `refreshKey: notesVersion` for zero-diff callers. MonthGrid and Day screen wiring unchanged — both already consumed `refreshKey` from `useNotes` which now carries the global counter. Any save/delete anywhere now causes both Month cells and Day screen to re-fetch.

- **Fix 4 — Export button removed from Day screen:** Removed the secondary 40dp export FAB, its `exportModalVisible` state, its `ExportModal` instance, and `exportBtn` style from `app/(tabs)/day.tsx`. Also removed the `CalendarArrowUp` and `ExportModal` imports. The drawer entry point ("ייצוא יומן" DrawerItem in `Drawer.tsx`) is the sole export entry point going forward.

### Decisions made

- None new (all fixes follow existing locked decisions and conventions).

### Open issues / blocked

- Bug A (dark/light theme persistence across restarts) remains open — not addressed in this session.
- EAS build (versionCode 7) needed to verify all four fixes on a real Android device.

### Next steps

- EAS build versionCode 7 to test on device.
- Bug A: theme persistence fix.
- Remaining Phase 5 backlog per ROADMAP.

---

## 2026-06-01 — Session: Phase 5 Wave 4b — .ics Export

**Phase:** Phase 5, Wave 4b
**Commits:** `776f26a` (feat: IcsExportService — build and share .ics file), `56f12aa` (feat: ExportModal + drawer and day screen entry points)
**Status:** Wave 4b complete. DoD passed (typecheck green, expo-doctor 16/17 baseline).

### What got done

- **`expo-file-system@~17.0.1` + `expo-sharing@~12.0.1`** installed via `npx expo install` (SDK 51 compatible). Neither was previously in the project.
- **`StorageService.getAllEvents()`** (database-architect/local-data-builder): returns all non-cancelled events ordered by `start_date ASC`. Used by IcsExportService.
- **`src/services/IcsExportService.ts`** (local-data-builder, new): `exportCalendar(includeHebcal)` builds RFC 5545 iCal string (personal events always + optional hebcal holidays/Rosh Chodesh for current Hebrew year), writes to `FileSystem.cacheDirectory`, shares via `Sharing.shareAsync`. Hebrew-language errors thrown for UI display.
- **`src/components/export/ExportModal.tsx`** (mobile-ui-builder, new): fade Modal with RTL layout. Checkbox "כלול חגים, שבתות וראשי חודשים" (default off). ActivityIndicator while exporting. Error → `Alert.alert`. Loading blocks dismiss.
- **`src/components/drawer/Drawer.tsx`** (mobile-ui-builder): `CalendarArrowUp` "ייצוא יומן" DrawerItem before settings divider. ExportModal rendered at JSX root with 150ms open delay after drawer close.
- **`app/(tabs)/day.tsx`** (mobile-ui-builder): secondary 40dp export FAB at `bottom: 90` (above main FAB). Same RTL-aware `I18nManager.isRTL` positioning pattern.

### Decisions made

- `sedrot: false` in hebcal flags (per spec). Shabbat events require `sedrot: true` to appear; with current flags, only holidays and Rosh Chodesh categories are generated. Documented as future enhancement.
- `expo-sharing` + `expo-file-system` installed as new direct deps — authorized by session goal.

### Open issues / blocked

- Shabbat events in hebcal export require `sedrot: true`; current flags omit them. Low priority — holidays + Rosh Chodesh cover the main need.

### Next steps

- EAS build (versionCode 7) to test export on real device.
- Remaining Phase 5 backlog per ROADMAP.

---

## 2026-06-01 — Session: Phase 5 Wave 4a — Color Picker

**Phase:** Phase 5, Wave 4a
**Commits:** `7647654` (feat: SQLite color_id migration + save/load), `69619b5` (feat: resolveEventColor utility + CalendarNote colorId field), `7e01f9f` (feat: color picker in NoteEditor), `0330ac9` (feat: quick color dot in NoteList)
**Status:** Wave 4a complete. DoD passed (typecheck green, expo-doctor 16/17 baseline).

### What got done

- **`StorageService.ts`** (database-architect): Added idempotent v3 migration guard — `ALTER TABLE events ADD COLUMN color_id TEXT` — following the same `schemaV2Migrated` try/catch pattern. Column was already in `CREATE TABLE` and save/load already handled it; guard is belt-and-suspenders for edge-case existing installs.
- **`src/utils/colorResolver.ts`** (local-data-builder, new file): Pure utility. Exports `COLOR_OPTIONS` (5 token keys), `ColorTokenKey` type, and `resolveEventColor(noteType, colorId) → TagCategory`. Override logic: colorId token key wins; else inferred from note type (birthday/yahrzeit/anniversary → personal, note → event).
- **`src/hooks/useNotes.ts`** (local-data-builder): `CalendarNote.colorId?: string | null` added. `eventToCalendarNote` reads `event.colorId`. `saveNote` params extended with optional `colorId`.
- **`src/utils/tagMapper.ts`** (local-data-builder): `buildDayTags` now calls `resolveEventColor(note.noteType, note.colorId)` for the tag category — replaced hardcoded `'event'`/`'personal'`. Existing notes without colorId behave identically.
- **`src/components/notes/NoteEditor.tsx`** (mobile-ui-builder): `ColorPickerRow` sub-component — 5 Pressable circles (24dp, row-reverse, gap 8), selected shows white ✓. Placed immediately below the type chip selector. `colorId` state (null = default, explicit key = override). Pre-populates on edit. Passed through `onSave`.
- **`src/components/notes/NoteList.tsx`** (mobile-ui-builder): 16dp color dot as first child in note row (leftmost). Tapping opens a fade Modal with 5 circles (32dp). Selection calls `saveNote` immediately with new `colorId` and closes. Backdrop tap closes without saving.

### Decisions made

- None new (feature followed locked design spec).

### Open issues / blocked

- color_id column was already in CREATE TABLE (from original Google Calendar-compatible schema). No data migration concern for real users.
- Bug A and Bug B from prior session remain unresolved (but were found to be non-existent in current code — pending re-test on next APK build).

### Next steps

- EAS build (versionCode 7) to test Wave 4a on real device. 13 builds remaining.
- Bug A + Bug B re-test.

---

## 2026-06-01 — Session: Phase 5 Drawer RTL fixes

**Phase:** Phase 5 (maintenance)
**Commits:** `0d936f6` (fix: Drawer RTL stability — drawerWidth guard, delta gesture, animatedProps backdrop), `b6afe3e` (fix: Drawer gesture onEnd worklet crash), `53e0687` (fix: move Drawer early return after all hook declarations)
**Status:** Complete. DoD passed (typecheck green, expo-doctor 16/17 baseline).

### What got done

- drawerWidth guard: render deferred until screenWidth > 0 (return null); translateX initialized to -1000 sentinel.
- Delta-based gesture: gestureStartX shared value captures translateX.value at onStart; onUpdate applies gestureStartX + e.translationX (not raw translationX from zero). Fixes left/right alternation on repeat open/close.
- animatedProps backdrop: pointer-events controlled via Reanimated useAnimatedProps keyed on backdropOpacity.value — not React state + setTimeout. Eliminated unreliable tap-to-dismiss on real Android.
- Drawer gesture crash: runOnJS(closeDrawer) → runOnJS(triggerClose) to avoid Reanimated worklet serialization of Zustand store action.
- Rules of Hooks fix: early return (screenWidth===0 guard) moved after all hook declarations; guard now renders null via JSX conditional, not early return.
- RTL layout: Day screen study items — flexDirection row-reverse, textAlign right on label+value. Settings rows — flexDirection row-reverse on rowStyles.row.

### Decisions made

- Two new entries added to DECISIONS.md: runOnJS worklet pattern (triggerClose wrapper) and hooks-before-return rule for Drawer.tsx.

### Open issues / blocked

- dark/light theme persistence not persisted across restarts (Bug A).
- User-created event indicators missing from month day cells (Bug B).

### Next steps

- Bug A + Bug B fixes.

---

## 2026-06-01 — Session: Phase 5 Wave 3b-2 — Geolocation city resolution

**Phase:** Phase 5, Wave 3b-2
**Commits:** `6246e73` (feat: findNearestCityKey utility in locationLookup.ts), `61ce318` (feat: geolocation city resolution in candle-lighting Settings)
**Status:** Wave 3b-2 complete. DoD passed (typecheck green, expo-doctor 16/17 baseline).

### What got done

- `findNearestCityKey` utility: takes `{latitude, longitude}`, iterates the curated city list from `@hebcal/cities`, returns the key of the geographically nearest city (Haversine distance).
- Geolocation Alert flow in Settings: "עדכן לפי מיקום" button requests `expo-location` permission, calls `getCurrentPositionAsync`, runs `findNearestCityKey`, updates LocationProvider city — all with loading state and error handling.
- `app.json` already had `expo-location` config from Phase 4.5; no new native changes required.
- Agents: `local-data-builder` (findNearestCityKey), `mobile-ui-builder` (Settings UI).

### Decisions made

- None new.

### Open issues / blocked

- Bug A + Bug B (see Drawer RTL session entry above).

### Next steps

- Drawer RTL stability fixes (committed same session). Then Bug A + Bug B.

---

## 2026-06-01 — Session: Phase 5 Wave 3b-1 — Candle-lighting reminders

**Phase:** Phase 5, Wave 3b-1
**Commits:** `aa87609` (feat: candleLighting fields in SettingsProvider + ensureCandleLightingReminders in NotificationService), `563077c` (fix: settings row RTL direction — row-reverse for Hebrew layout), `6984f87` (fix: RTL layout for daily study items in Day screen)
**Status:** Wave 3b-1 complete. DoD passed (typecheck green, expo-doctor 16/17 baseline).

### What got done

- **SettingsProvider:** three new fields — `candleLightingRemindersEnabled` (bool, default false), `candleLightingLeadMinutes` (number, default 15), `candleLightingCity` (string | null, default null). All wired in `SettingsState`, initializer, setters, `loadFromStorage`, and `save()` — the settings-persistence-gotcha explicitly satisfied.
- **`NotificationService.ensureCandleLightingReminders()`:** sweep-on-init over next 30 days, identifies erev Shabbat + erev Yom Tov, computes fire time as shkia − cityOffsetMinutes − leadMinutes via `ZmanimService.getZmanim()`, stable id namespace `candle-YYYYMMDD`, idempotent diff.
- **Settings UI:** candle-lighting section with toggle, lead-time chips (5/10/15/30 min), city picker (scrollable list from curated city set). Alert flow for first-enable with no city set.
- **`_layout.tsx`:** `ensureCandleLightingReminders()` added to init sweep after `ensureOmerReminders`.
- Agents: `local-data-builder` (SettingsProvider, NotificationService), `mobile-ui-builder` (Settings UI, _layout wiring).

### Decisions made

- Candle-lighting fire time = computed (shkia − cityOffset − leadMinutes), NOT the 09:00 all-day policy. Logged in DECISIONS.md (see "Candle-lighting reminders: computed fire time").

### Open issues / blocked

- None from Wave 3b-1.

### Next steps

- Wave 3b-2: geolocation city resolution.

---

## 2026-05-30 — Session: Phase 5 Wave 3a — Omer Count Reminders

**Phase:** Phase 5, Wave 3a
**Commits:** `c00ddfa` (settings), `10ff880` (DateService helper), `eef7df0` (ensureOmerReminders + on-change wiring), `fcc3c08` (Settings UI + _layout init)
**Status:** Wave 3a complete. DoD passed (typecheck green, expo-doctor 16/17 baseline — no new failures).

### What got done

- **STEP 1 (local-data-builder → `src/providers/SettingsProvider.tsx`):**
  - `omerRemindersEnabled: boolean` (default false) and `omerReminderTime: string` (default "21:00") added.
  - Both fields wired in ALL required locations: `SettingsState` interface, initializer, setters, `loadFromStorage` Promise.all, and `set({...})` call. The use24hTime persistence bug pattern explicitly satisfied.
  - Setters at this stage: save-only (no `ensureOmerReminders` call yet — added in STEP 2).

- **STEP 1a (local-data-builder → `src/services/DateService.ts`):**
  - New exported function `getOmerForDate(date: Date): { day: number; text: string } | null`.
  - Targeted single-day `HebrewCalendar.calendar({ omer: true })` call; finds the `OMER_COUNT` event; returns `{ day, text: ev.render('he') }` (full traditional Hebrew phrasing including weeks clause). Returns null cleanly outside the Omer period — verified by trace (Tishrei date: `.find()` returns undefined → null branch taken, no throw).
  - No diaspora parameter (Omer timing universal). Does not touch the month cache.

- **STEP 2 (local-data-builder → `src/services/NotificationService.ts` + `src/providers/SettingsProvider.tsx`):**
  - Removed pre-Wave-1 dead methods `scheduleOmerReminders` (location-based, all-49-at-once, wrong approach) and `scheduleEventReminder` (superseded by `scheduleLocalNotification`). Removed now-unused `import { getZmanim } from './ZmanimService'`.
  - Added `ensureOmerReminders(enabled: boolean, time: string): Promise<void>` — sweep-on-init model, rolling window of next 10 days, stable id namespace `omer-YYYYMMDD`, idempotent diff against `getScheduled()`, body text from `getOmerForDate(candidate).text` (full Hebrew phrasing). Disabled path cancels all `omer-` prefixed notifications.
  - SettingsProvider setters updated: `setOmerRemindersEnabled` and `setOmerReminderTime` now call `void NotificationService.ensureOmerReminders(...)` with the new value + current other value after saving, so the schedule updates immediately on toggle/time change without requiring app restart.

- **STEP 4 (mobile-ui-builder → `src/hooks/useTimePicker.tsx`, `app/settings.tsx`, `app/_layout.tsx`):**
  - New `useTimePicker(value: string, onChange: (time: string) => void)` hook — same pattern as `useDatePicker`, `mode="time"`, iOS `locale="en-GB"` (forces 24h), Android `is24Hour={true}`. String↔Date helpers `timeStrToDate`/`dateToTimeStr`.
  - Settings "התראות" section extended: Row A (Omer toggle, `flexDirection: 'row-reverse'`, label right / Switch left, min-height 48dp), Row B (time picker row, conditional on `omerRemindersEnabled`, taps open `useTimePicker` modal). `timePicker` node rendered outside ScrollView.
  - `app/_layout.tsx`: `ensureOmerReminders(omerRemindersEnabled, omerReminderTime)` added immediately after `ensureAnnualReminders()`, reading values from `useSettingsStore.getState()` (post-loadFromStorage, values reflect persisted state).

### Decisions made

- Omer reminders use a fixed user-chosen fire time (default 21:00 local), settings-only — no DB row, no NotificationRecord written. First application of the sweep-on-init model to a computed (non-DB) entity. Logged in DECISIONS.md.
- `getOmerForDate` added to DateService as the authoritative source for Omer day number + full Hebrew phrasing. NotificationService delegates to it; no Omer math reimplemented in the service layer.
- Pre-Wave-1 dead methods removed in the same STEP 2 commit (no separate cleanup commit).

### Open issues / blocked

- Behavioral notification delivery testing deferred to the versionCode-5 APK (EAS quota resets 2026-06-01). Typecheck passes and scheduling calls are structurally correct.
- `omerRemindersEnabled` defaults to false — users must opt in via Settings.

### Next steps

- Wave 3b: candle-lighting notifications (location/astronomical — different from fixed-time Omer; involves ZmanimService integration).
- Wave 4: .ics export/import.
- APK build (versionCode 5): queue via `eas build --platform android --profile preview` after June 1 quota reset.

---

## 2026-05-28 — Session: Phase 5 Wave 2 — Event Reminders + NotificationService Activation

**Phase:** Phase 5, Wave 2
**Commits:** `9b1e3e9` (zod direct dep), `98f92d6` (migration), `29c9c76` (ensureAnnualReminders), `3a809b2` (useNotes), `e44c662` (init wiring), `45b1881` (NoteEditor UI), `fcde9db` (Settings count)
**Status:** Wave 2 complete. DoD passed (typecheck green, expo-doctor 16/17 baseline, expo install --check clean).

### What got done

- **STEP 0 (Claude Code):** zod added as a direct dependency via `npx expo install zod` (was previously only transitive). Verified with `expo install --check`.

- **STEP 1–2 (local-data-builder → `src/services/StorageService.ts`):**
  - `schemaV2Migrated` flag added. `ensureSchema()` now runs `ALTER TABLE events ADD COLUMN reminder_minutes INTEGER` inside try/catch — safe on fresh installs (succeeds) and existing installs (catches and ignores "column exists" error).
  - `saveEvent()` extended to 22 columns — persists `event.reminders?.overrides?.[0]?.minutes ?? null` as `reminder_minutes`.
  - `rowToEvent()` reconstructs `reminders` from `row.reminder_minutes` (null → `{ useDefault: false }`, non-null → `{ useDefault: false, overrides: [{ method: 'popup', minutes }] }`).
  - New `getEventsWithReminders()`: parameterized SELECT for all non-cancelled events with reminder_minutes set.

- **STEP 3 (local-data-builder → `src/services/NotificationService.ts`):**
  - `ensureAnnualReminders()` added. Imports `HDate` from `@hebcal/core` and `StorageService`. On each init: fetches recurring events with reminders, computes next occurrence (Gregorian: same month/day year-walk; Hebrew: HDate.greg() for current/next Hebrew year), trigger = 09:00 local minus reminderMinutes, skips already-scheduled IDs, schedules gaps. Code comment documents the sweep-on-init contract.

- **STEP 4 (local-data-builder → `src/hooks/useNotes.ts`):**
  - `CalendarNote.reminderMinutes: number | null` field added (non-optional).
  - `eventToCalendarNote()` extracts it from `event.reminders?.overrides?.[0]?.minutes ?? null`.
  - `saveNote()` extended with `reminderMinutes?: number | null`. **KEY CORRECTION applied (per user):** one-time events (recurrenceType='none') → schedule immediately; recurring events (yearly_*) → persist reminder_minutes only, do NOT schedule here (owned by ensureAnnualReminders). `notificationScheduled: reminderMinutes != null` regardless of recurrence. `cancelNotification(id)` fires on edit (before save).
  - `deleteNote()` now calls `NotificationService.cancelNotification(id)` before soft-delete.

- **STEP 5 (mobile-ui-builder → `app/_layout.tsx`):**
  - `NotificationService.init()` added to the `Promise.all` alongside loadFromStorage calls.
  - `await NotificationService.ensureAnnualReminders()` added after the Promise.all resolves.

- **STEP 6 (mobile-ui-builder → `src/components/notes/NoteEditor.tsx`):**
  - "תזכּר אותי" section added between anchor-type chips and action buttons.
  - Toggle row (`row-reverse` RTL): Hebrew label right, Switch left.
  - Lead-time chips: בזמן האירוע / 10 דקות לפני / שעה לפני / יום לפני / מותאם אישית (custom TextInput, minutes).
  - Pre-populates on edit from `note?.reminderMinutes`.
  - `handleSave` computes `finalReminderMinutes` and passes to `onSave`.
  - `onSave` prop type extended with `reminderMinutes?: number | null` (optional → all 4 call sites untouched and typecheck-clean: NoteList, day.tsx, WeekGrid, MonthGrid).

- **STEP 6 (mobile-ui-builder → `app/settings.tsx`):**
  - Scheduled count display row added to "התראות" section (display-only, NOT persisted).
  - `NotificationService.getScheduled()` read in `useEffect` on mount.
  - Displays "X התראות מתוזמנות" / "אין התראות מתוזמנות" / "..." while loading.

### Decisions made

- All-day reminder fire time locked: 09:00 local on event day minus reminderMinutes. Logged in DECISIONS.md.
- Sweep-on-init scheduling model locked: ensureAnnualReminders is sole scheduler for yearly_* events; saveNote never schedules them. Logged in DECISIONS.md.
- Rationale for one-time-only scheduling in saveNote (user correction): a single event.id must be owned by exactly one scheduler. Double-scheduling with a stale start date would cause duplicate/incorrect-time notifications for recurring events.

### Open issues / blocked

- **Behavioral notification testing deferred to APK.** In Expo Go, scheduled local notifications have usage limits and may not fire reliably. Typecheck passes and scheduling calls succeed, but end-to-end delivery verification requires the standalone APK (versionCode 5, after EAS quota resets 2026-06-01).
- `NotificationService.init()` is now active in _layout.tsx — any existing Expo Go session will receive the Android notification channel setup and handler registration on next app start.

### Next steps

- Wave 3: Omer reminders settings toggle + candle-lighting.
- Wave 4: .ics export/import.
- APK build (versionCode 5): queue via EAS after June 1 quota reset. Run `eas build --platform android --profile preview`.
- zod dep: now direct at `^3.25.76`.

---

## 2026-05-28 — Session: Phase 5 Wave 1 — NotificationService Foundation

**Phase:** Phase 5, Wave 1
**Commits:** `7341dfb` (NotificationService API), `3d76164` (NotificationSchema), `fa9ecae` (permission UI + settings)
**Status:** Wave 1 complete. DoD passed (typecheck green, expo-doctor 16/17 — baseline).

### What got done

- **Schema added mid-session:** User locked `NotificationRecordSchema` fields before agent dispatch. Final schema includes 4 additional fields beyond the original spec: `recurrence` (enum: none/daily/weekly, default 'none'), `renewalPolicy` (enum: never/annual/september, default 'never'), `lastConfirmedAt` (optional date), `color` (optional token key enum from DESIGN.md tag colors). These fields are schema-only — no renewal logic implemented yet.

- **`local-data-builder` → `src/services/NotificationService.ts`** (7341dfb):
  - `init()` made async; Android notification channel setup added (default channel, HIGH importance, `#4A90D9` light color — justified hex use: Android native channel definition, not RN styling).
  - 5 new methods: `getPermissionStatus()`, `scheduleLocalNotification({id, title, body, triggerDate, data?})`, `cancelNotification(id)`, `cancelAll()`, `getScheduled()`.
  - All existing methods unchanged.

- **`local-data-builder` → `src/schemas/NotificationSchema.ts`** (3d76164): New file. Exports `NotificationType`, `NotificationTagColor`, `NotificationRecurrence`, `NotificationRenewalPolicy` enums and `NotificationRecordSchema` Zod schema with inferred `NotificationRecord` type.

- **`mobile-ui-builder` → `src/hooks/useNotificationPermission.ts`** (fa9ecae): New hook. Reads status on mount, prompts if undetermined, opens Settings app (`Linking.openSettings`) if denied. Returns `{status, isGranted, isDenied, isUndetermined, request, refresh}`. Note: `PermissionStatus` imported as type from `expo-modules-core` (re-export from `expo-notifications` is type-only; runtime comparisons use string literals).

- **`mobile-ui-builder` → `app/settings.tsx`** (fa9ecae): Added "התראות" section after "זמנים". Bell icon row shows live permission status: `מופעל` / `לא הופעל` / `חסום — פתח הגדרות`. Tap calls `permission.request()` which branches on current status.

- **Pre-flight finding:** `expo-notifications ~0.28.0` was already installed; `expo-notifications` plugin was already in `app.json`. No install step needed, no app.json changes required.

- **Pre-flight finding:** `NotificationService.init()` is not called anywhere yet. It will need to be wired into `app/_layout.tsx` when the notification system is activated (Wave 2+).

### Decisions made

- `renewalPolicy`, `recurrence`, `lastConfirmedAt`, `color` fields added to schema proactively — architecture logged in DECISIONS.md (see "Notification renewal schema fields").
- `zod` is a transitive dependency, not a direct one. Flagged by local-data-builder. Architect-level decision — carry forward to Phase 5 dep-policy review.

### Open issues / blocked

- `NotificationService.init()` is not called anywhere. Must be wired into `app/_layout.tsx` before notifications can fire. This is a Wave 2 task (out of Wave 1 scope).
- Renewal logic (`renewalPolicy`, `lastConfirmedAt`) is schema-only — no implementation. Intentional; schema fields exist to avoid a future SQLite migration.

### Next steps

- Wave 2: wire `NotificationService.init()` into root layout; implement event reminder scheduling UI; Omer reminder settings toggle.
- Dep-policy: decide whether `zod` should be an explicit direct dependency in `package.json`.
- EAS build quota resets 2026-06-01 — first APK build available then.

---

## 2026-05-27 — Session: EAS APK distribution setup — BLOCKED on quota until June 1

**Phase:** Post-Phase-4.7 — APK distribution
**Commits:** `6202f64` (EAS config), `c76cd86` (react-native-svg)
**Status:** Code ready, EAS Free Tier quota exhausted until 2026-06-01

### What got done

- **EAS Build configuration committed** (`6202f64`):
  - `eas.json`: switched `appVersionSource` `local → remote` (EAS owns versionCode server-side)
  - Added `autoIncrement: true` to preview and production profiles
  - Kept existing `base` profile with Node 20.18.1 pin
  - Loosened `cli.version` to `>= 7.0.0`
- **`react-native-svg@15.2.0` installed** (`c76cd86`):
  - Missing peer dep of `lucide-react-native`, masked by Expo Go (which bundles it)
  - First standalone APK (versionCode 2, build `bfde20ff`) installed but crashed on launch
    — exactly the crash `expo doctor` had warned about. Confirmed at runtime on Galaxy S25 FE.
  - After install: `npx expo-doctor` green (16/17, the one remaining is a pre-existing
    non-fatal metro warning), typecheck green

### Decisions made

- **Free Tier quota burned by failed attempts.** Three versionCodes consumed (2 → finished
  but crashes; 3 → upload aborted mid-transfer; 4 → quota-rejected at queue time).
  Server-side `autoIncrement` counted all three. Next successful build will be **versionCode 5**.
- **Wait for June 1 quota reset** over paid plan or local build. Decision rationale:
  4-day wait is reasonable; local Android Studio setup is heavier than the gain;
  Expo Pro at $19/mo isn't justified for a personal-use APK.
- **`base` profile + Node 20.18.1 pin retained** — sound practice for reproducible EAS builds
  vs. letting EAS pick a default Node.
- **Keystore reused** — EAS detected existing keystore `qNriOh_dGk` from the older
  project version. Means any historical installs of the previous Luchot can be
  updated by future APKs without uninstall.

### Open issues / blocked

- **EAS Free Tier quota exhausted.** Resets 2026-06-01 (Mon). Block on APK distribution.
- The crashing APK installed on test device (versionCode 2) should be uninstalled
  before installing versionCode 5 (avoid confusion).

### Next steps

- **2026-06-01:** Run `eas build --platform android --profile preview`. Expected:
  versionCode 5, build succeeds, APK downloads, installs cleanly, no crash on launch.
- After APK validation, Phase 5 can begin per ROADMAP (notifications wiring is
  next on the agenda).

---

## 2026-05-27 — Phase 4.7 — Post-feedback fixes

Six bugs from on-device Android testing of mvp-1.0.0 + Phase 4.6.

### What was done

**4.7-1 — SQLite "Unimplemented" persists (Expo Go)**
- Root cause (Scenario B): `expo-sqlite/legacy` investigation revealed that BOTH `openDatabaseAsync` AND `openDatabaseSync` in v14 use `NativeDatabase` (new native module, not in standard Expo Go). The `expo-sqlite/legacy` entry point (package.json `"./legacy"` export) provides the classic `openDatabase()` API that uses the old native module shipped with Expo Go.
- Fix: complete rewrite of `StorageService.ts` to `import { openDatabase } from 'expo-sqlite/legacy'`. Replaced `execAsync`/`getAllAsync`/`runAsync` with `transactionAsync` / `executeSqlAsync` wrappers (`dbAll`, `dbRun`, `dbFirst`). Public method signatures unchanged.

**4.7-2 — Calendar grid: only first/last rows visible, middle rows collapsed**
- Root cause: `weekRow: {}` (empty style) in `MonthGrid.tsx`. For rows containing ONLY `cellWrapper` children (weeks 2–5 of most months), Yoga's circular height dependency resolves to 0. DayCell has `flex:1 + height:110` inside `cellWrapper` (column, no defined height); `flex:1` wins and collapses the cell. Rows that contained at least one `emptyCell` with `height:110` (weeks 1 and 6) worked because emptyCell anchored the row height.
- Fix: added `height:110` to `weekRow` style. All rows now get explicit height; `cellWrapper` stretches to it via default `alignItems:stretch`; DayCell fills correctly.

**4.7-3 — English book names in Details ("I Kings", "Psalms")**
- Root cause: The 4.6-B regex only stripped LEADING English prefixes ("Daf Yomi: "). Some @hebcal/learning schedules append English book names after the Hebrew citation (e.g., "ה'  I Kings", "ס׳-ס״ה Psalms").
- Fix: added second regex `.replace(/\s+[A-Za-z][A-Za-z\s]*$/, '')` to strip trailing English. Added Hebrew-character guard (Unicode range `/[֐-׿]/`) to reject outputs with no Hebrew remaining.

**4.7-4 — Details section headers: icon on wrong side**
- Root cause: `sectionHeader: { flexDirection: 'row' }` (LTR). Icon was the first child → rendered on the LEFT. Hebrew RTL reading starts at the RIGHT, so the icon should be there.
- Fix: swapped JSX child order in `LearningSection`: `<Text>` first (→ left), `<Icon>` second (→ right). No style changes.

**4.7-5 — Drawer slides from wrong side**
- Root cause: drawer anchored `right: 0`, translated from `+drawerWidth` to `0`. Hamburger button is on the LEFT; drawer appeared from the opposite side.
- Fix: anchor changed to `left: 0`; initial translateX = `-drawerWidth`; open/close animations and swipe gesture thresholds all negated accordingly; border changed from `borderLeftWidth` to `borderRightWidth`.

**4.7-6 — Zmanim rows: label and time touching**
- Root cause: ZmanimFullList `label: { flex:1 }` causes Hebrew text (right-aligned in RTL context) to end flush against the time value. ZmanimList also lacked any gap.
- Fix: added `gap: 12` to `row` style in both `ZmanimList.tsx` and `ZmanimFullList.tsx`.

### Decisions made
- `expo-sqlite/legacy` is the definitive path for Expo Go compatibility until a custom dev client is required
- MonthGrid weekRow height anchors the grid; DayCell internal height unchanged
- Drawer now slides from the LEFT; this is permanent (hamburger placement drives drawer side)

### Open issues / blocked
- None. All six issues resolved.

### Next steps
- Re-test all six bug areas on Android Expo Go
- When satisfied, proceed to EAS Build for APK (Phase 5 backlog)

---

## 2026-05-27 — Phase 4.6 — Pre-release fixes

Three sub-phases addressing issues found during on-device testing of `mvp-1.0.0` via Expo Go on Android.

### What was done

**4.6-A — SQLite Expo Go compatibility fix**
- `src/services/StorageService.ts`: replaced `openDatabaseAsync` (expo-sqlite v14 "Next" API, requires custom dev client) with `openDatabaseSync` (works in standard Expo Go)
- Extracted schema creation into module-level `ensureSchema()` with a `schemaInitialized` flag; each public method calls it on first use — lazy-init behavior preserved
- `StorageService.init()` now delegates to `ensureSchema()` — backward compatible with `_layout.tsx` caller
- All query methods (`execAsync`, `getAllAsync`, `runAsync`, `getFirstAsync`) are identical on the sync handle — zero downstream signature changes

**4.6-B — Details screen: prefix stripping + layout fix**
- `src/services/DateService.ts` `renderLearning`: strips leading English prefix (`"Daf Yomi: "`, `"Mishna Yomi: "`, etc.) from each schedule's display string via regex `^[A-Za-z][A-Za-z\s]*:\s*`. The Details screen already shows a Hebrew label per row; the bilingual prefix was redundant and compressed Hebrew text. Guard added for empty-after-strip edge case.
- `app/details.tsx` `LearningRow` styles: added `textAlign: 'right'` to `rowLabel` and `rowValue`; added `flexShrink: 1` to `rowContent`; added `flexShrink: 0` to `linkBtn`; reduced `linkBtn.paddingHorizontal` 10→8

**4.6-C — Hebrew calendar grid RTL**
- `src/components/calendar/MonthGrid.tsx`: replaced `FlatList` (always LTR) with manual View-based 7-column grid
- `isRtl = mode === 'hebrew'` drives `flexDirection: 'row-reverse'` on both the day-name header row and each week row
- Hebrew mode: Sunday(א׳) rightmost, Shabbat(ש׳) leftmost ✓
- Gregorian mode: Sunday leftmost, Saturday rightmost, English day names (`Sun`–`Sat`) ✓
- Added `DAY_NAMES_EN_SUN_FIRST` / `DAY_NAMES_EN_MON_FIRST` arrays for Gregorian mode
- `startDayOffset` calculation unchanged — visual flipping via `flexDirection` handles both modes without changing offset logic
- `weeks` 2D array (`(DayData | null)[][]`) replaces flat `gridData` array
- `DayCell` unchanged; all gesture handlers (tap, long-press, swipe) preserved
- `FlatList` import removed from react-native

### Decisions made
- `openDatabaseSync` chosen over downgrading to `expo-sqlite@~13.x` — same API surface, no dependency change, forward-compatible with custom dev builds and production
- `flexDirection: 'row-reverse'` chosen over `transform: [{ scaleX: -1 }]` mirror hack — gesture events and accessibility work correctly without unmirror workarounds
- English day names added to Gregorian tab (previously used Hebrew names in both tabs)

### Open issues / blocked
- None. All three issues resolved.

### Next steps
- Re-run on Expo Go to verify no more "Unimplemented" crashes
- Visual check: Hebrew grid Sunday right / Shabbat left; Gregorian grid Sunday left
- When satisfied, proceed to Phase 5 (Push Notifications + Omer count enhancements) per ROADMAP

---

## 2026-05-27 — MVP CLOSURE — Luchot v1.0.0 🎉

All six VISION.md success criteria are met. Phase 4 is complete.

### VISION criteria status

1. ✓ **Opening the app shows Hebrew date + Gregorian date + holidays + Parasha + Daf Yomi + Rambam + Omer count + candle lighting if Friday** — Day screen (ScreenHeader, holiday banner, Torah details section, ZmanimList with candle lighting row)
2. ✓ **Switching between Hebrew and Gregorian calendar views preserves context** — עברי and לועזי tabs share `selectedDate` from CalendarProvider
3. ✓ **Tapping any day reveals full details (zmanim, learning items, holidays)** — Day tab + Details drawer screen
4. ✓ **Personal notes, events, birthdays, yahrzeits appear on the calendar** — NoteEditor + useNotes + tags visible in MonthGrid + WeekGrid (Phase 4.2)
5. ✓ **14 halachic zmanim per day for the user's location and shita** — ZmanimService + per-city candle lighting (Phase 4.3) + location picker (Phase 4.5)
6. ✓ **Full Hebrew RTL UI** — every screen, every component, text-align right throughout

### Phase 5 opens with
- Notifications wiring (Omer reminders, candle lighting alerts)
- Learning schedules expansion (rambamThreeChapters, seferHaMitzvot, arukhHaShulchan — requires @hebcal/core v6)
- Per-hour notes (time-anchored note entries in the Day screen)
- Week view expansion
- Yerushalmi Yomi
- Proper Rabbanut shita (requires location picker — now complete)

Tagged: `mvp-1.0.0`

---

## 2026-05-27 — Session: Phase 4.5 (Location picker UI) — Phase 4 COMPLETE

**Phase:** Phase 4.5 — final phase of Phase 4
**Commits:** `3423cbd` (omerReminders cleanup), `7f9a3b4` (cities + utilities), `4bfbbf2` (LocationProvider), `86816ff` (_layout startup), `b8663ef` (picker screen), `8a00f2a` (Zmanim chip + Drawer)
**Duration:** ~¾ session

### What got done

- **`@hebcal/cities@5.0.1`** — installed, compatible with `@hebcal/core@5.10.1` (`peerDependencies: @hebcal/core ^5.0.3`). Side-effect import registers ~700 cities into Hebcal's `Location` class. **36/40 originally-planned cities resolved** (4 dropped: Kefar Sava, Beit Shemesh, Rosh HaAyin, Antwerp — not found in @hebcal/cities@5.0.1).

- **`src/constants/cities.ts`** — 36-city curated list (22 Israeli + 14 international) with Hebrew display names keyed by @hebcal/core lookup key. Exports `CITIES`, `CityEntry`, `findCityByKey`.

- **`src/utils/locationLookup.ts`** — three utilities:
  - `lookupCityByCoords(lat, lng)` — city if within 15 km; null otherwise
  - `findNearestCity(lat, lng)` — always returns closest curated city
  - `getCityCoordinates(hebcalKey)` — pulls lat/lng from Hebcal

- **`src/providers/LocationProvider.tsx`** — major extension:
  - State: added `cityHebcalKey?: string` + `source: 'gps' | 'manual' | 'default'`
  - `setLocationFromGps(lat, lng)` — runs city lookup, persists all 4 keys
  - `setLocationFromCity(hebcalKey)` — pulls coords from Hebcal, persists
  - `loadFromStorage()` — rehydrates on cold start; migration path for existing users (backfills `cityHebcalKey` via `lookupCityByCoords` if missing)
  - Old `setLocation(lat, lng)` removed
  - `import '@hebcal/cities'` side-effect at top of file

- **`app/_layout.tsx`** — `useLocationStore.getState().loadFromStorage()` added to init sequence (parallel with settings load)

- **`app/locationPicker.tsx`** — new screen at `/locationPicker`:
  - GPS button (requests permission → setLocationFromGps → back)
  - Search box (Hebrew name or English key)
  - Israeli cities section (22 cities)
  - International cities section (14 cities)
  - Selected city highlighted with accent color + ✓

- **`app/settings.tsx`** — location row replaced: was GPS-only button, now shows current city name + `›` arrow linking to `/locationPicker`

- **`app/(tabs)/zmanim.tsx`** — location chip now interactive:
  - Shows real city name (not hardcoded `'ישראל'`)
  - Shows `Navigation` icon when source is `'gps'`
  - Tapping navigates to `/locationPicker`

- **`src/components/drawer/Drawer.tsx`** — `MapPin / מיקום` item added between פרטי לימוד and the Settings divider

- **`app/settings.tsx` + `src/providers/SettingsProvider.tsx`** (Commit 0) — `omerReminders` toggle removed entirely (was never wired to NotificationService; prevents user confusion; returns in Phase 5 with real functionality)

- Typecheck green at every commit boundary.

### Decisions made

- **Option A (install @hebcal/cities) over Option B (hardcoded coords)**: 218 KB unpackaged, zero maintenance, future-proof for Phase 5 expansion. VISION-compliant (offline-only data).
- **4 cities dropped** (not in @hebcal/cities@5.0.1): Kefar Sava, Beit Shemesh, Rosh HaAyin, Antwerp. Per spec rule: "If 1-4 keys fail, document and remove." Cities remain shippable at 36.
- **`findNearestCity` as fallback in settings + Zmanim chip**: user always sees a city name even if their exact GPS coords are more than 15 km from a curated city.
- **omerReminders removed** (Commit 0): was Phase 4.6 work, Phase 4.6 deferred to Phase 5. Removing the toggle prevents surfacing a non-functional feature.
- **`@hebcal/cities` side-effect import in LocationProvider.tsx**: only one file needs to trigger the registration; LocationProvider is always loaded at startup.

### Open issues / blocked

- Kefar Sava, Beit Shemesh, Rosh HaAyin, Antwerp still not in Hebcal@5. Can be added in Phase 5 if @hebcal/cities v6 (with @hebcal/core v6) covers them.
- Havdalah custom offset (Rabbeinu Tam, 50-min) deferred to Phase 5.
- Notifications wiring deferred to Phase 5.

### Next steps

Phase 5 (post-MVP). Awaiting real user feedback before committing to specific work order.

---

## 2026-05-27 — Session: Phase 4.4 (Date picker)

**Phase:** Phase 4.4
**Commits:** `1afc06d` (install), `f645d27` (hook), `413ac36` (ScreenHeader), `d729721` (day+zmanim), `936344f` (details+week)
**Duration:** ~¼ session

### What got done

- **`@react-native-community/datetimepicker@8.0.1`** installed via `npx expo install` (Expo SDK 51 compatible).

- **`src/hooks/useDatePicker.tsx`** — new platform-aware hook returning `{ openPicker, picker }`:
  - **iOS:** bottom-sheet Modal with a spinner `DateTimePicker` (locale `he`). Changes accumulate in `tempDate`; only committed to the parent's `onChange` when the user presses "אישור". "ביטול" and backdrop tap dismiss without change.
  - **Android:** native calendar dialog mounted on demand. After selection or dismiss the component unmounts so the dialog doesn't re-open on the next render cycle.

- **`src/components/common/ScreenHeader.tsx`** — added `onDatePress?: () => void` prop. When provided alongside `date`, wraps the bilingual date display in a `Pressable` with a 12 pt `ChevronDown` below it. Screens that don't pass `onDatePress` are unaffected.

- **Four screens wired:**
  - `app/(tabs)/day.tsx` — `useDatePicker(selectedDate, setSelectedDate)`; `onDatePress={openPicker}`; `{picker}` rendered outside ScrollView
  - `app/(tabs)/zmanim.tsx` — same pattern
  - `app/details.tsx` — same pattern
  - `app/week.tsx` — same pattern; also added `setSelectedDate` subscription (was previously read-only for `selectedDate`)

- Typecheck green throughout all 5 commits.

### Decisions made

- **`tempDate` accumulate-then-commit on iOS** (not immediate onChange): avoids thrashing `setSelectedDate` on every spinner tick, which would cause expensive per-frame rerenders in ZmanimService (which recomputes on date change).
- **Backdrop tap = dismiss without change** (same as ביטול): consistent with iOS system sheet conventions.
- **`picker` outside ScrollView**: Modal and native dialogs must not be inside ScrollView to avoid z-index/hit-test issues on Android.
- **Android `visible` state drives mount/unmount** of the picker component: the standard approach — mounting triggers the native dialog, unmounting after selection avoids re-show on next render.

### Open issues / blocked

- None from Phase 4.4.

### Next steps

- Continue Phase 4 agenda per ROADMAP: Location picker UX, notifications, learning schedules expansion.

---

## 2026-05-27 — Session: Phase 4.3 (Per-city candle lighting)

**Phase:** Phase 4.3
**Commits:** `a6f96fc` (utility + ZmanimService), `bce6f26` (UI components)
**Duration:** ~¼ session

### What got done

- **`src/utils/candleLightingOffset.ts`** — new pure utility. `getCandleLightingOffset(lat, lng)` returns `{ minutes, cityName?, cityNameHe? }`. Encodes three special cities via bounding-box radius (no haversine): Jerusalem 40 min, Haifa 30 min, Safed 40 min, default 18 min everywhere else. Exports `DEFAULT_CANDLE_OFFSET_MINUTES = 18` and the `CandleLightingOffsetResult` interface.

- **`src/services/ZmanimService.ts`** — two optional fields added to `ZmanimResult`:
  - `candleLightingOffsetMinutes?: number` — the offset used (set only on Fridays)
  - `candleLightingCityNameHe?: string` — Hebrew city name (absent for default 18-min)
  Candle lighting calculation routes through `getCandleLightingOffset(latitude, longitude)` before computing the time. Hardcoded `18 * 60 * 1000` replaced with `clOffset * 60 * 1000`. `NULL_ZMANIM` unchanged (optional fields default to undefined).

- **`src/components/zmanim/ZmanimFullList.tsx`** — `candleBanner` time text wrapped in a `View` column; `offsetHint` Text shown below it when `candleLightingOffsetMinutes !== 18`. New `offsetHint` style added to StyleSheet (fontSize 11, marginTop 2).

- **`src/components/zmanim/ZmanimList.tsx`** — candle lighting row ADDED (it was entirely absent; Day screen showed nothing on Fridays). Row is conditional on `zmanim.candleLighting`. Offset hint shown below the time when non-default. Row style changed to `alignItems: 'flex-start'` so the two-line value cell doesn't mis-align the label.

- Typecheck green throughout.

### Decisions made

- **`ZmanimList` gap discovered**: the spec assumed a candle lighting row existed in the compact list; it didn't. Adding it fills a real UX gap (Day screen was blank for candle lighting on Fridays) rather than causing duplication. The row is self-contained and only renders on Fridays via the `candleLighting` null check.
- **Commits 1 + 2 combined**: utility and ZmanimService are tightly coupled (utility is created solely as ZmanimService's dependency). Keeping them in one commit reduces noise without losing reversal granularity.
- **Bounding-box vs haversine**: adequate accuracy for city-vs-default at Israeli scale. A 0.04–0.06° box captures each city proper. Adjacent settlements intentionally excluded (they often follow their own minhag).

### Open issues / blocked

- None from Phase 4.3. Broader city list and Havdalah customs deferred to Phase 5+ (documented in ROADMAP).

### Next steps
- Continue Phase 4 agenda: 4-A learning schedules expansion, location picker UX, notifications wiring.

---

## 2026-05-27 — Session: Phase 4.2-2 (Notes UI integration in grids) — Phase 4.2 COMPLETE

**Phase:** Phase 4.2-2 — UI integration sub-phase of Phase 4.2
**Commits:** `6edfba4` (useNotes recurring fix), `6a7860e` (expose refreshKey), `42ecb21` (MonthGrid), `e02d716` (WeekGrid)
**Duration:** ~½ session

### What got done

- **`src/hooks/useNotes.ts`** — extended the load function to add a third parallel query path: `getAllRecurringNotes()` + `expandRecurringNotes(recurringNotes, date, date)`. Results merged by note `id` into the existing `existingNotes` from the two prior queries (id-keyed `Map` deduplicates Hebrew recurring notes that arrive via both paths). `refreshKey` now included in the return object (`{ notes, saveNote, deleteNote, refreshKey }`).

- **`src/components/calendar/MonthGrid.tsx`** — wired `useDatesNotes`:
  - Added imports: `useDatesNotes`, `formatDateKey`
  - Exposed `refreshKey` from `useNotes(editorDate)` call
  - Added `gridStart` / `gridEnd` useMemo (first/last day of `monthData`)
  - `notesByDate = useDatesNotes(gridStart, gridEnd, refreshKey)` called after grid construction
  - `renderItem`: replaced `buildDayTags(item, [])` with `buildDayTags(item, notesByDate.get(formatDateKey(item.gregorianDate)) ?? [])`
  - Added `notesByDate` to `renderItem`'s useCallback dep array
  - Removed "Known limitation #1" (notes deferred) from file comment

- **`src/components/calendar/WeekGrid.tsx`** — identical pattern:
  - Added imports: `useDatesNotes`, `formatDateKey`
  - Exposed `refreshKey` from `useNotes`
  - `weekStart = weekDays[0].gregorianDate`, `weekEnd = weekDays[6].gregorianDate`
  - `notesByDate = useDatesNotes(weekStart, weekEnd, refreshKey)`
  - Replaced `buildDayTags(day, [])` in the `weekDays.map()` callback

- Typecheck green at every commit boundary.

### Decisions made

- **`import type` circular non-issue** — `expandRecurringNotes` imports `CalendarNote` as `import type` from `useNotes`. Type-only imports are erased at compile time; no circular runtime dependency.
- **`weekStart` / `weekEnd` as plain consts** (not useMemo) in WeekGrid — `useDatesNotes` uses string keys internally (`formatDateKey`), so Date reference instability doesn't trigger spurious re-fetches. Plain consts are simpler.
- **MonthGrid `gridStart`/`gridEnd` use useMemo** — slightly more expensive than WeekGrid's inline computation, so memoizing is cleaner. `monthData` is already stable from Zustand.
- **`refreshKey` propagation chain**: `saveNote`/`deleteNote` → `setRefreshKey` (in useNotes) → returned `refreshKey` → `useDatesNotes(refreshKey)` → re-fetches Map → `renderItem` sees new Map (via dep array) → FlatList re-renders affected cells.

### Open issues / blocked

- **Performance note on useNotes**: each Day screen render now makes 3 parallel DB queries instead of 2 (`getAllRecurringNotes` added). Acceptable for any realistic note count. Future optimization: SQL filter `WHERE (recurrence_type = 'yearly_gregorian' AND month(start_date) = ? AND day(start_date) = ?) OR (recurrence_type = 'yearly_hebrew' AND hebrew_month = ? AND hebrew_day = ?)` to avoid fetching ALL recurring notes per load. Documented for Phase 5.
- **MonthGrid FlatList re-render on notes change**: when `notesByDate` Map updates (after a save), `renderItem` callback reference changes (new `useCallback`), causing FlatList to re-render all 42 cells. Acceptable for Phase 4; future optimization: React.memo on DayCell with stable prop comparison.
- **Day screen Gregorian recurring**: bug now fixed end-to-end. Day screen (`useNotes`) + MonthGrid + WeekGrid all show recurring Gregorian notes on the correct yearly dates.

### Next steps
- Phase 4.2 complete. Next Phase 4 items per ROADMAP priority: location picker UX, notifications wiring.

---

## 2026-05-27 — Session: Phase 4.2-1 (Data layer for notes-in-grids)

**Phase:** Phase 4.2-1 — data layer sub-phase of Phase 4.2
**Commits:** `aa57d57` (StorageService + formatDateKey), `4c91990` (DateService.hebrewToGregorian), `635c3eb` (expandRecurringNotes), `ef41d85` (useDatesNotes + useNotes mapper export)
**Duration:** ~½ session

### What got done

- **`src/utils/dateUtils.ts`** — added `formatDateKey(date: Date): string` export. Returns `"YYYY-MM-DD"` using UTC components, consistent with how StorageService stores `start_date`. Used by `useDatesNotes` and `expandRecurringNotes`.

- **`src/services/StorageService.ts`** — added two new static query methods:
  - `getNotesInRange(startDate, endDate)` — fetches non-recurring events (`recurrence_type = 'none'`) whose `start_date` falls in the inclusive range. Recurring events excluded; they come back via `getAllRecurringNotes`.
  - `getAllRecurringNotes()` — fetches all events with `recurrence_type != 'none'`, regardless of date. Caller decides which instances fall in range.
  - Both follow the existing `db.getAllAsync<any>(sql, params)` + `rowToEvent` pattern. Existing methods unchanged.

- **`src/services/DateService.ts`** — added `hebrewToGregorian(hebYear, hebMonth, hebDay): Date | null`. Thin wrapper around `new HDate(day, month, year).greg()`. Returns `null` for invalid dates (e.g., Adar II in non-leap year) rather than throwing. Used by `expandRecurringNotes`.

- **`src/utils/expandRecurringNotes.ts`** — new utility. `expandRecurringNotes(notes, rangeStart, rangeEnd)` returns `RecurringInstance[]` (each with `note: CalendarNote` and `date: Date`). Two sub-functions:
  - `expandHebrewRecurring` — iterates Hebrew years spanning the range; uses `new HDate(rangeEndpoint).getFullYear()` for lightweight year derivation; calls `dateService.hebrewToGregorian` per year; skips nulls (Adar II / invalid).
  - `expandGregorianRecurring` — iterates Gregorian years; parses month+day from `gregorianDateStr`; validates `Date` constructor didn't normalize (handles Feb 29).

- **`src/hooks/useNotes.ts`** — renamed internal `eventToNote` → `export function eventToCalendarNote`. Logic unchanged; the single internal call site updated. Existing consumers of `useNotes` (Day screen) unaffected — no exported API changed.

- **`src/hooks/useDatesNotes.ts`** — new hook. `useDatesNotes(rangeStart, rangeEnd, refreshKey?)` returns `Map<string, CalendarNote[]>` keyed by `"YYYY-MM-DD"`. Calls both new StorageService methods in parallel, maps events via `eventToCalendarNote`, expands recurring via `expandRecurringNotes`, merges into the map. Cancelled-flag pattern for stale async. Uses `formatDateKey(rangeStart/End)` as stable dep-array proxies for Date objects.

- Typecheck green at every commit boundary.

### Decisions made

- **HDate directly for Hebrew year derivation** — spec suggested `dateService.getDayData()` for Hebrew year of range endpoints; replaced with `new HDate(date).getFullYear()` which is lightweight (no month-level caching, no event generation). Functionally equivalent for this use case.
- **`formatDateKey` uses `toISOString().split('T')[0]`** (UTC) to match the existing StorageService storage pattern. All date key comparisons in the system use this format; changing to local components would break existing stored data.
- **`eventToCalendarNote` as export from useNotes** (not extracted to shared utility). Per spec decision (a): simpler, no new file, refactor deferred.

### Open issues / blocked

- **Gregorian recurring bug fixed at data layer** — Day screen (`useNotes`) still calls the old per-date queries (`getEventsForGregorianDate` exact match), so Gregorian recurring notes still don't recur on the Day screen. Full fix deferred to 4.2-2, which will decide whether to update `useNotes` or document as known limitation.
- **No UI consumes `useDatesNotes` yet** — MonthGrid and WeekGrid still pass empty arrays to `buildDayTags`. Wired in Phase 4.2-2.
- **`refreshKey` parameter of `useDatesNotes` is unused** — intentional; 4.2-2 wires mutations.

### Next steps
- Phase 4.2-2: wire `useDatesNotes` into MonthGrid and WeekGrid; decide on Day screen Gregorian recurring fix.

---

## 2026-05-27 — Session: Phase 4.1 (RABBANUT shita removal)

**Phase:** Phase 4.1 — first sub-phase of Phase 4 (MVP polish)
**Commits:** `3800eed` (ZmanimService type), `2cabd66` (SettingsProvider import + migration), `a4f5407` (settings.tsx UI), `0370076` (zmanim.tsx segmented control), + this docs commit
**Duration:** ~½ session (carried over from context boundary)

### What got done
- **`src/services/ZmanimService.ts`** — `ZmanimMethod` narrowed from `'GRA' | 'MGA' | 'RABBANUT'` to `'GRA' | 'MGA'`. This is now the single source of truth for the type.
- **`src/providers/SettingsProvider.tsx`** — removed local duplicate `ZmanimMethod` type definition; added `import type { ZmanimMethod }` from ZmanimService + `export type { ZmanimMethod }` (backward-compatible re-export for existing consumers). Added storage migration: stored `'RABBANUT'` coerced to `'GRA'` on load; any unexpected stored value also falls through to `'GRA'`.
- **`app/settings.tsx`** — `zmanimLabel` ternary simplified to `zmanimMethod === 'MGA' ? 'מג״א' : 'גר״א'`; PickerModal options reduced to GRA + MGA (RABBANUT row removed); `onSelect` cast narrowed to `'GRA' | 'MGA'`.
- **`app/(tabs)/zmanim.tsx`** — `SHITA_OPTIONS` reduced to 2 entries; segmented control now renders 2 segments.
- Final verification: `grep -rn "RABBANUT|rabbanut" src/ app/` returns zero live type references (only the migration comment in SettingsProvider).
- Typecheck green after every commit.

### Decisions made
- RABBANUT was functionally identical to GRA in the old code (the plag calculation already used GRA math for RABBANUT). Removing it loses no calculation fidelity.
- Storage migration is in-memory only on load; value is written back to storage next time the user changes their zmanim preference. Write-back-on-migration deferred (low priority optimization).
- ZmanimService is now the canonical source of truth for `ZmanimMethod`; SettingsProvider re-exports for backward compatibility — no downstream consumers needed updating.

### Open issues / blocked
- None from Phase 4.1. Phase 4 roadmap items continue per priority list in ROADMAP.md.

### Next steps
- Phase 4 priority order: 4-A learning schedules expansion (requires @hebcal/core v6 upgrade — plan carefully), location picker UX, notifications wiring.

---

## 2026-05-27 — Session: Phase 3.7c (About + ScreenHeader date display) — Phase 3 CLOSED

**Phase:** Phase 3.7c — FINAL sub-phase of Phase 3
**Commits:** `592c452` (ScreenHeader extension), `37883a2` (4 screens updated), `ec85e63` (About screen), `495d6a0` (Drawer About entry)
**Duration:** ~1 session

### What got done
- **`src/components/common/ScreenHeader.tsx` extended** — added optional `date?: Date` prop. When provided, renders a compact two-line bilingual date in place of the title:
  - Primary line: Hebrew (`ב׳ סיון תשפ״ו`) or Gregorian (`2 ביוני 2026`) — controlled by `hebrewOnTop` setting.
  - Secondary line: the other calendar system.
  - Falls back to `title` (static string) when no `date` provided — fully backward compatible.
  - `dateService.getDayData(date)` used for Hebrew date info (month-cached, cheap).
  - `useSettingsStore(s => s.hebrewOnTop)` wired — **`hebrewOnTop` toggle now has a visible effect for the first time.**
- **4 screens updated** to pass `date={selectedDate}` to ScreenHeader:
  - `app/(tabs)/day.tsx` — replaces bare `<ScreenHeader />` (previously no title).
  - `app/(tabs)/zmanim.tsx` — replaces bare `<ScreenHeader />`.
  - `app/details.tsx` — replaces `<ScreenHeader title="פרטי לימוד" />`.
  - `app/week.tsx` — replaces `<ScreenHeader title="שבוע" />`.
  - Body-level date displays retained — serve as visual anchors when scrolled to top.
- **`app/about.tsx` created** — standalone screen at `/about`:
  - App name ("לוחות"), tagline, version from `Constants.expoConfig?.version` (expo-constants SDK 46+ canonical accessor, with `manifest?.version` fallback).
  - Description paragraph emphasizing offline/no-account/no-ads per VISION.md.
  - Credits section: @hebcal/core+learning, kosher-zmanim, Sefaria, Lucide Icons — all tappable with external links.
  - `ScreenHeader title="אודות"` — static title (no date; About is not date-aware).
- **`src/components/drawer/Drawer.tsx`** — added `Info` import; added "אודות" DrawerItem after Settings (final item in drawer).
- **`docs/ROADMAP.md`** — marked Phase 3.7c ✅, Phase 3 fully closed (2026-05-27), Phase 4 marked as active with priority agenda.
- Typecheck green at every commit boundary.

### Pre-flight discoveries
- **expo-constants**: `~16.0.2` installed. `Constants.expoConfig?.version` is correct primary accessor since SDK 46+; `Constants.manifest?.version` deprecated but kept as fallback. App version in `app.json` is `"1.0.0"`.
- **lucide `Info`**: confirmed present. All pre-flight icon checks passed.
- **ScreenHeader structure change**: the old version used `flex: 1` on the `title` Text directly. New version uses a `centerContent` View wrapper with `flex: 1` + `alignItems: 'center'` to support the two-line date layout. Backward compatibility preserved — screens without `date` or `title` still render a clean header.

### Decisions / deviations from spec
- **About screen uses `overflow: 'hidden'` on cards** — the spec's example didn't include it, but it's needed to clip child content to `borderRadius` on Android. Added for consistency with Settings screen cards.
- **`android_ripple` added to credit rows in About** — consistent with SettingRow in Settings screen.
- **`padding: 16` moved inside `cardBody` style** — spec put it on the `card` style; separated to allow future card-with-no-internal-padding uses.

### Phase 3 closure summary
All Phase 3 sub-phases completed across multiple sessions:
- 3.1 Token files (radius, overlay) • 3.2 DayCell rewrite • 3.3 MonthGrid mode prop
- 3.4 Tab restructure • 3.5 Day screen • 3.6 Zmanim screen
- 3.7a-1 Drawer infra • 3.7a-2 Settings relocation • 3.7b-1 @hebcal/learning
- 3.7b-2 Details screen • 3.7b-3 Week view • 3.7c About + ScreenHeader date

### Open items / blockers (Phase 4 backlog)
1. **@hebcal/core v6 upgrade** — unlocks rambamThreeChapters, seferHaMitzvot, arukhHaShulchan. Non-trivial; dedicated Phase 4 task. See ROADMAP 4-A.
2. **Location picker UX** — GPS-only currently; city/manual entry needed; city name in Zmanim header placeholder.
3. **Notifications** — Omer reminder toggle exists but NotificationService not connected to events.
4. **ScreenHeader date edge cases** — verify month boundaries, leap year display, very long month names.
5. **Performance** — month cache on diaspora toggle; Day screen hourly grid scroll.
6. **Onboarding tour** — "Tour" item not yet in drawer.

### Next steps
- Phase 4 begins. First task TBD by architect — likely location picker (most user-visible gap) or @hebcal/core v6 upgrade (unlocks content).

---

## 2026-05-27 — Session: Phase 3.7b-3 (WeekGrid + Week screen)

**Phase:** Phase 3.7b-3
**Commits:** `d51db5b` (WeekGrid component), `ce3a379` (Week screen), `7932310` (Drawer entry)
**Duration:** ~1 session

### What got done
- **`src/components/calendar/WeekGrid.tsx` created** — presentational + interaction component, 7 DayCells in a horizontal row. Key design decisions:
  - `getWeekDays(anchor, firstDayOfWeek)` module-level helper: derives the 7-day window from the selected date, respects Sunday/Monday week start setting.
  - `onPress` → immediately navigates to Day tab + sets selectedDate (no select-first, unlike MonthGrid).
  - `onLongPress` → QuickActionSheet (same pattern as MonthGrid).
  - Swipe gesture: `velocityX > 400` moves `±7 days` on `selectedDate` (week-at-a-time navigation). RTL: left swipe = next week.
  - `buildDayTags(day, [])` — empty notes array, consistent with MonthGrid Phase 4 deferral.
  - `FirstDayOfWeek` type imported from SettingsProvider for type safety.
  - Full NoteEditor + QuickActionSheet integration mirroring MonthGrid.
- **`app/week.tsx` created** — standalone screen at `/week`. Structure:
  - `getWeekStart` helper (extracted from the derived memo) to compute week boundary.
  - Bilingual range header: "כ״ב–כ״ח אייר תשפ״ו" / "17–23 May 2026" style. Cross-month range shows both month names.
  - Parasha banner (tagHoliday colors, consistent with Day screen holiday banner): finds Saturday in the 7-day window, reads `dayData.parasha`. Absent weeks (no parasha) — banner silently omitted.
  - Day labels row above grid: short Hebrew weekday names via `toLocaleDateString('he-IL', { weekday: 'short' })`.
  - `hebrewOnTop` setting drives both the header (primary/secondary range) and `WeekGrid`'s `mode` prop.
  - Parasha banner uses `radius.lg` (token) instead of the spec's hardcoded `12`.
- **`src/components/drawer/Drawer.tsx`** — added `CalendarRange` import; added "שבוע" DrawerItem between "יום" and "זמנים".
- **`docs/ROADMAP.md`** — updated 3.7 section with sub-phase status list; marked 3.7b-3 done; flagged 3.7c as next.
- Typecheck green at every commit boundary.

### Decisions / deviations from spec
- **`radius.lg` for parasha banner instead of hardcoded `12`** — spec used `borderRadius: 12` inline; replaced with `radius.lg` (which equals `12` per `src/constants/radius.ts`) for token consistency. No functional difference.
- **`getWeekStart` helper extracted as module-level function** — avoids duplicating the offset logic between the `useMemo` and any future callers.
- **`FirstDayOfWeek` imported from SettingsProvider in WeekGrid** — stronger typing than inline `0 | 1`. The type is identical but named, preventing accidental widening.

### Open items / blockers
1. **Phase 3.7c (About + Tour + final polish)** — last Phase 3 sub-phase. Completes Phase 3 entirely, unblocks MVP.
2. **User notes not shown as tags in WeekGrid** — same deferral as MonthGrid (Phase 4 batching strategy). `buildDayTags(day, [])` produces tags only from holidays/Rosh Chodesh/Omer.
3. **All prior open items remain** (hebrewOnTop no visible effect until 3.7c universal header; 3 deferred learning schedules in ROADMAP 4-A; location placeholder in Zmanim/Settings; etc.).

### Next steps
- Phase 3.7c — About screen, Tour, universal date header wiring, final polish.

---

## 2026-05-27 — Session: Phase 3.7b-2 (Details screen + LearningItem refactor)

**Phase:** Phase 3.7b-2
**Commits:** `bd8ec1c` (DateService LearningItem refactor), `4c9a530` (Day screen update), `afb6de5` (Details screen), `ee0a430` (Drawer wiring)
**Duration:** ~1 session

### What got done
- **`LearningItem` interface added to `src/services/DateService.ts`** — exported; contains `display: string` (Hebrew rendered text) and `url: string` (Sefaria URL with `?lang=bi`).
- **`DayData` interface updated** — all 7 learning fields changed from `string | undefined` to `LearningItem | undefined`: `dafYomi`, `rambamOneChapter`, `mishnaYomi`, `nachYomi`, `tanakhYomi`, `chofetzChaim`, `psalms`.
- **`renderLearning` helper rewritten** — now returns `LearningItem | undefined` instead of `string | undefined`. Captures `event.render('he')` as `display` and `(event as any).url()` as `url`. Defensive `typeof` guard ensures future schedules without URLs are handled gracefully (return `undefined` rather than partial object).
- **`app/(tabs)/day.tsx` updated** — the two Sefaria link buttons (Daf Yomi, Rambam) now read `dayData.dafYomi.display` / `dayData.rambamOneChapter.display` for the label, and pass the event's specific Sefaria URL to `Linking.openURL`. The previously hardcoded generic Sefaria URLs (`sefaria.org.il`, `sefaria.org.il/Mishneh_Torah`) are gone.
- **`app/details.tsx` created** — standalone screen at `/details`. Structure mirrors Zmanim screen (GestureDetector + ScreenHeader + ScrollView + swipe navigation). Four themed sections: תלמוד (Daf Yomi + Mishna Yomi), רמב"ם (Rambam 1 chapter), תנ"ך (Nach Yomi + Tanakh Yomi), מוסר ותהילים (Chofetz Chaim + Psalms). Each row shows Hebrew display text + "ספריא" button with `ExternalLink` icon opening the exact Sefaria page. Undefined items pruned per-section; empty sections dropped entirely. Empty-state message if no items at all for a date.
- **`src/components/drawer/Drawer.tsx`** — added `Library` icon import; added "פרטי לימוד" DrawerItem between "זמנים" and the divider before "הגדרות".
- Typecheck green at every commit boundary.

### Discoveries / notes
- Pre-flight confirmed all required lucide icons exist: `BookOpen`, `BookMarked`, `BookText`, `Sparkles`, `ExternalLink`, `Library`, `ListChecks`. Used `Library` for drawer item per spec.
- The Day screen UX improvement (exact Sefaria page vs. generic homepage) came for free with the LearningItem refactor — no extra work needed.
- `@hebcal/learning` investigation from pre-flight: all 7 active schedules expose `.url()` returning Sefaria `?lang=bi` URLs. The defensive `typeof (event as any).url === 'function'` guard in `renderLearning` is cheap insurance for future schedule additions.

### Open items / blockers
1. **Phase 3.7b-3 (Week view)** — next task. Week view moved out of tabs to drawer in 3.7a; component needs to be built.
2. **About + Tour + final polish (Phase 3.7c)** — last Phase 3 tasks.
3. **3 deferred learning schedules** (rambamThreeChapters, seferHaMitzvot, arukhHaShulchan) — documented in ROADMAP Phase 4-A. When revisited, they should follow the `LearningItem` shape already established here.
4. **All prior open items from Phase 3.7a-2 remain** (hebrewOnTop toggle has no visible effect until Phase 3.7c universal header; defaultCalendarType usage TBD; location placeholder; candle lighting hardcoded 18min).

### Next steps
- Phase 3.7b-3 — Week view component (drawer navigation, not a tab).

---

## 2026-05-27 — Session: Phase 3.7b-1 (@hebcal/learning integration — data layer)

**Phase:** Phase 3.7b-1
**Commits:** see commit log — chore (install), feat (DateService), refactor (day.tsx), docs (ROADMAP + WORK_LOG)
**Duration:** ~1 session (continued across context boundary)

### What got done
- **Installed `@hebcal/learning@5.1.2`** (pinned — v6 requires @hebcal/core v6, incompatible with installed 5.10.1).
- **Extended `src/services/DateService.ts`** — data layer only, no UI changes:
  - Added `DailyLearning` to the `@hebcal/core` named import.
  - Added `import '@hebcal/learning';` side-effect import at top of file (registers all learning schedules into the `DailyLearning` registry on module load).
  - Added module-level `renderLearning(scheduleName, hd, il)` helper: calls `DailyLearning.lookup(name, hd, il)`, returns `event.render('he') || event.render('en') || undefined`.
  - Updated `DayData` interface: renamed `rambamChapter` → `rambamOneChapter`; added 5 new fields: `mishnaYomi`, `nachYomi`, `tanakhYomi`, `chofetzChaim`, `psalms`; added deferred Phase 4 comment for the three missing schedules.
  - Updated `getMonthData` push block: replaced homebrew `getDafYomi`/`getRambamChapter` calls with `renderLearning` calls for all 7 schedules. `il` flag passed as `!this.diaspora`.
  - Removed private `getDafYomi()` method (37-tractate hardcoded table).
  - Removed private `getRambamChapter()` method (simple modulo heuristic).
- **Updated `app/(tabs)/day.tsx`** — renamed `dayData.rambamChapter` → `dayData.rambamOneChapter` (2 occurrences). No logic changes; only the field reference.
- **Updated `docs/ROADMAP.md`** — added Phase 4 subsection 4-A "Learning schedules expansion" documenting the 3 deferred schedules, the reason (v5.1.2 limitation), and the upgrade path (v6).
- Typecheck clean after all changes.

### Pre-flight discoveries (during investigation before coding)
- **`@hebcal/learning@5.1.2` actual registered schedules** (confirmed by unpacking tgz and reading `index.cjs`): `dafYomi`, `mishnaYomi`, `nachYomi`, `tanakhYomi`, `chofetzChaim`, `psalms`, `rambam1` (plus v5 extras: `yerushalmi`, `dafWeekly`, `shemiratHaLashon`, `pirkeiAvotSummer`).
- **Schedules NOT in v5.1.2**: `rambamThreeChapters`, `seferHaMitzvot`, `arukhHaShulchan` — guessed by spec, confirmed absent. Not substituted. Deferred to Phase 4-A.
- **`DailyLearning.lookup` signature**: requires 3 args — `(name: string, hd: HDate, il: boolean)`. Spec omitted the `il` param; caught by typecheck; fixed before committing.
- **Version selection**: @hebcal/learning v6.9.1 requires @hebcal/core@^6.5.1 (incompatible). Architect approved staying on v5.1.2 and deferring v6 to Phase 4.

### Decisions made
- **Architect decision 4-A**: Drop `rambamThreeChapters`, `seferHaMitzvot`, `arukhHaShulchan` entirely from Phase 3.7b-1. Document deferred items in ROADMAP Phase 4 subsection 4-A. Confirmed `shemiratHaLashon` is NOT a substitute for `seferHaMitzvot`.
- **No v5 extras**: `yerushalmi`, `dafWeekly`, `shemiratHaLashon`, `pirkeiAvotSummer` from v5 extras are lower priority and not added to DayData (added to Phase 4 backlog only if architect decides later).
- **`il` flag for learning lookup** = `!this.diaspora`, consistent with `HebrewCalendar.calendar({ il: !this.diaspora })` already in `getMonthData`.

### Open items / blockers
1. **New DayData fields not yet surfaced in Day screen.** `mishnaYomi`, `nachYomi`, `tanakhYomi`, `chofetzChaim`, `psalms` are in `DayData` but not rendered in `app/(tabs)/day.tsx`. This is intentional — UI surfacing is Phase 3.7b-2 (Details screen via drawer).
2. **Three deferred learning schedules** (rambamThreeChapters, seferHaMitzvot, arukhHaShulchan) — require @hebcal/learning v6 upgrade. Documented in ROADMAP Phase 4-A.
3. **All prior open items from Phase 3.7a-2 remain** (see entry below).

### Next steps
- Phase 3.7b-2 — Details screen that surfaces the new `DayData` learning fields via the drawer.

---

## 2026-05-27 — Session: Phase 3.7a-2 (Settings relocation + cleanup + QuickActionSheet wiring)

**Phase:** Phase 3.7a-2
**Commits:** `8a040b0` (SettingsProvider purge + settings move), `9ba9ae0` (settings rewrite + _layout), `a2064bc` (Drawer route), `844f55a` (QuickActionSheet wiring)
**Duration:** ~1 session

### What got done
- **`src/providers/SettingsProvider.tsx`** — purged 5 dead v1 fields: `showHebrew`, `showGregorian`, `diagonalDirection`, `rememberLastView`, `defaultViewMode`. Removed actions: `toggleHebrew`, `toggleGregorian`, `setDiagonalDirection`. Removed type exports: `DiagonalDirection`, `ViewMode`. Cleaned matching entries from `loadFromStorage` Promise.all and `set()` call. No other file in `src/` or `app/` referenced these fields.
- **`app/(tabs)/settings.tsx` → `app/settings.tsx`** — moved out of tabs via `git mv`. Settings is now a standalone screen accessible only via the hamburger drawer.
- **`app/(tabs)/_layout.tsx`** — removed the `<Tabs.Screen name="settings" options={{ href: null }} />` block. Tab layout is now exactly 4 screens (עברי / לועזי / יום / זמנים), no hidden entries.
- **`app/settings.tsx` (rewrite)** — full rewrite of the Settings screen:
  - Dead toggles removed: `showHebrew`, `showGregorian`.
  - Icon background squares (`iconBg` hex literals) replaced with plain lucide icons (`Moon`, `Globe`, `CalendarDays`, `Clock`, `MapPin`, `Bell`). The `SettingRow` component now takes `Icon: ComponentType<any>` directly — same pattern as `DrawerItem`.
  - All hex color literals replaced with token references (`colors.*`, `overlay.modal`, `radius.xl`, etc.).
  - `PickerModal` now uses `overlay.modal`, `radius.xl`, `colors.textInverse` instead of hardcoded values.
  - `ScreenHeader` added with `title="הגדרות"` — consistent with other screens.
  - "עברית למעלה" toggle kept — field is live and will drive the universal date header in Phase 3.7c.
  - Pickers moved outside `ScrollView` to overlay the full screen properly.
- **`src/components/drawer/Drawer.tsx`** — Settings navigation target updated from `'/(tabs)/settings'` to `'/settings'`.
- **`src/components/calendar/MonthGrid.tsx`** — QuickActionSheet wired to NoteEditor:
  - Added imports: `NoteEditor`, `useNotes`, `dateService`.
  - Added state: `noteEditorVisible: boolean`.
  - `editorDate` = `actionSheetDate ?? selectedDate`; `editorHebrewDate` derived via `dateService.getDayData`.
  - `addNote` and `addRecurring` handlers now call `setNoteEditorVisible(true)`.
  - `NoteEditor` mounted in JSX before `QuickActionSheet`, controlled by `visible` prop.
- Typecheck clean at every step (after each edit).
- Working tree CLEAN after final commit.

### Decisions made / discoveries
- **`git mv` + SettingsProvider staged together.** When committing the SettingsProvider purge, `git mv` had already staged the rename — both landed in commit 1. The rewrite landed in commit 2. End result is identical; commit boundary slightly shifted from the plan.
- **`addNote` and `addRecurring` open same editor state.** NoteEditor has no `defaultNoteType` prop. Both quick actions open with `noteType: 'note'`; user picks the correct type via editor type chips. This is the honest minimal implementation — adding a preset would require a NoteEditor prop change (Phase 4 polish).
- **`noteEditorRecurring` state not added.** Per architect decision: removed (unused). Both actions do the same thing for now, documented in limitation #2 in file header.
- **PowerShell here-string quoting.** Commit messages with Hebrew quote characters (`"`) caused git to misparse the here-string. Used `$msg | git commit -F -` pattern for multi-line messages with special characters.
- **Settings `PickerModal` outside `ScrollView`.** Original spec put pickers inside ScrollView. Moved them outside so they render as full-screen overlays (modals should not be constrained by scroll container z-index on Android).

### Open items / blockers
1. **`addNote` / `addRecurring` open with same initial state.** Both open NoteEditor with `noteType: 'note'`; user selects type inside editor. A `defaultNoteType` prop on NoteEditor to preset the type selector is deferred to Phase 4.
2. **`hebrewOnTop` toggle row in Settings** — field kept and toggle visible, but it has no visible effect until the universal date header is built in Phase 3.7c.
3. **`defaultCalendarType` field in SettingsProvider** — kept; usage TBD in Phase 3.7b/c.
4. **All prior Phase 3.6 open items remain** (location placeholder, candle lighting hardcoded at 18min, RABBANUT shita).
5. **Phase 4 items remain** (per-hour note bucketing, header date-tap, user notes as calendar tags, location city name).

### Next steps
- Phase 3.7b — Week view + Details screen (via drawer navigation, not tabs).

---

## 2026-05-26 — Session: Phase 3.7a-1 (Drawer infrastructure + ScreenHeader)

**Phase:** Phase 3.7a-1
**Commits:** `0f90e39` (DrawerProvider), `5c9bfda` (DrawerItem), `b9f8a70` (Drawer), `ec216f1` (ScreenHeader), `5d3c54c` (wire all tabs + _layout)
**Duration:** ~1 session

### What got done
- Created `src/providers/DrawerProvider.tsx` — tiny Zustand store (16 lines): `isOpen`, `open()`, `close()`, `toggle()`. No persistence (drawer state should not survive restarts). Pattern mirrors CalendarProvider/SettingsProvider exactly.
- Created `src/components/drawer/DrawerItem.tsx` — single row in the drawer. Props: `Icon`, `label`, `onPress`, `active?`. Active state uses `colors.accentLight` bg + `colors.accent` text/icon color. Icon type is `React.ComponentType<any>` (see decisions below).
- Created `src/components/drawer/Drawer.tsx` — sliding panel built from scratch with react-native-reanimated 3 + GestureDetector. No new npm dependencies. Key details:
  - Anchored to `right: 0` (RTL slide-in from right edge).
  - `translateX: 0` = open, `translateX: drawerWidth` = closed.
  - Drawer width = `min(screenWidth × 0.8, 320px)`.
  - Backdrop: `overlay.modal` (`rgba(0,0,0,0.45)`), tappable to close.
  - Swipe-to-close: drag rightward ≥60px or velocity ≥400 closes; otherwise snaps back.
  - `pointerEvents` on backdrop lifted out of `useAnimatedStyle` into a `useState` bool (delayed off by `ANIMATION_DURATION` ms) — avoids Reanimated 3 edge-case bugs with pointerEvents in animated styles.
  - 100ms `setTimeout` delay on `router.push` lets close animation start before route transition (smoother UX).
  - Placeholder nav items: לוח עברי, לוח לועזי, יום, זמנים, הגדרות.
- Created `src/components/common/ScreenHeader.tsx` — universal header. Props: `title?`. Always has hamburger button (Menu icon, 24px) on leading edge calling `useDrawerStore.open`. Right spacer (32px) balances title centering. `StatusBar.currentHeight ?? 0` for Android status-bar clearance.
- Modified `app/_layout.tsx` — added `<Drawer />` as sibling of `<Stack />` inside `SafeAreaProvider`, after Stack so it renders on top via z-stack order.
- Modified `app/(tabs)/index.tsx`, `app/(tabs)/gregorian.tsx` — added `<ScreenHeader />` as first child of root View, before MonthGrid.
- Modified `app/(tabs)/day.tsx`, `app/(tabs)/zmanim.tsx` — added `<ScreenHeader />` inside GestureDetector's View but outside ScrollView, so it stays fixed while content scrolls.
- `app/(tabs)/settings.tsx` — **NOT TOUCHED**. Reserved baseline for Phase 3.7a-2.
- Typecheck clean throughout.

### Decisions made / discoveries
- **`DrawerIcon` type → `React.ComponentType<any>`.** Attempted `React.ComponentType<{ size?: number | string; color?: string; ... }>` (both versions). TypeScript rejects concrete Lucide icons because `LucideProps` inherits from `SvgProps` where `color: ColorValue` (= `string | OpaqueColorValue`), and `size: string | number`. The `propTypes: WeakValidationMap<P>` compatibility check cascades through the entire SVG type hierarchy. `ComponentType<any>` is the pragmatic de-facto standard for "icon component" props in React Native — same pattern as `Icon: any` in `QuickActionSheet`. Runtime safety preserved because all call sites pass known Lucide icons.
- **`pointerEvents` in backdrop** — Applied Adjustment 2 (architect's fallback) proactively: `useState<boolean>` controls `pointerEvents` on `Animated.View` directly, synchronized with open/close state via `useEffect` (with a `setTimeout` on close matching animation duration). Cleaner than relying on Reanimated worklet style values.
- **`DrawerIcon` adjustment from architect** — Confirmed: using the generic fallback (`ComponentType<any>`) from start, not the original `LucideIcon` import. Saves a typecheck round-trip.
- **Phase 3.7a-1 is foundation only.** Drawer items are navigation-only placeholders. No active state wiring (all `active={false}` implicitly). No week/details/about/tour items yet.

### Open items / blockers
1. **Settings relocation pending Phase 3.7a-2** — `app/(tabs)/settings.tsx` still in tabs (M baseline). Moves to `app/settings.tsx` + dead state cleanup in 3.7a-2.
2. **5 dead fields in SettingsProvider** — `showHebrew`, `showGregorian`, `diagonalDirection`, `rememberLastView`, `defaultViewMode` (+ related setters/loaders). Cleanup deferred to 3.7a-2.
3. **9 hardcoded hex `iconBg` literals + PickerModal hardcoded values in `settings.tsx`** — token cleanup deferred to 3.7a-2.
4. **QuickActionSheet `addNote`/`addRecurring` handlers are no-ops** — NoteEditor wiring deferred to 3.7a-2.
5. **Drawer placeholder items** — Week view, Details screen, About, Tour entries pending 3.7b–3.7c.
6. **All prior open items from Phase 3.6 remain** (location placeholder, candle lighting hardcoded at 18min, RABBANUT shita, per-hour note bucketing, header date-tap, user notes as calendar tags).

### Next steps
- Phase 3.7a-2: Settings relocation (`app/(tabs)/settings.tsx` → `app/settings.tsx`), remove 3 dead toggles, replace 9 hex iconBg literals with tokens, purge 5 dead SettingsProvider fields, wire QuickActionSheet addNote/addRecurring → NoteEditor.

---

## 2026-05-26 — Session: Phase 3.6 (Zmanim screen full implementation)

**Phase:** Phase 3.6
**Commits:** `77fa5c9` (ZmanimService feat), `da4e237` (ZmanimFullList feat), + zmanim.tsx + docs (this commit)
**Duration:** ~45min

### What got done
- Extended `src/services/ZmanimService.ts` — added `candleLighting` and `havdalah` to `ZmanimResult` interface (at end, as required). Updated `NULL_ZMANIM` sentinel with both new `null` fields. In `getZmanim`, extracted `shkia` and `tzeitHakochavim` as local `const` variables (like `plag`) before the result object, then computed candle/havdalah from them inside the successful try-path only. `candleLighting` = 18 min before `shkia` on Fridays (JS day 5); `havdalah` = `tzeitHakochavim` on Saturdays (JS day 6). Change is purely additive — `ZmanimList` and all other consumers unaffected.
- Created `src/components/zmanim/ZmanimFullList.tsx` — full zmanim display component for the Zmanim screen. Sections: זמני בוקר / סוף זמני ק"ש ותפילה / זמני יום / זמני ערב. Shita-dependent rows (`sofZmanShma`, `sofZmanTfilla`) show both GRA and MGA side-by-side; preferred method is full opacity, other is dimmed. Candle lighting and havdalah render as coloured banners (using `colors.candle + '20'` tint) when present. Kept intentionally separate from `ZmanimList` (compact 7-row Day screen component).
- Rewrote `app/(tabs)/zmanim.tsx` — full Zmanim screen:
  - Header: Hebrew + Gregorian dates.
  - Location indicator: display-only `Pressable` (disabled) showing `'ישראל'` hardcoded (see adaptation note below). No `useLocationStore` import.
  - Shita segmented control (גר״א / מג״א / רבנות): each tap calls `setZmanimMethod` which persists to `SettingsProvider` + SQLite. `ZmanimFullList` re-highlights preferred method accordingly.
  - `ZmanimFullList` with all 14 times + candle/havdalah banners.
  - Swipe day navigation (consistent with Day screen).
- Typecheck clean at every step (after ZmanimService alone, and again after all three files).

### Decisions made / discoveries
- **LocationProvider has no city-name field.** Pre-flight found `useLocationStore` exposes only `latitude`, `longitude`, `setLocation`. Spec's `s.locationName ?? 'ישראל'` would not compile. Adaptation: `useLocationStore` import removed entirely; location row displays `'ישראל'` as a static fallback with a `TODO Phase 4` comment. Documented in `zmanim.tsx` file header.
- **`ZmanimMethod` is exported from both `ZmanimService.ts` and `SettingsProvider.tsx`** with identical definitions (`'GRA' | 'MGA' | 'RABBANUT'`). Imported from `ZmanimService` in the Zmanim screen (as spec intended). TypeScript accepts both since they are structurally identical.
- **`as ZmanimMethod` cast removed** — `zmanimMethod` from `useSettingsStore` is already typed as `ZmanimMethod` (from `SettingsProvider`). Cast was overdefensive.
- **Two ZmanimList components are intentional and permanent.** `ZmanimList` = compact 7-row, Day screen. `ZmanimFullList` = 14+2 rows with sections + shita comparison, Zmanim screen. Do NOT merge them.

### Open items / blockers
1. **Location indicator is a static placeholder (`'ישראל'`).** LocationProvider needs a `locationName`/`cityName` field + reverse-geocoding or city picker. Deferred to Phase 4.
2. **Candle lighting is hardcoded at 18 minutes.** Per-city customization (Jerusalem 40 min, Petah Tikva 20 min, etc.) deferred to Phase 4.
3. **RABBANUT shita not meaningfully differentiated.** `getZmanim` currently uses GRA-path for RABBANUT (plagHamincha from sunrise/sunset). Full Rabbanut ruleset requires additional research and kosher-zmanim API work — deferred.
4. **All Phase 3.5 open items remain** (per-hour note bucketing, header date-tap, QuickActionSheet addNote/addRecurring wiring, user notes as calendar tags).

### Next steps
- Phase 3.7 — Hamburger drawer. This is the final Phase 3 task: Settings moves out of tabs, Week view reintroduced via drawer, addNote/addRecurring quick actions can be wired, dead SettingsProvider fields cleaned up.

---

## 2026-05-26 — Session: Phase 3.5 (Day screen full implementation)

**Phase:** Phase 3.5
**Commits:** `17b39b0` (Day screen feat), `5f9def8` (DayModal chore)
**Duration:** ~45min

### What got done
- Rewrote `app/(tabs)/day.tsx` — full Day screen replacing the Phase 3.4 placeholder. Single scrollable view with:
  - **Header:** Hebrew date (`toHebrewNumeral` + `toHebrewYear`) and Gregorian date (`he-IL` locale), centered.
  - **Holiday Banner:** appears when `isYomTov` or any holiday is present; uses `tagHolidayBg`/`tagHoliday` tokens.
  - **Torah Details section:** Parasha (Shabbat only), Omer count, Daf Yomi (with Sefaria link), Rambam chapter (with Sefaria link). Each rendered via `DetailRow` sub-component.
  - **Zmanim:** reuses `ZmanimList` as-is (7-zman curated list with `use24hTime` already wired).
  - **All-day notes:** notes with no time anchor rendered above the hourly grid in `surfaceElevated` chips.
  - **Hourly schedule:** 00:00–23:00 visual structure with a vertical divider; hour cells currently always empty (see open items).
  - **FAB:** `Plus` lucide icon, `colors.accent` background, opens NoteEditor. RTL-aware via `I18nManager.isRTL` inline style (`left: 24` in RTL, `right: 24` in LTR).
  - **Swipe gesture:** `GestureDetector` + `Gesture.Pan()` navigates days on velocityX > 400; RTL-aware (left = next, right = prev).
- Deleted `src/components/calendar/DayModal.tsx` — unused since Phase 3.3, now formally removed.
- Typecheck clean (0 errors).

### Decisions made / discoveries
- **NoteEditor is Modal-based, NOT BottomSheet.** The Phase 3.5 spec assumed `NoteEditor` was a `forwardRef`/BottomSheet component controlled by a ref. The actual implementation is a React Native `Modal` with `visible: boolean` prop. Adaptation: replaced `useRef<BottomSheet>` + `expand()`/`close()` with `useState<boolean>` + `setEditorVisible`. This is documented in the file-level comment in `day.tsx`.
- **Two-pattern Notes UI is intentional going forward.** `NoteEditor` = React Native `Modal` (keyboard-aware, full-screen overlay). `QuickActionSheet` = `@gorhom/bottom-sheet` (gesture-driven, snap-points). They serve different UX roles. Future phases should NOT standardize these to a single sheet pattern without explicit Architect decision.
- **`colors: ThemeColors` must be passed into `NoteEditor`** — the component does not call `useThemeColors` internally. Any future screen that embeds `NoteEditor` must pass `colors` down.
- **`saveNote` (async → `Promise<void>`) is assignable to `onSave` (→ `void`)** — TypeScript allows this because `void` in callback position means "caller does not use the return value." No adapter needed. `NoteList.tsx` uses the identical pattern.
- Day screen does NOT update `currentMonth`/`currentYear` in `CalendarProvider` when swiping across month boundaries. These fields are MonthGrid's concern. `dateService.getDayData` handles month transitions transparently via the cached `getMonthData`.

### Open items / blockers
1. **Per-hour note bucketing not implemented.** `CalendarNote` carries no hour field. All notes render in the "all-day" row above the grid. The hourly grid renders 24 empty rows as visual scaffolding. Batching notes to hour slots requires a schema change to `CalendarEvent` — deferred to Phase 4.
2. **Date picker on Day screen header tap.** Header shows dates but is not tappable. A header-level date jump (to MonthYearPicker or similar) was not in scope for Phase 3.5 — deferred to Phase 4.
3. **addNote / addRecurring quick actions in MonthGrid's QuickActionSheet still no-ops.** These open NoteEditor from the calendar grid — a separate wiring task from the Day screen's FAB (which IS wired). Deferred to Phase 3.7 or standalone fix.
4. **User notes as tags on the calendar grid still deferred to Phase 4.** `buildDayTags(item, [])` still passes empty notes.

### Next steps
- Phase 3.6 — Zmanim screen. Replaces `zmanim.tsx` placeholder. Show all 14 halachic times for selected date, candle lighting / Havdalah prominent on Fri/Sat, shita selector.
- Phase 3.7 — Hamburger drawer. Settings moves out of tabs; Week view reintroduced via drawer; addNote / addRecurring quick actions can be wired at that point.

---

## 2026-05-26 — Session: Phase 3.4 (Tab layout restructure)

**Phase:** Phase 3.4
**Commits:** `6f25a6c` (rm week), `4c48d29` (tab restructure), `67aab14` (MonthGrid tighten)
**Duration:** ~30min

### What got done
- Deleted `app/(tabs)/week.tsx` via `git rm -f` (had local modifications but imports broken WeekRow; deletion confirmed by architect).
- Rewrote `app/(tabs)/_layout.tsx` — 4 new tabs (עברי/לועזי/יום/זמנים) with lucide icons (BookOpenText/Calendar/Sun/Clock). Settings hidden via `href: null`. Tab bar consumes `colors.accent`, `colors.textTertiary`, `colors.surface` from theme (replaces hardcoded `#8B6F4E`). `headerShown: false`.
- Rewrote `app/(tabs)/index.tsx` — Hebrew calendar tab. Passes `mode="hebrew"` explicitly. Kept `refreshMonth()` init effect (store initialises with `monthData: []`).
- Created `app/(tabs)/gregorian.tsx` — Gregorian calendar tab. Passes `mode="gregorian"`.
- Rewrote `app/(tabs)/day.tsx` — placeholder showing selected date in `he-IL` locale. Full Day screen deferred to Phase 3.5.
- Created `app/(tabs)/zmanim.tsx` — placeholder. Full Zmanim screen deferred to Phase 3.6.
- Updated `src/components/calendar/MonthGrid.tsx`:
  - `mode` prop made required (removed `= 'hebrew'` default).
  - Added `useRouter` from `expo-router`.
  - Wired `router.push('/(tabs)/day')` for second-tap on selected day and for the `viewDay` quick action.
  - Updated file-level comment to reflect P3.4 completion.
- Typecheck clean (0 errors) after all changes.

### Decisions made
- Kept `refreshMonth()` init useEffect in `index.tsx` — `CalendarProvider` initialises `monthData: []` so the call is required; dropped it from `gregorian.tsx` since the Hebrew tab always loads first in normal navigation.
- `gregorian.tsx` does NOT call `refreshMonth()` — by the time the user navigates to it, the Hebrew tab will have already populated month data.

### Open items / blockers
1. **User notes not visible as tags.** `buildDayTags(item, [])` — batching strategy deferred to Phase 4.
2. **addNote / addRecurring quick actions are no-ops.** NoteEditor integration deferred to Phase 3.5.

### Next steps
- Phase 3.5 — Full Day screen. Replaces `day.tsx` placeholder; implements the content described in SCREENS.md (header, holidays, parasha, learning items, zmanim inline, notes list).
- Phase 3.6 — Full Zmanim screen. Replaces `zmanim.tsx` placeholder.

---

## 2026-05-26 — Session: Phase 3.3 (MonthGrid mode prop + interaction model)

**Phase:** Phase 3.3
**Commits:** `a3ea24a` (tagMapper), `7bb11e1` (QuickActionSheet), `f139fcf` (MonthGrid rewrite), plus WORK_LOG update
**Duration:** ~1h

### What got done
- Created `src/utils/tagMapper.ts` — pure `buildDayTags(dayData, userNotes)` function. Maps DayData holidays + Rosh Chodesh + Omer count + CalendarNotes into an ordered `DayCellTag[]`. No React, no side effects.
- Created `src/components/calendar/QuickActionSheet.tsx` — `@gorhom/bottom-sheet`-based long-press action sheet with three actions (addNote / addRecurring / viewDay). Uses lucide icons (Pencil, Gift, FileText). `forwardRef` pattern consistent with BottomSheet usage elsewhere.
- Rewrote `src/components/calendar/MonthGrid.tsx` — full rewrite consuming new DayCell API. Removed `@ts-nocheck` pragma (Phase 3.2 bridge). Key changes:
  - Added `mode?: 'hebrew' | 'gregorian'` prop (default `'hebrew'`). Made optional so reserved tab files using `<MonthGrid />` without props continue to typecheck without modification.
  - `getLabels()` computes `primaryLabel`/`secondaryLabel` from `DayData` based on mode.
  - Interaction model: first tap = select, second tap on selected = navigate (TODO 3.4), long-press = QuickActionSheet.
  - Month/year picker moved from `onLongPress` to `onPress` on the header (per SCREENS.md).
  - Removed: `DayModal`, `useZmanim`, `isAfterSunset`, `afterSunset`, `modalDay` state, old `bottomSheetRef`.
  - `buildDayTags(item, [])` called per cell with empty userNotes (see open items).
- Typecheck clean. One fix needed during development: `mode` made optional (`mode?`) with default `'hebrew'` to avoid touching reserved `index.tsx` which renders `<MonthGrid />` without props.

### Decisions made
- `mode` defaulted to `'hebrew'` rather than required — avoids modifying reserved tab files prematurely; Phase 3.4 will pass explicit `mode` when it creates the Gregorian tab
- Per-cell user notes wiring deferred: calling `useNotes` per cell inside `FlatList.renderItem` violates Rules of Hooks. Batching strategy (load all month's notes once at MonthGrid level, slice per cell) is the right fix but belongs in Phase 4 polish
- QuickActionSheet actions are structural no-ops — full wiring happens as Phase 3.4 (navigation targets) and Phase 3.5 (NoteEditor integration) land

### Open items / blockers
1. **User notes not visible as tags.** `buildDayTags(item, [])` — batching strategy deferred to Phase 4
2. **Second-tap Day navigation is no-op.** `TODO Phase 3.4` comment in MonthGrid. Activates once Day tab exists
3. **Quick action handlers are no-ops.** Same dependency on Phase 3.4–3.5
4. **5 reserved files still untouched:** `_layout.tsx`, `day.tsx`, `index.tsx`, `settings.tsx`, `week.tsx`

### Next steps
- Phase 3.4 — Tab layout restructure: rewrite `app/(tabs)/_layout.tsx` from 4 tabs (חודש/שבוע/יום/הגדרות) to (עברי/לועזי/יום/זמנים). Create `gregorian.tsx`, `zmanim.tsx` placeholder. Refactor `index.tsx` to pass `mode="hebrew"` explicitly. Remove `week.tsx` from tabs.

---

## 2026-05-26 — Session: Phase 3.2 (DayCell v2 rewrite)

**Phase:** Phase 3.2 (+ radius.ts hotfix from Phase 3.1)
**Commits:** `08f886b` (radius fix), `8adda9c` (lucide install), `ca43010` (DayCell rewrite + MonthGrid bridge), plus WORK_LOG update
**Duration:** ~1h

### What got done
- **Pre-flight caught radius.ts divergence:** Phase 3.1 shipped `sm=4` (no `xs`) and added `none=0`/`xxl=20` — not in DESIGN.md. No existing consumers of `radius.none` or `radius.xxl` found. Fixed immediately as a separate commit before any DayCell work.
- **radius.ts aligned with DESIGN.md:** `xs=4` (tags/badges), `sm=6` (day cells), `md=8`, `lg=12`, `xl=16`, `full=9999`. `none` and `xxl` removed.
- **Installed `lucide-react-native`** — required for `Flame` icon used as the Friday candle indicator in DayCell. No emoji fallback.
- **Rewrote `src/components/calendar/DayCell.tsx`** — full hard-replace of old diagonal-layout architecture. New component is purely presentational: receives `primaryLabel`, `secondaryLabel`, state booleans, `tags[]`, and `onPress`/`onLongPress`. Removed: `DayData` import, `toHebrewNumeral` call, `useSettingsStore` call, `holidayDot`, `roshChodeshBar`, `sunsetBadge`, `isAfterSunset` prop, `#C4A882` hex, `aspectRatio: 0.85`, `diagonalDirection` logic.
- **Added `@ts-nocheck` bridge to `MonthGrid.tsx`** — the one reserved-file edit allowed. Suppresses type errors from the old DayCell API until Phase 3.3 rewrites MonthGrid. Document comment included.
- Typecheck green after each step.

### Decisions made
- `radius.xs` (=4) for tag chip corners; `radius.sm` (=6) for cell corners — exact DESIGN.md mapping
- Lucide `Flame` icon for candle (no emoji); size 12, color `colors.candle`
- State accumulation confirmed: border family (today/selected) and background family (holiday/shabbat tints) are independent
- `secondaryLabel` wrapped with `writingDirection: 'ltr'` for correct LTR digit rendering in RTL container
- `onPress`/`onLongPress` deliberately excluded from memo comparator — parent is expected to `useCallback` them
- `delayLongPress={350}` — RN sweet spot for tap vs long-press distinction

### Open items / blockers
- `@ts-nocheck` in MonthGrid.tsx is intentional technical debt — removed in Phase 3.3
- 5 reserved files still untouched: `_layout.tsx`, `day.tsx`, `index.tsx`, `settings.tsx`, `week.tsx`

### Next steps
- Phase 3.3 — MonthGrid rewrite: add `mode: 'hebrew' | 'gregorian'` prop, implement the new two-tap interaction model, wire the new DayCell API, move month/year picker trigger from long-press to header tap, implement quick-action menu on long-press

---

## 2026-05-25 — Session: Phase 3.1 + H4 (radius & overlay tokens)

**Phase:** Phase 3.1 / Housekeeping H4
**Commits:** `11bcb0f` (feat), plus WORK_LOG update
**Duration:** ~30min

### What got done
- Created `src/constants/radius.ts` — full frozen scale: none(0) / sm(4) / md(8) / lg(12) / xl(16) / xxl(20) / full(9999)
- Created `src/constants/overlay.ts` — minimal: modal `'rgba(0, 0, 0, 0.45)'`
- Updated `src/components/notes/NoteEditor.tsx`: imported radius + overlay, replaced `borderTopLeftRadius: 20` / `borderTopRightRadius: 20` → `radius.xl` (16), replaced `'rgba(0,0,0,0.45)'` → `overlay.modal`
- Updated `src/components/calendar/MonthYearPicker.tsx`: same imports, replaced `borderRadius: 20` → `radius.xl` (16), replaced `'rgba(0,0,0,0.45)'` → `overlay.modal`
- All 6 reserved Phase 3 files left untouched, unstaged
- `tsc --noEmit` passed clean

### Decisions made
- `borderRadius: 20` in both components maps to `radius.xl` (16), not `radius.xxl` (20) — intentional 4px reduction to align with DESIGN.md which specifies `xl: 16` for modals/sheets
- overlay.ts is minimal (modal only) rather than full shape (modal/scrim/veil) — add values as needed in Phase 3
- Radius scale includes `none: 0` and `xxl: 20` as generic tokens even though they're not currently consumed — they complete the scale for Phase 3 use

### Open items / blockers
- None from this task. H4 is closed.
- Phase 3.2 (DayCell.tsx full rewrite) is next

### Next steps
- Begin Phase 3.2 — DayCell.tsx rewrite per SCREENS.md + DESIGN.md (awaiting Architect's execution prompt)

---

## 2026-05-25 — Session: Housekeeping (H1, H2, H3 — docs + GitHub remote)

**Phase:** Between Phase 2 and Phase 3 — housekeeping items H1, H2, H3
**Commits:** `366995c` (docs), plus H3 remote setup (no commit — git plumbing only)
**Duration:** ~2h

### What got done
- Wrote `docs/ROADMAP.md` — bilingual (English then Hebrew), medium-detail phase plan, dependency map, MVP definition
- Wrote `docs/WORK_LOG.md` — this file. Format established, backfilled entries for Phases 1, 2A, 2B, 2C
- Renamed local branch from `master` to `main`
- Created private GitHub repo at `https://github.com/ShlomoLIfschitz/Luchot.git` with full project description
- Added `origin` remote and pushed all 12 commits with upstream tracking (`main` → `origin/main`)

### Decisions made
- ROADMAP phase detail level: medium (one paragraph + dependencies per task, no acceptance criteria — those live in execution-time prompts)
- WORK_LOG entry format: date + phase + commits + duration + four sections (done / decisions / open / next)
- Backfilled entries marked `*(backfilled)*` to distinguish from real-time logs
- H3 (GitHub remote) and H4 (radius/overlay token files) deferred — see ROADMAP

### Open items / blockers
- Decision pending on H4 token files (radius.ts, overlay.ts) — Architect proposes folding into Phase 3.1 in the next session
- Three design decisions for Phase 3.1 still pending: radius scale structure, what to do with the existing `borderRadius: 20` (xl=16 or xxl=20), and overlay.ts shape (minimal vs full)
- 6 files in working tree still flagged for Phase 3 rewrite — untouched, as expected

### Next session
- Both Architect and Claude Code start fresh sessions with updated INIT prompts
- First task: resolve the three pending Phase 3.1 design decisions
- Then execute Phase 3.1 — radius.ts + overlay.ts + final palette adjustments, plus replacing the two known magic numbers in NoteEditor and MonthYearPicker

---

## 2026-05-25 — Session: Phase 2B + 2C (notes UI layer closure) *(backfilled)*

**Phase:** 2B, 2C
**Commits:** `583cbfd`, `3089df0` (+ message amend of the earlier 2B commit)
**Duration:** ~1.5h

### What got done
- Phase 2B audit: identified 4 hex color violations across 2 files (NoteEditor lines 102/124/139, MonthYearPicker line 70). Confirmed NoteList already used tokens correctly
- Discovered NoteList.tsx in working tree was a 115-line rewrite, not a color patch — escalated to Architect, deferred to Phase 2C
- Discovered NoteEditor.tsx was a 95% rewrite when staged — Architect amended the commit message to accurately describe contents (`feat: complete notes UI layer + month/year picker`)
- Phase 2B commit (amended): `583cbfd` — NoteEditor + MonthYearPicker + 4 token swaps
- Phase 2C commit: `3089df0` — full NoteList implementation wired to useNotes hook
- All commits typecheck-green

### Decisions made
- Border radius (`20`) and `rgba(0,0,0,0.45)` overlay values in NoteEditor and MonthYearPicker: defer until proper token files (`radius.ts`, `overlay.ts`) exist. Don't introduce new magic-number swaps during a token-cleanup pass
- Since no remote exists yet, history rewriting (via `git commit --amend`) is acceptable to fix inaccurate commit messages
- Each "written but unstaged" component gets its own logical commit, not bundled

### Open items / blockers
- 6 files still unstaged in working tree: all `app/(tabs)/*.tsx` (except Phase 3 will create new ones), `MonthGrid.tsx`. All deferred to Phase 3
- `radius.ts` and `overlay.ts` token files still not created
- ROADMAP.md and WORK_LOG.md still not written (will be done in housekeeping session next)

### Next session
- Housekeeping: write ROADMAP.md and WORK_LOG.md
- Then GitHub remote setup

---

## 2026-05-25 — Session: Phase 2A (token palette + notes data layer) *(backfilled)*

**Phase:** 2A
**Commits:** `0e34e6f`, `cb18feb`
**Duration:** ~2h

### What got done
- Replaced `src/constants/colors.ts` entirely with the DESIGN.md palette: slate-blue accent (`#3D5A80`), 5 tag categories (tagHoliday, tagShabbat, tagSpecial, tagEvent, tagPersonal), Light and Dark schemes
- Bundled the `DayModal.tsx` line 101 fix (`colors.holiday` → `colors.tagHoliday`) into the colors commit to keep typecheck green
- Committed the notes data layer: `useNotes` hook (SQLite-backed CRUD), `EventSchema.ts` (Google Calendar-compatible), `CalendarProvider`, `useThemeColors`, async-aware root `_layout.tsx`

### Decisions made
- Old palette tokens removed entirely (no aliases): `noteWork`, `notePersonal`, `noteHoliday`, `noteOther`, `holiday`, `shabbat`, `todayLight`
- DayCell.tsx committed with stub-quality content just to keep typecheck green — to be fully rewritten in Phase 3.2 per SCREENS.md
- Color system is the foundation — everything else now consumes from it

### Open items / blockers
- DayCell, MonthGrid, all tab files still in pre-Phase-3 state — flagged for structural rewrite
- NoteEditor, NoteList, MonthYearPicker exist in working tree but unstaged — flagged for Phase 2B

### Next session
- Phase 2B color cleanup in NoteEditor, NoteList, MonthYearPicker

---

## Earlier — Phase 1 (foundations) *(backfilled)*

**Phase:** 1
**Commits:** `b204eb2`, `92425ed`, `22ab159` (plus earlier `b38efee`, `42eccdb`, `eddbf6a`, `424383b`)
**Duration:** multiple sessions, ~4-5h cumulative

### What got done
- Renamed project from "DualCalendarApp" to "Luchot" across every file (`b204eb2`)
- Pinned Node 20.18.1, added expo-constants/crypto/font/linking dependencies, configured build
- Migrated `StorageService` from sync to async SQLite API (`92425ed`)
- Hardened service layer (`22ab159`): `DateService.toHebrewYear()` for gematria, `ZmanimService` null-safe try/catch wrap around all 14 zmanim, `NotificationService` init flow, `dateUtils` secure UUID via expo-crypto
- Removed `react-native-mmkv` dependency (replaced by expo-crypto)
- Fixed Android hardware back button in `DayModal` (`eddbf6a`)
- Fixed `use24hTime` not persisting across restarts (`42eccdb`)
- Organized architecture docs into `docs/` folder (`424383b`)

### Decisions made
- `EventSchema.ts` is locked to Google Calendar API compatibility — not to be modified without Architect approval
- Service layer files (`DateService`, `ZmanimService`, `StorageService`) are sacred — add to them, don't rewrite
- Offline-first is an identity decision, not a phase-by-phase choice — no backend ever
- `@gorhom/bottom-sheet` v4 doesn't handle Android back button natively — must be wired manually in every modal

### Open items / blockers *(at the time)*
- No design system in place yet — colors were still the old warm-brown parchment palette
- DayModal, DayCell, MonthGrid all using outdated tokens
- No documentation files (VISION, SCREENS, DESIGN) yet — those came shortly after

### Next session *(at the time)*
- Phase 2A: replace colors.ts with DESIGN.md palette, commit notes data layer

---

---

# לוחות — יומן עבודה

> יומן רישום סשני של מה הושלם, מה הוחלט, ומה נשאר פתוח. מתעדכן ע"י Claude Code בסוף כל סשן לפי מפרט `CLAUDE.md`.
>
> רשומות חדשות מופיעות ראשונות. רשומות "backfilled" מתעדות עבודה שקדמה ליומן הזה.

---

## 2026-05-26 — סשן: Phase 3.3 (mode prop ב-MonthGrid + מודל אינטראקציה)

**שלב:** Phase 3.3
**Commits:** `a3ea24a` (tagMapper), `7bb11e1` (QuickActionSheet), `f139fcf` (שכתוב MonthGrid), ועדכון WORK_LOG
**משך:** ~שעה

### מה הושלם
- נוצר `src/utils/tagMapper.ts` — פונקציה טהורה `buildDayTags(dayData, userNotes)`. ממפה חגי DayData + ראש חודש + ספירת העומר + CalendarNotes ל-`DayCellTag[]` מסודר. ללא React, ללא תופעות לוואי.
- נוצר `src/components/calendar/QuickActionSheet.tsx` — תפריט long-press מבוסס `@gorhom/bottom-sheet` עם שלוש פעולות (addNote / addRecurring / viewDay). משתמש באייקוני lucide (Pencil, Gift, FileText). דפוס `forwardRef` עקבי עם שימוש ב-BottomSheet בשאר האפליקציה.
- שוכתב `src/components/calendar/MonthGrid.tsx` — שכתוב מלא הצורך ב-API של DayCell החדש. הוסר pragma `@ts-nocheck` (גשר Phase 3.2). שינויים מרכזיים:
  - נוסף prop מסוג `mode?: 'hebrew' | 'gregorian'` (ברירת מחדל `'hebrew'`). הפך לאופציונלי כדי שקבצי הטאב השמורים המשתמשים ב-`<MonthGrid />` ללא props ימשיכו לעמוד בבדיקת הטיפוסים ללא שינוי.
  - `getLabels()` מחשבת `primaryLabel`/`secondaryLabel` מ-`DayData` לפי mode.
  - מודל אינטראקציה: לחיצה ראשונה = בחירה, לחיצה שנייה על הנבחר = ניווט (TODO 3.4), long-press = QuickActionSheet.
  - בורר חודש/שנה הועבר מ-`onLongPress` ל-`onPress` בכותרת (לפי SCREENS.md).
  - הוסרו: `DayModal`, `useZmanim`, `isAfterSunset`, `afterSunset`, `modalDay` state, `bottomSheetRef` הישן.
  - `buildDayTags(item, [])` נקרא לכל תא עם userNotes ריק (ראה פתוח/חסום).
- Typecheck ירוק. תיקון אחד נדרש: `mode` הפך לאופציונלי (`mode?`) עם ברירת מחדל `'hebrew'` כדי לא לגעת ב-`index.tsx` השמור שמרנדר `<MonthGrid />` ללא props.

### החלטות שהתקבלו
- `mode` כברירת מחדל `'hebrew'` ולא שדה חובה — מונע שינוי קבצי טאב שמורים בטרם עת; Phase 3.4 יעביר `mode` מפורש בעת יצירת הטאב הלועזי
- חיבור notes למשתמש נדחה: קריאה ל-`useNotes` לכל תא בתוך `FlatList.renderItem` מפרה את Rules of Hooks. אסטרטגיית batch (טעינת notes לחודש פעם אחת ברמת MonthGrid) היא הפתרון הנכון אבל שייך ל-Phase 4
- פעולות QuickActionSheet הן no-ops מבניים — חיבור מלא קורה ב-Phase 3.4 (יעדי ניווט) ו-Phase 3.5 (אינטגרציית NoteEditor)

### פתוח / חוסם
1. **Notes משתמש לא נראות כ-tags.** `buildDayTags(item, [])` — אסטרטגיית batch נדחית ל-Phase 4
2. **ניווט לחיצה שנייה הוא no-op.** הערת `TODO Phase 3.4` ב-MonthGrid. יופעל ברגע שהטאב "יום" קיים
3. **מטפלי פעולות מהירות הם no-ops.** אותה תלות ב-Phase 3.4–3.5
4. **5 קבצים שמורים עדיין לא נגעו:** `_layout.tsx`, `day.tsx`, `index.tsx`, `settings.tsx`, `week.tsx`

### בסשן הבא
- Phase 3.4 — שינוי מבנה הטאבים: שכתוב `app/(tabs)/_layout.tsx` מ-4 טאבים (חודש/שבוע/יום/הגדרות) ל-(עברי/לועזי/יום/זמנים). יצירת `gregorian.tsx`, placeholder ל-`zmanim.tsx`. refactor של `index.tsx` להעביר `mode="hebrew"` במפורש. הסרת `week.tsx` מהטאבים.

---

## 2026-05-26 — סשן: Phase 3.2 (שכתוב DayCell לגרסה v2)

**שלב:** Phase 3.2 (+ תיקון חם של radius.ts מ-Phase 3.1)
**Commits:** `08f886b` (תיקון radius), `8adda9c` (התקנת lucide), `ca43010` (שכתוב DayCell + גשר MonthGrid), ועדכון WORK_LOG
**משך:** ~שעה

### מה הושלם
- **Pre-flight זיהה סטייה ב-radius.ts:** Phase 3.1 שלח `sm=4` (ללא `xs`) והוסיף `none=0`/`xxl=20` — לא לפי DESIGN.md. לא נמצאו צרכנים של `radius.none` או `radius.xxl`. תוקן מיידית כ-commit נפרד לפני כל עבודה על DayCell.
- **radius.ts הותאם ל-DESIGN.md:** `xs=4` (tags/badges), `sm=6` (תאי יום), `md=8`, `lg=12`, `xl=16`, `full=9999`. הוסרו `none` ו-`xxl`.
- **הותקן `lucide-react-native`** — נדרש לאייקון `Flame` המשמש כאינדיקטור נר שישי ב-DayCell. ללא fallback emoji.
- **שוכתב `src/components/calendar/DayCell.tsx`** — החלפה מלאה של ארכיטקטורת הפריסה האלכסונית הישנה. הקומפוננטה החדשה היא presentational בלבד: מקבלת `primaryLabel`, `secondaryLabel`, boolean-ים של מצב, `tags[]`, ו-`onPress`/`onLongPress`. הוסרו: import של `DayData`, קריאה ל-`toHebrewNumeral`, קריאה ל-`useSettingsStore`, `holidayDot`, `roshChodeshBar`, `sunsetBadge`, prop `isAfterSunset`, hex `#C4A882`, `aspectRatio: 0.85`, לוגיקת `diagonalDirection`.
- **נוסף גשר `@ts-nocheck` ל-`MonthGrid.tsx`** — העריכה היחידה המותרת לקובץ שמור. מדכא שגיאות טיפוס מ-API הישן של DayCell עד ש-Phase 3.3 יכתוב מחדש את MonthGrid. כולל הערת תיעוד.
- Typecheck ירוק אחרי כל שלב.

### החלטות שהתקבלו
- `radius.xs` (=4) לפינות chip של tag; `radius.sm` (=6) לפינות תא — מיפוי מדויק לפי DESIGN.md
- אייקון `Flame` מ-Lucide לנר (ללא emoji); גודל 12, צבע `colors.candle`
- אקומולציה של מצבים מאושרת: משפחת border (today/selected) ומשפחת רקע (גוני holiday/shabbat) בלתי תלויים
- `secondaryLabel` עם `writingDirection: 'ltr'` לרינדור נכון של ספרה לועזית בתוך container RTL
- `onPress`/`onLongPress` מוחרגים בכוונה מ-comparator של memo — ה-parent אמור להשתמש ב-`useCallback`
- `delayLongPress={350}` — sweet spot של RN להבדלת tap מ-long-press

### פתוח / חוסם
- `@ts-nocheck` ב-MonthGrid.tsx הוא חוב טכני מכוון — יוסר ב-Phase 3.3
- 5 קבצים שמורים עדיין לא נגעו: `_layout.tsx`, `day.tsx`, `index.tsx`, `settings.tsx`, `week.tsx`

### בסשן הבא
- Phase 3.3 — שכתוב MonthGrid: הוספת prop מסוג `mode: 'hebrew' | 'gregorian'`, מימוש מודל האינטראקציה של לחיצה כפולה, חיבור API של DayCell החדש, העברת טריגר הבוחר חודש/שנה מ-long-press ללחיצה על כותרת, מימוש תפריט פעולות מהיר ב-long-press

---

## 2026-05-25 — סשן: Phase 3.1 + H4 (tokens של radius ו-overlay)

**שלב:** Phase 3.1 / תחזוקה H4
**Commits:** `11bcb0f` (feat), ועדכון WORK_LOG
**משך:** ~30 דקות

### מה הושלם
- נוצר `src/constants/radius.ts` — סולם מלא ו-frozen: none(0) / sm(4) / md(8) / lg(12) / xl(16) / xxl(20) / full(9999)
- נוצר `src/constants/overlay.ts` — מינימלי: modal `'rgba(0, 0, 0, 0.45)'`
- עודכן `src/components/notes/NoteEditor.tsx`: ייבוא radius + overlay, הוחלפו `borderTopLeftRadius: 20` / `borderTopRightRadius: 20` → `radius.xl` (16), הוחלף `'rgba(0,0,0,0.45)'` → `overlay.modal`
- עודכן `src/components/calendar/MonthYearPicker.tsx`: אותם ייבואים, הוחלף `borderRadius: 20` → `radius.xl` (16), הוחלף `'rgba(0,0,0,0.45)'` → `overlay.modal`
- 6 הקבצים השמורים ל-Phase 3 לא נגעו, נשארו unstaged
- `tsc --noEmit` עבר ללא שגיאות

### החלטות שהתקבלו
- `borderRadius: 20` בשני הקומפוננטות ממופה ל-`radius.xl` (16), לא `radius.xxl` (20) — הפחתה מכוונת של 4px כדי להתיישר עם DESIGN.md שמציין `xl: 16` ל-modals/sheets
- overlay.ts מינימלי (modal בלבד) ולא צורה מלאה (modal/scrim/veil) — ערכים יתווספו לפי הצורך ב-Phase 3
- סולם הרדיוס כולל `none: 0` ו-`xxl: 20` כ-tokens גנריים גם אם לא נצרכים עדיין — הם משלימים את הסולם לשימוש ב-Phase 3

### פתוח / חוסם
- אין. H4 סגור.
- Phase 3.2 (שכתוב מלא של DayCell.tsx) הוא הבא

### בסשן הבא
- להתחיל Phase 3.2 — שכתוב DayCell.tsx לפי SCREENS.md + DESIGN.md (ממתין ל-prompt ביצוע מה-Architect)

---

## 2026-05-25 — סשן: תחזוקה (H1, H2, H3 — תיעוד + GitHub remote)

**שלב:** בין Phase 2 ל-Phase 3 — פריטי תחזוקה H1, H2, H3
**Commits:** `366995c` (תיעוד), ועוד ביצוע H3 remote (ללא commit — git plumbing בלבד)
**משך:** ~שעתיים

### מה הושלם
- כתיבת `docs/ROADMAP.md` — דו-לשוני (אנגלית ואז עברית), פירוט בינוני לכל שלב, מפת תלויות, הגדרת MVP
- כתיבת `docs/WORK_LOG.md` — הקובץ הזה. נקבע הפורמט, רשומות רטרואקטיביות ל-Phases 1, 2A, 2B, 2C
- שינוי שם branch מקומי מ-`master` ל-`main`
- יצירת repo פרטי ב-GitHub בכתובת `https://github.com/ShlomoLIfschitz/Luchot.git` עם תיאור מלא של הפרויקט
- הוספת `origin` remote ו-push של כל 12 ה-commits עם upstream tracking (`main` → `origin/main`)

### החלטות שהתקבלו
- רמת פירוט ב-ROADMAP: בינונית (פסקה + תלויות לכל משימה, בלי קריטריוני קבלה — אלה חיים ב-prompts של זמן ביצוע)
- פורמט רשומה ב-WORK_LOG: תאריך + שלב + commits + משך + ארבעה חלקים (הושלם / החלטות / פתוח / הבא)
- רשומות backfilled מסומנות `*(backfilled)*` כדי להבחין מרישום בזמן אמת
- H3 (GitHub remote) ו-H4 (קבצי tokens ל-radius/overlay) נדחים — ראה ROADMAP

### פתוח / חוסם
- החלטה ממתינה על קבצי tokens של H4 (radius.ts, overlay.ts) — ה-Architect מציע לצרף ל-Phase 3.1 בסשן הבא
- שלוש החלטות עיצוב ל-Phase 3.1 עדיין ממתינות: מבנה סולם ה-radius, מה לעשות עם `borderRadius: 20` הקיים (xl=16 או xxl=20), וצורת overlay.ts (מינימלי או מלא)
- 6 קבצים ב-working tree עדיין מסומנים לשכתוב ב-Phase 3 — לא נגעו בהם, כמצופה

### בסשן הבא
- גם Architect וגם Claude Code פותחים סשן חדש עם INIT prompts מעודכנים
- משימה ראשונה: לפתור את שלוש החלטות העיצוב הממתינות ל-Phase 3.1
- אחר כך לבצע Phase 3.1 — radius.ts + overlay.ts + התאמות פלטה סופיות, ועוד החלפת שני magic numbers הידועים ב-NoteEditor וב-MonthYearPicker

---

## 2026-05-25 — סשן: Phase 2B + 2C (סגירת שכבת UI של notes) *(backfilled)*

**שלב:** 2B, 2C
**Commits:** `583cbfd`, `3089df0` (+ תיקון הודעה של ה-commit המקורי של 2B)
**משך:** ~1.5 שעות

### מה הושלם
- אודיט Phase 2B: זוהו 4 hex violations ב-2 קבצים (NoteEditor שורות 102/124/139, MonthYearPicker שורה 70). אושר ש-NoteList כבר משתמש ב-tokens תקין
- התגלה ש-NoteList.tsx ב-working tree הוא rewrite של 115 שורות, לא תיקון צבעים — הועלה ל-Architect, נדחה ל-Phase 2C
- התגלה ש-NoteEditor.tsx היה rewrite של 95% כשנכנס ל-stage — ה-Architect תיקן את הודעת ה-commit כדי לתאר נכון את התוכן (`feat: complete notes UI layer + month/year picker`)
- commit ל-Phase 2B (מתוקן): `583cbfd` — NoteEditor + MonthYearPicker + 4 token swaps
- commit ל-Phase 2C: `3089df0` — מימוש מלא של NoteList מחובר ל-useNotes
- כל ה-commits typecheck-ירוקים

### החלטות שהתקבלו
- border radius (`20`) ו-`rgba(0,0,0,0.45)` ב-NoteEditor ו-MonthYearPicker: נדחים עד שיהיו קבצי tokens מתאימים (`radius.ts`, `overlay.ts`). לא להחליף magic number אחד באחר במהלך ניקוי tokens
- מאחר שאין remote עדיין, שכתוב היסטוריה (דרך `git commit --amend`) קביל לתיקון הודעות commit לא מדויקות
- כל קומפוננטה שהייתה "כתובה אבל לא בוצע commit" מקבלת commit לוגי משלה, לא bundle

### פתוח / חוסם
- 6 קבצים עדיין unstaged ב-working tree: כל `app/(tabs)/*.tsx` (חוץ ממה ש-Phase 3 ייצור חדש), `MonthGrid.tsx`. כולם נדחים ל-Phase 3
- קבצי tokens `radius.ts` ו-`overlay.ts` עדיין לא נוצרו
- ROADMAP.md ו-WORK_LOG.md עדיין לא נכתבו (ייעשה בסשן תחזוקה הבא)

### בסשן הבא
- תחזוקה: כתיבת ROADMAP.md ו-WORK_LOG.md
- אחר כך הגדרת remote של GitHub

---

## 2026-05-25 — סשן: Phase 2A (פלטת tokens + שכבת נתונים של notes) *(backfilled)*

**שלב:** 2A
**Commits:** `0e34e6f`, `cb18feb`
**משך:** ~שעתיים

### מה הושלם
- החלפת `src/constants/colors.ts` במלואה בפלטה של DESIGN.md: accent slate-blue (`#3D5A80`), 5 קטגוריות tags (tagHoliday, tagShabbat, tagSpecial, tagEvent, tagPersonal), ערכות בהיר וכהה
- צירוף תיקון `DayModal.tsx` שורה 101 (`colors.holiday` → `colors.tagHoliday`) לתוך ה-commit של הצבעים, כדי לשמור typecheck ירוק
- commit לשכבת הנתונים של notes: hook `useNotes` (CRUD מבוסס SQLite), `EventSchema.ts` (תואם Google Calendar), `CalendarProvider`, `useThemeColors`, root `_layout.tsx` async

### החלטות שהתקבלו
- ה-tokens של הפלטה הישנה הוסרו לחלוטין (בלי aliases): `noteWork`, `notePersonal`, `noteHoliday`, `noteOther`, `holiday`, `shabbat`, `todayLight`
- DayCell.tsx התקבל עם תוכן ברמת stub רק כדי לשמור typecheck ירוק — יישוכתב ב-Phase 3.2 לפי SCREENS.md
- מערכת הצבעים היא היסוד — כל היתר עכשיו צורך ממנה

### פתוח / חוסם
- DayCell, MonthGrid, כל קבצי הטאבים עדיין במצב טרום-Phase-3 — מסומנים לשכתוב מבני
- NoteEditor, NoteList, MonthYearPicker קיימים ב-working tree אבל unstaged — מסומנים ל-Phase 2B

### בסשן הבא
- ניקוי צבעים של Phase 2B ב-NoteEditor, NoteList, MonthYearPicker

---

## מוקדם יותר — Phase 1 (יסודות) *(backfilled)*

**שלב:** 1
**Commits:** `b204eb2`, `92425ed`, `22ab159` (וגם הקודמים `b38efee`, `42eccdb`, `eddbf6a`, `424383b`)
**משך:** מספר סשנים, ~4-5 שעות במצטבר

### מה הושלם
- שינוי שם הפרויקט מ-"DualCalendarApp" ל-"Luchot" בכל הקבצים (`b204eb2`)
- נעילת Node 20.18.1, הוספת תלויות expo-constants/crypto/font/linking, הגדרת build
- מעבר `StorageService` מ-API סינכרוני ל-SQLite async (`92425ed`)
- חיזוק שכבת השירותים (`22ab159`): `DateService.toHebrewYear()` לגימטריה, עטיפת `ZmanimService` ב-null-safe try/catch סביב כל 14 הזמנים, init flow ב-`NotificationService`, UUID מאובטח דרך expo-crypto ב-`dateUtils`
- הסרת התלות `react-native-mmkv` (הוחלפה ב-expo-crypto)
- תיקון כפתור Back פיזי באנדרואיד ב-`DayModal` (`eddbf6a`)
- תיקון `use24hTime` שלא נשמר בין הפעלות (`42eccdb`)
- ארגון מסמכי ארכיטקטורה לתיקיית `docs/` (`424383b`)

### החלטות שהתקבלו
- `EventSchema.ts` נעול לתאימות Google Calendar API — לא לשנות בלי אישור Architect
- קבצי שכבת השירותים (`DateService`, `ZmanimService`, `StorageService`) קדושים — להוסיף אליהם, לא לכתוב מחדש
- offline-first היא החלטת זהות, לא בחירה שלב-אחר-שלב — בלי backend לעולם
- `@gorhom/bottom-sheet` v4 לא מטפל בכפתור back של אנדרואיד באופן טבעי — חייבים לחבר ידנית בכל modal

### פתוח / חוסם *(באותו זמן)*
- אין עדיין מערכת design — צבעים עדיין הפלטה החומה הישנה
- DayModal, DayCell, MonthGrid כולם משתמשים ב-tokens מיושנים
- אין עדיין קבצי תיעוד (VISION, SCREENS, DESIGN) — אלה הגיעו זמן קצר אחר כך

### בסשן הבא *(באותו זמן)*
- Phase 2A: החלפת colors.ts בפלטה של DESIGN.md, commit לשכבת הנתונים של notes
