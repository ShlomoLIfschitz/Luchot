# Luchot — Work Log

> Session-by-session log of what got done, what was decided, and what's open. Updated by Claude Code at the end of each session per `CLAUDE.md` spec.
>
> Most recent entries first. Backfilled entries cover work that predates this log.

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
