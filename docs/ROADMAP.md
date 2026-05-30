# Luchot — Roadmap

> **Status snapshot — PHASE 3 COMPLETE (2026-05-27).**
> All Phase 3 sub-phases done. Phase 4 (polish for MVP) is the active phase.
>
> ~~Phase 3.6 complete. Phases 3.1–3.6 done; 3.7 is the final Phase 3 task.~~

This document is the dependency map and ordering plan for Luchot. Each phase lists what owns it, what it depends on, and what it unblocks. Full implementation detail lives in the per-task prompts written when the work is actually picked up — not here.

---

## How to read this document

- **Phases that are done** are summarized briefly with their commit range, for history.
- **Phases that are next** get a medium-detail block: goal, files touched, dependencies, what they unblock.
- **Phases beyond Phase 3** are sketched lightly — the picture there will sharpen as we approach them.
- **Acceptance criteria and subtasks** are intentionally *not* in this file. They belong in the prompts the Architect writes for Claude Code when each task starts.

---

## Completed phases

### Phase 1 — Foundations (commits `b38efee` → `22ab159`)

Project rename to Luchot, build config pinned, service layer hardened (DateService gematria, ZmanimService null-safe wrap, StorageService migrated to async SQLite, secure UUID via expo-crypto). Removed `react-native-mmkv`. Established the bilingual `docs/` folder.

### Phase 2A — Token palette + data layer (commits `0e34e6f`, `cb18feb`)

Replaced `src/constants/colors.ts` with the DESIGN.md slate-blue palette, 5 tag categories, Light + Dark schemes. Committed the notes data layer: `useNotes` hook, `EventSchema.ts` (Google Calendar-compatible), `CalendarProvider`, `useThemeColors`, async-aware root layout. Bundled the `DayModal` `colors.holiday` → `colors.tagHoliday` patch into the same commit to keep typecheck green.

### Phase 2B — Notes UI layer (commit `583cbfd`)

Committed `NoteEditor.tsx` (full modal UI wired to `useNotes`) and `MonthYearPicker.tsx` (new month/year jump component). Replaced all `'#fff'` literals in those files with `colors.textInverse`. Border radius (`20`) and overlay (`rgba(0,0,0,0.45)`) magic numbers in both files were noted but deferred until proper token files exist.

### Phase 2C — Notes list wiring (commit `3089df0`)

Replaced the placeholder `NoteList.tsx` stub with the full 115-line implementation: connected to `useNotes`, embeds `NoteEditor`, full add/edit/delete UI with Alert confirmation, TYPE_ICONS mapping, RTL layout. All colors already used tokens — no hex cleanup needed.

---

## Between Phase 2 and Phase 3 — Housekeeping

These are small, non-code items that should land before Phase 3 begins.

### H1 — ROADMAP.md
This file. Created in the housekeeping window.

### H2 — WORK_LOG.md
Initialize the session-by-session work log per `CLAUDE.md` spec. Claude Code will append a dated entry at the end of each session. Backfill entries for Phases 1, 2A, 2B, 2C using the existing commit history.

### H3 — GitHub remote
Create the `Luchot` repo on GitHub, rename local `master` → `main`, set the remote, and push the 11 commits + housekeeping commits. The repo description and README finalization happen here too.

### H4 — Token files for radius and overlay *(optional, judgment call)*
We have two known magic-number deferrals (`borderRadius: 20`, `rgba(0,0,0,0.45)`) in NoteEditor and MonthYearPicker. The cleanest moment to introduce `src/constants/radius.ts` and `src/constants/overlay.ts` is *before* Phase 3 starts touching the UI — that way Phase 3 components consume the tokens from day one. The Architect will decide at the time whether to do this now or fold it into Phase 3.1.

---

## Phase 3 — Calendar UI rewrite

The big one. Six tasks, with real dependencies between them. The recommended order below follows those dependencies — don't reorder without thinking about what breaks.

### 3.1 — Final palette adjustments + token completion

Goal: lock the color tokens and (optionally per H4) introduce `radius.ts` and `overlay.ts`. This is a quick pass to make sure the rest of Phase 3 has everything it needs from the design-token layer.

