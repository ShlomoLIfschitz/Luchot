# Luchot — Work Log

> Session-by-session log of what got done, what was decided, and what's open. Updated by Claude Code at the end of each session per `CLAUDE.md` spec.
>
> Most recent entries first. Backfilled entries cover work that predates this log.

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
