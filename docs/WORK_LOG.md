# Luchot — Work Log

> Session-by-session log of what got done, what was decided, and what's open. Updated by Claude Code at the end of each session per `CLAUDE.md` spec.
>
> Most recent entries first. Backfilled entries cover work that predates this log.

---

## 2026-05-25 — Session: Housekeeping (ROADMAP + WORK_LOG)

**Phase:** Between Phase 2 and Phase 3 — housekeeping items H1 and H2
**Commits:** `a72df3c`
**Duration:** ~1h

### What got done
- Wrote `docs/ROADMAP.md` — bilingual (English then Hebrew), medium-detail phase plan, dependency map, MVP definition
- Wrote `docs/WORK_LOG.md` — this file. Format established, backfilled entries for Phases 1, 2A, 2B, 2C

### Decisions made
- ROADMAP phase detail level: medium (one paragraph + dependencies per task, no acceptance criteria — those live in execution-time prompts)
- WORK_LOG entry format: date + phase + commits + duration + four sections (done / decisions / open / next)
- Backfilled entries marked `*(backfilled)*` to distinguish from real-time logs
- H3 (GitHub remote) and H4 (radius/overlay token files) deferred — see ROADMAP

### Open items / blockers
- GitHub remote still not configured (planned as H3)
- Decision pending on H4: introduce `radius.ts` + `overlay.ts` before Phase 3.1 starts, or fold into 3.1 itself
- 6 files in working tree still flagged for Phase 3 rewrite — untouched, as expected

### Next session
- H3: GitHub remote setup + `master` → `main` rename + initial push
- Then begin Phase 3.1

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

## 2026-05-25 — סשן: תחזוקה (ROADMAP + WORK_LOG)

**שלב:** בין Phase 2 ל-Phase 3 — פריטי תחזוקה H1 ו-H2
**Commits:** `a72df3c`
**משך:** ~שעה

### מה הושלם
- כתיבת `docs/ROADMAP.md` — דו-לשוני (אנגלית ואז עברית), פירוט בינוני לכל שלב, מפת תלויות, הגדרת MVP
- כתיבת `docs/WORK_LOG.md` — הקובץ הזה. נקבע הפורמט, רשומות רטרואקטיביות ל-Phases 1, 2A, 2B, 2C

### החלטות שהתקבלו
- רמת פירוט ב-ROADMAP: בינונית (פסקה + תלויות לכל משימה, בלי קריטריוני קבלה — אלה חיים ב-prompts של זמן ביצוע)
- פורמט רשומה ב-WORK_LOG: תאריך + שלב + commits + משך + ארבעה חלקים (הושלם / החלטות / פתוח / הבא)
- רשומות backfilled מסומנות `*(backfilled)*` כדי להבחין מרישום בזמן אמת
- H3 (GitHub remote) ו-H4 (קבצי tokens ל-radius/overlay) נדחים — ראה ROADMAP

### פתוח / חוסם
- Remote של GitHub עדיין לא מוגדר (מתוכנן כ-H3)
- החלטה ממתינה על H4: להציג `radius.ts` + `overlay.ts` לפני שמתחילים את Phase 3.1, או לצרף לתוך 3.1 עצמו
- 6 קבצים ב-working tree עדיין מסומנים לשכתוב ב-Phase 3 — לא נגעו בהם, כמצופה

### בסשן הבא
- H3: הגדרת remote של GitHub + שינוי שם `master` → `main` + push ראשוני
- אחר כך להתחיל את Phase 3.1

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