- **Owns:** `src/constants/colors.ts`, optionally `src/constants/radius.ts`, `src/constants/overlay.ts`
- **Depends on:** nothing
- **Unblocks:** everything else in Phase 3

### 3.2 — `DayCell.tsx` full rewrite

Goal: replace the typecheck-only stub with the real cell per SCREENS.md and DESIGN.md — 110px height, primary/secondary date split (Hebrew letter or Gregorian number depending on `mode`), up to 2 tag chips with "+N" overflow, Friday candle icon, today/selected highlights, long-press handler.

- **Owns:** `src/components/calendar/DayCell.tsx`
- **Depends on:** 3.1
- **Unblocks:** 3.3 (MonthGrid can't ship its `mode` prop without a working cell to render)
- **Note:** cell is presentational. Tap/long-press state lives in the parent (MonthGrid).

### 3.3 — `MonthGrid.tsx` mode prop + interaction model

Goal: add `mode: 'hebrew' | 'gregorian'` to MonthGrid. Fix the interaction model: first tap selects the cell (highlight only), second tap on the same selected cell navigates to the Day tab. Long-press fires the quick-action menu. Currently the month/year picker is on long-press — move it to a tap on the month header instead.

- **Owns:** `src/components/calendar/MonthGrid.tsx`
- **Depends on:** 3.2
- **Unblocks:** 3.4 (tab layout needs MonthGrid rendering correctly in both modes)

### 3.4 — Tab layout restructure ✅ (commits `6f25a6c`, `4c48d29`, `67aab14`)

Rewrote `_layout.tsx` (4 tabs: עברי/לועזי/יום/זמנים, lucide icons, theme colors). Deleted `week.tsx`. Created `gregorian.tsx` and `zmanim.tsx` (placeholders). Rewrote `index.tsx` and `day.tsx`. MonthGrid `mode` prop made required; `router.push('/(tabs)/day')` wired for second-tap and viewDay quick action.

### 3.5 — Day screen ✅ (commits `17b39b0`, `5f9def8`)

Full Day screen implemented: header (Hebrew + Gregorian dates), holiday banner, Torah details (Parasha/Omer/Daf/Rambam with Sefaria links), ZmanimList reuse, all-day notes, 24-hour schedule scaffold, FAB → NoteEditor, swipe day navigation. `DayModal.tsx` removed. NoteEditor confirmed as Modal-based (not BottomSheet) — documented in WORK_LOG.

### 3.6 — Zmanim screen ✅ (commits `77fa5c9`, `da4e237`, + zmanim.tsx in docs commit)

Extended `ZmanimService` with `candleLighting`/`havdalah` (additive). Created `ZmanimFullList` (14+2 zmanim, sectioned, GRA/MGA side-by-side). Full Zmanim screen: header, location placeholder (`'ישראל'` — Phase 4), shita segmented control (persisted), `ZmanimFullList`. Location picker and per-city candle times deferred to Phase 4.

### 3.7 — Hamburger drawer

Goal: build the drawer that lives off the universal header. Contains: Week view (moved out of tabs), Details (extended Torah learning), Settings (moved out of tabs), Tour, About. Settings rewrite must remove the "Show Hebrew date" and "Show Gregorian date" toggles (redundant in v2) and replace hardcoded icon background colors with token references.

- **Owns:** new drawer component, `app/(tabs)/settings.tsx` (relocated/rewritten), Week view component, Details component, About screen
- **Depends on:** 3.4 (settings must leave the tabs first)
- **Unblocks:** MVP

#### Sub-phases status — ALL COMPLETE:
- **3.7a-1** ✅ Drawer infrastructure + ScreenHeader (commits `0f90e39`–`5d3c54c`)
- **3.7a-2** ✅ Settings relocation + SettingsProvider cleanup + QuickActionSheet wiring (commits `8a040b0`–`844f55a`)
- **3.7b-1** ✅ @hebcal/learning integration — data layer (commits `847b7a5`–`1c249d5`)
- **3.7b-2** ✅ LearningItem refactor + Details screen (commits `bd8ec1c`–`4018fb9`)
- **3.7b-3** ✅ WeekGrid + Week screen (commits `d51db5b`–`7932310`)
- **3.7c** ✅ About screen + ScreenHeader bilingual date (commits `592c452`–`495d6a0`)

**Phase 3 closed 2026-05-27. Phase 4 (Polish for MVP) is now the active phase.**

---

## Phase 4 — MVP polish *(COMPLETE — 2026-05-27)* 🎉

> **MVP CLOSED 2026-05-27. Tagged `mvp-1.0.0`. Phase 5 is the active phase.**

Phase 3 and Phase 4 are complete. All VISION.md success criteria met.

**Completed in Phase 4:**
- **4.1 — RABBANUT shita removal** ✅ (commits `3800eed`–`0370076` + docs)
- **4.2 — Notes-in-grids** ✅ (commits `aa57d57`–`c62f2eb`) — batch data layer (getNotesInRange, getAllRecurringNotes, expandRecurringNotes, useDatesNotes) + MonthGrid + WeekGrid wiring + useNotes Gregorian recurring fix
- **4.3 — Per-city candle lighting** ✅ (commits `a6f96fc`–`bce6f26`) — candleLightingOffset utility; Jerusalem 40 min, Haifa 30 min, Safed 40 min; offset shown in Zmanim UI when non-default; ZmanimList now shows candle lighting on Day screen
- **4.4 — Date picker** ✅ (commits `1afc06d`–`936344f`) — useDatePicker hook (iOS spinner modal + Android native dialog); ScreenHeader onDatePress + ChevronDown affordance; wired into Day, Zmanim, Details, Week screens
- **4.5 — Location picker UI** ✅ (commits `3423cbd`–`8a00f2a`) — @hebcal/cities@5.0.1 installed; 36-city curated list with Hebrew names; LocationProvider extended with city name + source + persistence; locationPicker screen; Zmanim chip now interactive showing real city + GPS indicator; Drawer location item; omerReminders toggle removed (notifications deferred to Phase 5)

### 4-A — Learning schedules expansion *(deferred from Phase 3.7b-1)*

In Phase 3.7b-1 we integrated `@hebcal/learning@5.1.2`. Three schedules that appear in standard Israeli calendar apps are **not available in v5.1.2** and were intentionally deferred:

| Schedule | Reason deferred | Path forward |
|---|---|---|
| `rambamThreeChapters` | Not registered in v5.1.2 | Upgrade to @hebcal/learning v6 (requires @hebcal/core v6 upgrade — separate work) |
| `seferHaMitzvot` | Not registered in v5.1.2 | Same — upgrade path |
| `arukhHaShulchan` | Not registered in v5.1.2 | Same — upgrade path |

**To unlock:** Upgrade `@hebcal/core` + `@hebcal/learning` from v5 → v6. This is a non-trivial dependency upgrade (v6 has breaking API changes). Do not attempt mid-phase — schedule as a dedicated upgrade task within Phase 4. Once upgraded, add the three fields to `DayData` and surface them in the Day screen + Details panel.

**Also deferred:** `yerushalmi`, `dafWeekly`, `shemiratHaLashon`, `pirkeiAvotSummer` from v5.1.2 extras — lower priority; add to Phase 4 backlog only if architect decides they belong in the MVP.

---

### Post-MVP distribution — APK build setup (in progress)

EAS Build configured for Android preview (APK) distribution. First successful APK
gated on Free Tier quota reset (2026-06-01). See WORK_LOG entry dated 2026-05-27.

Once a clean APK installs and runs on test device, Phase 5 begins.

---

## Phase 5 — Post-MVP *(ACTIVE)*

Phase 4 / MVP is complete. Phase 5 is in progress.

### Wave 3a — Omer Count Reminders ✅ (2026-05-30)
Daily "היום X לעומר" notification at user-chosen time (default 21:00). Toggle + time
picker in Settings. Rolling-window sweep-on-init. Full Hebrew weeks phrasing via
`DateService.getOmerForDate`. No DB row. Commits `c00ddfa`–`fcc3c08`.

### Wave 3b — Candle-lighting notifications *(next)*
Location/astronomical fire time (before shkia per user's city offset). Different from
Omer's fixed-time approach — involves ZmanimService integration. Scoped to this wave.

### Wave 4 — .ics export/import
Export Luchot events as .ics via Android share sheet. Import .ics files the user
selects. No network, no OAuth. EventSchema is already Google-Calendar-compatible.

**Remaining backlog (priority TBD):**

- **Notifications wiring (candle-lighting)** — see Wave 3b above.
- **Learning schedules expansion** — three schedules unavailable in @hebcal/learning@5.1.2: `rambamThreeChapters`, `seferHaMitzvot`, `arukhHaShulchan`. Requires upgrading @hebcal/core + @hebcal/learning from v5 → v6 (breaking API changes — dedicate a full session).
- **Yerushalmi Yomi** — available in @hebcal/learning; add to DayData + Details screen.
- **Per-hour notes** — time-anchored note entries in the Day screen's hourly schedule. EventSchema `start.dateTime` field exists (Google Calendar compat); just needs NoteEditor time picker + Day screen rendering.
- **Rabbanut shita (proper implementation)** — Phase 4.1 removed RABBANUT because the old code silently computed GRA. Implement correctly: Rabbanut = GRA-based with Jerusalem-specific adjustments + per-city candle times. Now unblocked (location picker is complete).
- **Expanded city candle-lighting list** — `candleLightingOffset.ts` currently hardcodes Jerusalem/Haifa/Safed. Now that the 36-city picker exists, replace the bounding-box approach with the curated city list for the ~15 cities that have non-default offsets.
- **Havdalah custom selection** — currently `tzeitHakochavim` (8.5° twilight). Add per-user preference for Rabbeinu Tam (72 min) or 50-minute convention.
- **Week view expansion** — swipe between weeks; Week screen currently shows only the week containing `selectedDate`.
- **Accessibility** — dynamic type, screen reader labels (`accessibilityRole`, `accessibilityLabel`), RTL-aware focus order.
- **Performance audit** — month cache validation on diaspora toggle, scroll perf in Day screen hourly grid.
- **Onboarding tour** — the "Tour" drawer item (placeholder since Phase 3.7).
- **iCloud / Google sync** *(lower priority)* — leverages the Google Calendar-compatible EventSchema.
- **Widgets** *(speculative)* — iOS home screen, Android launcher.
- **Web companion** *(probably never — offline-first is the identity)*.

---

## MVP definition

Luchot is "MVP-ready" when a user can, in a single offline session:

1. Open the app and immediately see today's Hebrew date, Gregorian date, holidays, Parasha (if Shabbat), Daf Yomi, Rambam, Omer count, and candle lighting if Friday.
2. Switch between Hebrew and Gregorian calendar views without losing context.
3. Tap any day to view its full details (zmanim, learning items, holidays).
4. Add a personal note, event, birthday, or yahrzeit and have it appear on the calendar.
5. View all 14 halachic times for any day, calculated for their location and shita.
6. Use the app entirely in Hebrew with proper RTL layout.

Phase 3 completion gets us roughly 90% there. Phase 4 closes the remaining 10%.

---

---

# לוחות — מפת דרכים

> **תמונת מצב — MVP הושלם (2026-05-27). תויג `mvp-1.0.0`.**
> Phases 4.5–4.7 הושלמו. הפצת APK בתהליך (EAS Build, פרופיל preview — מכסה מתאפסת 2026-06-01). Phase 5 הוא הבא — ממתין למשוב משתמשים.

המסמך הזה הוא מפת התלויות וסדר העבודה של לוחות. כל שלב מציין את מה שהוא מכיל, במה הוא תלוי, ומה הוא משחרר אחריו. הפירוט המלא של כל משימה חי ב-prompts שה-Architect כותב ל-Claude Code בזמן ביצוע — לא כאן.

---

## איך לקרוא את המסמך

- **שלבים שכבר הושלמו** מסוכמים בקצרה עם טווח ה-commits שלהם, לצורך תיעוד היסטורי.
- **שלבים שהבאים בתור** מקבלים בלוק בפירוט בינוני: מטרה, קבצים, תלויות, מה הם משחררים.
- **שלבים מעבר ל-Phase 3** מתוארים בקלילות — התמונה תתחדד ככל שנתקרב אליהם.
- **קריטריוני קבלה ו-subtasks** לא נמצאים בקובץ הזה במכוון. הם שייכים ל-prompts שה-Architect כותב ל-Claude Code כשכל משימה מתחילה.

---

## שלבים שהושלמו

### Phase 1 — יסודות (commits `b38efee` → `22ab159`)

שינוי שם הפרויקט ל-Luchot, נעילת build config, חיזוק שכבת השירותים (גימטריה ב-DateService, עטיפת null-safe ב-ZmanimService, מעבר StorageService ל-SQLite async, UUID מאובטח דרך expo-crypto). הסרת `react-native-mmkv`. הקמת תיקיית `docs/` הדו-לשונית.

### Phase 2A — לוח הצבעים + שכבת הנתונים (commits `0e34e6f`, `cb18feb`)

החלפת `src/constants/colors.ts` בפלטת ה-slate-blue של DESIGN.md, 5 קטגוריות tags, ערכות בהיר וכהה. commit לשכבת הנתונים של notes: hook `useNotes`, `EventSchema.ts` (תואם Google Calendar), `CalendarProvider`, `useThemeColors`, root layout async. תיקון `colors.holiday` → `colors.tagHoliday` ב-DayModal צורף לאותו commit כדי לשמור על typecheck ירוק.

### Phase 2B — שכבת ה-UI של notes (commit `583cbfd`)

commit ל-`NoteEditor.tsx` (modal UI מלא מחובר ל-`useNotes`) ול-`MonthYearPicker.tsx` (קומפוננטה חדשה לקפיצה לחודש/שנה). החלפת כל `'#fff'` בקבצים האלה ב-`colors.textInverse`. ה-magic numbers של `borderRadius: 20` ו-`rgba(0,0,0,0.45)` תועדו אבל נדחו עד שייווצרו קבצי tokens מתאימים.

### Phase 2C — חיבור רשימת notes (commit `3089df0`)

החלפת ה-stub של `NoteList.tsx` במימוש המלא של 115 שורות: חיבור ל-`useNotes`, הטמעת `NoteEditor`, UI מלא של add/edit/delete עם Alert לאישור, מיפוי TYPE_ICONS, layout RTL. כל הצבעים כבר השתמשו ב-tokens — אין צורך בניקוי hex.

---

## בין Phase 2 ל-Phase 3 — תחזוקה

פעולות קטנות שאינן קוד, שצריכות להיכנס לפני שמתחילים את Phase 3.

### H1 — ROADMAP.md
הקובץ הזה. נוצר בחלון התחזוקה.

### H2 — WORK_LOG.md
אתחול יומן העבודה הסשני לפי המפרט של `CLAUDE.md`. Claude Code יוסיף רשומה מתוארכת בסוף כל סשן. רישומים רטרואקטיביים ל-Phases 1, 2A, 2B, 2C מתוך היסטוריית ה-commits הקיימת.

### H3 — Remote של GitHub
יצירת ה-repo `Luchot` ב-GitHub, שינוי שם `master` → `main` מקומית, הגדרת ה-remote, ו-push של 11 ה-commits + ה-commits של התחזוקה. תיאור ה-repo וגמר ה-README נעשים כאן.

### H4 — קבצי tokens ל-radius ו-overlay *(אופציונלי, שיקול דעת)*
יש שני magic numbers ידועים שדחינו (`borderRadius: 20`, `rgba(0,0,0,0.45)`) ב-NoteEditor וב-MonthYearPicker. הרגע הנקי ביותר להציג את `src/constants/radius.ts` ו-`src/constants/overlay.ts` הוא *לפני* ש-Phase 3 מתחיל לגעת ב-UI — כך הקומפוננטות של Phase 3 צורכות tokens מהיום הראשון. ה-Architect יחליט בזמן אם לעשות זאת עכשיו או לצרף ל-Phase 3.1.

---

## Phase 3 — שכתוב ה-UI של הלוח

הגדול שבכולם. שש משימות, עם תלויות אמיתיות ביניהן. הסדר המומלץ למטה עוקב אחרי התלויות האלה — לא לשנות אותו בלי לחשוב מה נשבר.

### 3.1 — התאמות סופיות לפלטה + השלמת tokens

המטרה: לנעול את ה-color tokens ו(אופציונלית לפי H4) להציג `radius.ts` ו-`overlay.ts`. מעבר מהיר כדי לוודא ששאר Phase 3 יקבל את כל מה שהוא צריך משכבת ה-design tokens.

- **מכיל:** `src/constants/colors.ts`, אופציונלית `src/constants/radius.ts`, `src/constants/overlay.ts`
- **תלוי ב:** כלום
- **משחרר:** את כל היתר ב-Phase 3

### 3.2 — שכתוב מלא של `DayCell.tsx`

המטרה: להחליף את ה-stub שעבר רק typecheck בתא האמיתי לפי SCREENS.md ו-DESIGN.md — גובה 110px, פיצול תאריך ראשי/משני (אות עברית או מספר לועזי בהתאם ל-`mode`), עד 2 tag chips עם "+N" עודף, אייקון נר בימי שישי, הדגשות של היום הנוכחי/נבחר, handler ל-long-press.

- **מכיל:** `src/components/calendar/DayCell.tsx`
- **תלוי ב:** 3.1
- **משחרר:** 3.3 (MonthGrid לא יכול לשלוח את ה-`mode` prop בלי תא עובד שירנדר)
- **הערה:** התא הוא הצגתי. ניהול ה-state של tap/long-press חי ב-parent (MonthGrid).

### 3.3 — `MonthGrid.tsx` עם mode prop + מודל אינטראקציה

המטרה: להוסיף `mode: 'hebrew' | 'gregorian'` ל-MonthGrid. לתקן את מודל האינטראקציה: לחיצה ראשונה בוחרת תא (הדגשה בלבד), לחיצה שנייה על אותו תא נבחר עוברת לטאב Day. long-press מפעיל את תפריט הפעולות המהיר. כרגע הבוחר חודש/שנה נמצא על long-press — להעביר אותו ללחיצה על כותרת החודש במקום.

- **מכיל:** `src/components/calendar/MonthGrid.tsx`
- **תלוי ב:** 3.2
- **משחרר:** 3.4 (סידור הטאבים זקוק ל-MonthGrid תקין בשני המצבים)

### 3.4 — סידור מחדש של הטאבים

המטרה: לכתוב מחדש את `app/(tabs)/_layout.tsx` מ-4 טאבים (חודש/שבוע/יום/הגדרות) למפרט החדש (עברי/לועזי/יום/זמנים). ברירת מחדל ב-עברי. ליצור `app/(tabs)/gregorian.tsx` (MonthGrid לועזי), `app/(tabs)/zmanim.tsx` (placeholder למסך זמנים ב-3.6). למחוק את `app/(tabs)/week.tsx` (Week view עובר להמבורגר ב-3.7). לרפקטר את `app/(tabs)/index.tsx` להיות הטאב של MonthGrid עברי.

- **מכיל:** כל הקבצים תחת `app/(tabs)/`
- **תלוי ב:** 3.3
- **משחרר:** 3.5, 3.6, 3.7

### 3.5 — מסך Day

המטרה: לבנות את מסך Day המלא שמחליף את ה-stub של `day.tsx` + `DayModal`. לפי SCREENS.md: header עם שני התאריכים, סיכום חגים/פרשה/דף/רמב"ם/עומר, לוח זמנים שעתי עם events וזמנים inline, רשימת notes לאותו יום. בלי modal יותר — Day הוא טאב מלא.

- **מכיל:** `app/(tabs)/day.tsx`, אולי מסיר את `src/components/calendar/DayModal.tsx`
- **תלוי ב:** 3.4
- **משחרר:** כלום קריטי (3.6 ו-3.7 בלתי תלויים)

### 3.6 — מסך זמנים

המטרה: לבנות את הטאב של זמנים. להציג את 14 הזמנים ההלכתיים לתאריך הנבחר, הדלקת נרות והבדלה בולטות בימי שישי, אינדיקטור מיקום נוכחי, בורר השיטה גלוי. צורך את `useZmanim` (כבר קיים בשכבת ה-hooks).

- **מכיל:** `app/(tabs)/zmanim.tsx`
- **תלוי ב:** 3.4
- **משחרר:** כלום

### 3.7 — תפריט המבורגר

המטרה: לבנות את התפריט הצדדי שמתפתח מה-header האוניברסלי. מכיל: Week view (יצא מהטאבים), Details (לימוד תורה מורחב), Settings (יצא מהטאבים), Tour, About. שכתוב Settings חייב להסיר את ה-toggles "הצג תאריך עברי"/"הצג תאריך לועזי" (מיותרים ב-v2) ולהחליף צבעי רקע hardcoded של אייקונים בהפניות ל-tokens.

- **מכיל:** קומפוננטת drawer חדשה, `app/(tabs)/settings.tsx` (מועבר/נכתב מחדש), קומפוננטת Week view, קומפוננטת Details, מסך About
- **תלוי ב:** 3.4 (Settings חייב לצאת מהטאבים קודם)
- **משחרר:** MVP

---

## Phase 4 — ליטוש ל-MVP *(אחרי Phase 3)*

תיאור קליל — הפרטים יתמלאו כשנגיע.

- חיבור התראות (NotificationService → ישויות events)
- ליטוש Settings: UX של בחירת מיקום, הסבר על השיטות
- מעבר נגישות: dynamic type, תוויות לקורא מסך (מודע ל-RTL)
- ביצועים: ולידציה ל-cache החודשי, ביצועי גלילה ב-Day screen
- מצבי ריק וגבולות שגיאה
- סיור משתמש (פריט ה-"Tour" בהמבורגר)

### 4-A — הרחבת לוחות לימוד *(נדחה מ-Phase 3.7b-1)*

ב-Phase 3.7b-1 שילבנו `@hebcal/learning@5.1.2`. שלושה לוחות שמופיעים בלוחות ישראליים סטנדרטיים **אינם זמינים ב-v5.1.2** ונדחו במכוון:
- **רמב"ם 3 פרקים** — אינו רשום ב-v5.1.2
- **ספר המצוות** — אינו רשום ב-v5.1.2
- **ערוך השולחן** — אינו רשום ב-v5.1.2

**לביטול הדחייה:** שדרוג `@hebcal/core` + `@hebcal/learning` מ-v5 → v6. זהו שדרוג תלויות לא-טריוויאלי. לתזמן כמשימת שדרוג ייעודית ב-Phase 4 — לא לנסות באמצע פאזה אחרת. ראה הפרטים בסעיף האנגלי למעלה.

---

## Phase 5+ — מעבר ל-MVP *(ספקולטיבי)*

תיאור עוד יותר קליל — אלה רעיונות, לא התחייבויות.

- סנכרון iCloud / Google (יישען על הסכמה התואמת ל-Google Calendar)
- Widgets (מסך הבית של iOS, launcher של אנדרואיד)
- תמיכה במיקומים מרובים (למשל למטיילים)
- שיתוף events/יארצייטים עם המשפחה
- מקבילה לוויב *(כנראה אף פעם — offline-first הוא הזהות)*

---

## הגדרת MVP

לוחות "מוכן ל-MVP" כאשר משתמש יכול, בסשן אחד offline:

1. לפתוח את האפליקציה ולראות מיד את התאריך העברי של היום, התאריך הלועזי, החגים, הפרשה (אם שבת), דף יומי, רמב"ם, ספירת העומר, והדלקת נרות אם יום שישי.
2. לעבור בין תצוגת הלוח העברי והלועזי בלי לאבד הקשר.
3. ללחוץ על כל יום כדי לראות את כל הפרטים שלו (זמנים, פריטי לימוד, חגים).
4. להוסיף הערה אישית, אירוע, יום הולדת או יארצייט, ולראות אותם מופיעים בלוח.
5. לראות את כל 14 הזמנים ההלכתיים לכל יום, מחושבים לפי המיקום והשיטה שלו.
6. להשתמש באפליקציה כולה בעברית עם RTL תקין.

השלמת Phase 3 מביאה אותנו לבערך 90% משם. Phase 4 סוגר את ה-10% הנותרים.
