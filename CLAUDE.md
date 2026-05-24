# CLAUDE.md — Operating Instructions for Claude Code

> This file tells Claude Code how to work on the Luchot project. Read it at the start of every session, before doing anything else.

> קובץ זה מסביר לקלוד קוד איך לעבוד על פרויקט Luchot. קרא אותו בתחילת כל session, לפני כל פעולה אחרת.

---

## 🇬🇧 English

### Project Overview

**Luchot** — A bilingual Hebrew/Gregorian calendar app for iOS and Android, built with React Native and Expo Router.

- **Stack:** React Native 0.74, Expo SDK 51, TypeScript, Expo Router, Zustand, SQLite (expo-sqlite), @hebcal/core, kosher-zmanim
- **Architecture:** Offline-first, no backend, no account. All data is local (SQLite). See `VISION.md`.
- **Status:** In transition from v1 (partial implementation, parchment theme) to v2 (full redesign inspired by standard Israeli Hebrew calendar apps).
- **Language:** UI is Hebrew RTL with parallel Gregorian. Code comments and docs can be English.

---

### 🚨 Start-of-Session Checklist (DO THIS FIRST)

Before touching any code, read the following files in this order:

1. `VISION.md` — What Luchot is, who it's for, what it must never be
2. `SCREENS.md` — The complete screen map, interactions, and navigation
3. `DESIGN.md` — Color tokens, typography, spacing, component specs
4. `WORK_LOG.md` — What was done in the previous session, what's open, what's blocked
5. `ROADMAP.md` — Current phase, what to work on next

**Do not skip step 4.** If `WORK_LOG.md` says "open issue: X", do not start something unrelated until X is resolved or explicitly deferred.

---

### 🤝 Working with the Architect Claude

There is **another Claude** running in a separate conversation. That Claude is the architect/planner. You are the executor.

**Division of roles:**
| Architect Claude (other conversation) | Claude Code (you) |
|---|---|
| Vision, design decisions, UX | Implementation, edits, builds |
| Writes specs (VISION/SCREENS/DESIGN) | Reads specs and follows them |
| Plans roadmap | Executes roadmap items |
| Coordinates with user about direction | Reports technical findings to user |

The user is the bridge. The user will send you specific prompts from the Architect. Follow them precisely. If a prompt is ambiguous or seems to conflict with the spec files, **stop and ask before proceeding** — do not improvise.

---

### 🛑 Autonomy Rules (CRITICAL)

The user has explicitly requested **approval before any task**.

**This means:**
- Before starting any code change, file creation, refactor, or non-trivial edit — ask the user
- Acceptable to do without asking: reading files, running `npm run typecheck`, listing directories, searching for usages
- Not acceptable without asking: editing files, creating files, deleting files, running `npm install`, modifying configs

**How to ask:**
> "I'm about to do X (e.g., 'add BackHandler integration to RootLayout, ~10 lines'). Should I proceed?"

Wait for explicit "yes" / "go" / "כן" before executing.

---

### 📁 Project Structure

```
luchot/
├── app/                          # Expo Router screens (routes)
│   ├── _layout.tsx               # Root layout, providers init
│   └── (tabs)/                   # Tab navigator group
│       ├── _layout.tsx           # Tab bar config
│       ├── index.tsx             # Hebrew calendar (default)
│       ├── gregorian.tsx         # Gregorian calendar
│       ├── day.tsx               # Day view
│       ├── zmanim.tsx            # Zmanim view
│       └── settings.tsx          # Settings (hamburger access)
│
├── src/
│   ├── components/
│   │   ├── calendar/             # Month grid, day cell, day modal
│   │   ├── notes/                # Note editor, note list
│   │   ├── zmanim/               # Zmanim display
│   │   └── ui/                   # Shared UI primitives (Tag, Button, etc.)
│   │
│   ├── constants/
│   │   ├── colors.ts             # ⚠️ Color tokens from DESIGN.md
│   │   ├── typography.ts         # Type scale
│   │   ├── spacing.ts            # Spacing system
│   │   └── config.ts             # App-wide constants
│   │
│   ├── hooks/                    # Custom hooks (useZmanim, useNotes, etc.)
│   ├── providers/                # Zustand stores (Calendar, Settings, Location)
│   ├── schemas/                  # TypeScript types (EventSchema, etc.)
│   ├── services/                 # Business logic (DateService, ZmanimService, StorageService)
│   └── utils/                    # Helpers (dateUtils, hebrewUtils)
│
├── docs/                         # Architecture docs
│   ├── VISION.md
│   ├── SCREENS.md
│   ├── DESIGN.md
│   ├── ROADMAP.md
│   └── WORK_LOG.md
│
├── CLAUDE.md                     # This file
├── package.json
└── ...
```

---

### 💻 Coding Conventions

#### File naming
- Components: `PascalCase.tsx` (e.g., `DayCell.tsx`)
- Hooks: `camelCase.ts` starting with `use` (e.g., `useZmanim.ts`)
- Services: `PascalCase.ts` ending with `Service` (e.g., `DateService.ts`)
- Utils: `camelCase.ts` (e.g., `dateUtils.ts`)
- Constants/config: `camelCase.ts` (e.g., `colors.ts`)

#### Imports
- Use absolute imports from `src/` when possible (e.g., `from 'src/hooks/useZmanim'`)
- Group imports: React → external libs → internal → types
- Avoid barrel files (`index.ts` re-exports) — direct imports are clearer

#### TypeScript
- Strict mode is on. `npm run typecheck` must pass before any commit.
- Avoid `any`. If unavoidable, comment why.
- Prefer `type` over `interface` for unions/intersections; `interface` for object shapes
- Export types alongside the component/function that uses them

#### State management
- **Zustand stores** for global state (calendar, settings, location)
- **React hooks** (useState, useEffect) for local component state
- **No Context API for now** — Zustand handles it cleanly

#### Styling
- Use `StyleSheet.create` (not inline styles)
- Pull all colors, fonts, spacing from `src/constants/` (which mirrors `DESIGN.md`)
- Avoid hardcoded values — if a number isn't in spacing tokens, ask if it should be added

#### React Native specifics
- Always test on Android (this is the primary target platform)
- Respect RTL: use `flexDirection: 'row'` (auto-flips), `textAlign: 'right'` for Hebrew
- Use `Pressable` over `TouchableOpacity` for new code
- For lists: prefer `@shopify/flash-list` over `FlatList` for performance

---

### 🌳 Git Workflow

#### Branches
- **Work directly on `main`.** No feature branches.
- Reasoning: solo project, no PRs, no code review. Branches would add overhead without benefit.

#### Commits
- **Commit at the end of each logical unit of work**, not at the end of session
- A "logical unit" = one bug fix, one feature, one refactor — something that could be reverted independently
- Examples of good commits:
  - `fix: handle Android hardware back button in DayModal`
  - `feat: add candle lighting time to Zmanim screen`
  - `refactor: extract Tag component from DayCell`
  - `chore: update color tokens to match DESIGN.md`
- Examples of bad commits:
  - `wip` (too vague)
  - `lots of changes` (too broad)
  - `fix typo + add feature + refactor` (mixed)

#### Commit message format
```
<type>: <short summary>

<optional body explaining what and why, not how>
```
Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`

#### Pushing
- Push at the end of each session: `git push`
- Never `--force` push

---

### 📝 End-of-Session Checklist

Before ending any session, do these in order:

1. **Run typecheck:**
   ```bash
   npm run typecheck
   ```
   If errors — fix them. Don't end a session with broken types.

2. **Update `WORK_LOG.md`** with today's entry:
   ```markdown
   ## [YYYY-MM-DD]
   ### What was done
   - <bullet list of completed work>
   ### Decisions made
   - <any decisions that affect future work>
   ### Open issues / blocked
   - <anything left in-progress or stuck>
   ### Next steps
   - <what should happen next session>
   ```

3. **Update `ROADMAP.md`** if anything shifted (item completed, item added, priority changed)

4. **Commit any uncommitted work:**
   ```bash
   git status                          # See what's pending
   git add .
   git commit -m "session: <date> - <summary>"
   git push
   ```

5. **Tell the user**: "Session done. Pushed N commits. Open items: ..."

---

### 🚫 Things You Must NOT Do

- **Do not** modify files in `node_modules/` directly (use patches if needed)
- **Do not** delete `kosher-zmanim-0.9.0.tgz` even though it's an orphan — confirm with user first
- **Do not** add new dependencies without asking
- **Do not** change the schema (`src/schemas/EventSchema.ts`) without architect approval — it's Google Calendar compatible by design
- **Do not** modify `app.json` or `eas.json` without asking
- **Do not** commit `.env` files or anything with secrets
- **Do not** rewrite `DateService.ts`, `ZmanimService.ts`, or `StorageService.ts` wholesale — they are working and tested. Add to them; don't replace
- **Do not** introduce a backend, API client, or analytics library — Luchot is offline-first by core principle (see VISION.md)
- **Do not** use parchment colors, warm browns, or "Judaica" decorative elements — see DESIGN.md philosophy

---

### ⚠️ Known Issues / Quirks

- `kosher-zmanim` 0.9.x ships with extensionless ESM imports. The `scripts/patch-expo-sqlite-imports.cjs` postinstall script handles this for `expo-sqlite`. If you add new dependencies that have similar issues, you may need to patch them similarly.
- `@gorhom/bottom-sheet` v4 does NOT handle Android hardware back button natively. Always wire it manually with `BackHandler` (see SCREENS.md > "Hardware Back Button" section).
- `use24hTime` setting was previously not persisted across restarts. **This is the kind of bug to watch for** — when adding new settings, verify both `save()` AND `loadFromStorage()` reference it.

---

### 🧪 Testing & Verification

Currently no automated tests. For now, verification is:

1. `npm run typecheck` — must pass
2. Manual test on Android device/emulator — describe what was tested in WORK_LOG
3. Visual check that styling matches DESIGN.md tokens (no rogue hex codes)

Adding Jest + RNTL is on the roadmap for Phase 2.

---

### 📞 When in Doubt

If something is unclear:
1. **Re-read** VISION.md, SCREENS.md, DESIGN.md
2. **Search** WORK_LOG.md for prior decisions
3. **Ask the user** — they coordinate with the Architect Claude and will get you a clear answer

Never guess on design decisions. Never assume on architecture. Ask.

---

## 🇮🇱 עברית

### סקירת הפרויקט

**Luchot** — אפליקציית לוח שנה דו-לשונית עברי/לועזי ל-iOS ו-Android, בנויה ב-React Native ו-Expo Router.

- **Stack:** React Native 0.74, Expo SDK 51, TypeScript, Expo Router, Zustand, SQLite, @hebcal/core, kosher-zmanim
- **ארכיטקטורה:** Offline-first, ללא backend, ללא חשבון. כל המידע מקומי (SQLite). ראה `VISION.md`
- **סטטוס:** במעבר מ-v1 (מימוש חלקי, theme של parchment) ל-v2 (עיצוב מחודש בהשראת לוח עברי הסטנדרטי הישראלי)
- **שפה:** ממשק עברי RTL עם לועזי במקביל. הערות קוד ותיעוד יכולים להיות באנגלית

---

### 🚨 רשימת בדיקה בתחילת Session

לפני כל פעולה בקוד, קרא את הקבצים הבאים בסדר הזה:

1. `VISION.md` — מה Luchot, למי, מה היא לעולם לא צריכה להיות
2. `SCREENS.md` — מפת מסכים, אינטראקציות, ניווט
3. `DESIGN.md` — צבעים, טיפוגרפיה, מרווחים, מפרטי רכיבים
4. `WORK_LOG.md` — מה נעשה ב-session הקודם, מה פתוח, מה תקוע
5. `ROADMAP.md` — שלב נוכחי, מה הבא בתור

**אל תדלג על שלב 4.** אם `WORK_LOG.md` רושם "open issue: X" — אל תתחיל משהו אחר עד ש-X נפתר או נדחה במפורש.

---

### 🤝 עבודה עם הארכיטקט (Claude אחר)

יש **קלוד נוסף** ששרץ בשיחה נפרדת. הוא הארכיטקט / מתכנן. אתה המבצע.

| הארכיטקט (שיחה אחרת) | קלוד קוד (אתה) |
|---|---|
| Vision, החלטות עיצוב, UX | מימוש, עריכות, בנייה |
| כותב מפרטים (VISION/SCREENS/DESIGN) | קורא מפרטים ומבצע אותם |
| מתכנן roadmap | מבצע פריטי roadmap |
| מתאם עם המשתמש על כיוון | מדווח על ממצאים טכניים |

המשתמש הוא הגשר. המשתמש ישלח לך פרומפטים ספציפיים מהארכיטקט. בצע אותם בדיוק. אם פרומפט עמום או נראה בסתירה לקבצי המפרט — **עצור ושאל לפני שתמשיך** — אל תאלתר.

---

### 🛑 כללי אוטונומיה (קריטי)

המשתמש ביקש במפורש **אישור לפני כל משימה**.

**מה זה אומר:**
- לפני כל שינוי קוד, יצירת קובץ, refactor, או עריכה לא טריוויאלית — שאל את המשתמש
- בלי לשאול אפשר: לקרוא קבצים, להריץ `npm run typecheck`, לסרוק תיקיות, לחפש שימושים
- לא בלי לשאול: עריכת קבצים, יצירת קבצים, מחיקת קבצים, `npm install`, שינוי config

**איך לשאול:**
> "אני עומד לעשות X (לדוגמה: 'הוספת BackHandler ל-RootLayout, כ-10 שורות'). להמשיך?"

חכה ל"כן" / "go" / "yes" מפורש לפני שתבצע.

---

### 📁 מבנה הפרויקט

ראה הטבלה המלאה בקטע האנגלי למעלה. תיאור קצר:
- `app/` — מסכי Expo Router (routes)
- `src/components/` — קומפוננטות, מחולקות לפי תחום (calendar, notes, zmanim, ui)
- `src/constants/` — tokens מ-DESIGN.md (colors, typography, spacing)
- `src/hooks/` — hooks מותאמים
- `src/providers/` — Zustand stores
- `src/schemas/` — TypeScript types
- `src/services/` — לוגיקה עסקית (DateService, ZmanimService, StorageService)
- `src/utils/` — helpers
- `docs/` — תיעוד ארכיטקטוני

---

### 💻 מוסכמות קוד

#### שמות קבצים
- Components: `PascalCase.tsx` (למשל `DayCell.tsx`)
- Hooks: `camelCase.ts` מתחיל ב-`use` (למשל `useZmanim.ts`)
- Services: `PascalCase.ts` נגמר ב-`Service` (למשל `DateService.ts`)
- Utils: `camelCase.ts`
- Constants: `camelCase.ts`

#### Imports
- imports אבסולוטיים מ-`src/` כשניתן
- קבץ: React → ספריות חיצוניות → פנימי → types
- בלי barrel files (`index.ts` re-exports) — imports ישירים ברורים יותר

#### TypeScript
- Strict mode פעיל. `npm run typecheck` חייב לעבור לפני כל commit
- הימנע מ-`any`. אם אין ברירה — כתוב הערה למה
- העדף `type` ל-unions/intersections, `interface` לאובייקטים

#### Styling
- השתמש ב-`StyleSheet.create` (לא inline styles)
- משוך צבעים, fonts, spacing מ-`src/constants/` (משקף את `DESIGN.md`)
- הימנע מערכים hardcoded — אם מספר לא ב-tokens, שאל אם להוסיף

#### React Native ספציפי
- תמיד בדוק על Android (פלטפורמת היעד העיקרית)
- כבד RTL: `flexDirection: 'row'` (מתהפך אוטומטית), `textAlign: 'right'` לעברית
- השתמש ב-`Pressable` במקום `TouchableOpacity` לקוד חדש
- לרשימות: העדף `@shopify/flash-list` על `FlatList` לביצועים

---

### 🌳 Git Workflow

#### Branches
- **עובדים ישירות על `main`.** ללא feature branches
- הסיבה: פרויקט יחיד, ללא PRs, ללא code review

#### Commits
- **commit בסוף כל יחידת עבודה הגיונית**, לא בסוף session
- "יחידה הגיונית" = תיקון באג אחד, פיצ'ר אחד, refactor אחד — משהו שניתן ל-revert בנפרד

#### דוגמאות
✅ טוב:
- `fix: handle Android hardware back button in DayModal`
- `feat: add candle lighting time to Zmanim screen`
- `refactor: extract Tag component from DayCell`

❌ רע:
- `wip` (עמום)
- `lots of changes` (רחב מדי)
- `fix typo + add feature + refactor` (מעורבב)

#### פורמט הודעת commit
```
<type>: <תיאור קצר>

<גוף אופציונלי — מה ולמה, לא איך>
```
Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`

#### Push
- Push בסוף כל session: `git push`
- **לעולם** לא `--force` push

---

### 📝 רשימת בדיקה בסוף Session

לפני סיום session, בצע בסדר:

1. **Typecheck:**
   ```bash
   npm run typecheck
   ```
   אם יש שגיאות — תקן. אל תסיים session עם types שבורים

2. **עדכן `WORK_LOG.md`** עם רשומה להיום:
   ```markdown
   ## [YYYY-MM-DD]
   ### מה נעשה
   - <bullet list>
   ### החלטות שהתקבלו
   - <כל החלטה שתשפיע על עבודה עתידית>
   ### בעיות פתוחות / חסומות
   - <כל מה שנשאר באמצע או תקוע>
   ### צעדים הבאים
   - <מה צריך לקרות ב-session הבא>
   ```

3. **עדכן `ROADMAP.md`** אם משהו השתנה

4. **Commit כל מה שלא נשמר:**
   ```bash
   git status
   git add .
   git commit -m "session: <date> - <summary>"
   git push
   ```

5. **דווח למשתמש:** "Session הסתיים. דחפתי N commits. פריטים פתוחים: ..."

---

### 🚫 דברים שאסור לעשות

- **לא** לשנות קבצים ב-`node_modules/` ישירות (השתמש ב-patches אם צריך)
- **לא** למחוק `kosher-zmanim-0.9.0.tgz` למרות שהוא orphan — אשר עם המשתמש קודם
- **לא** להוסיף dependencies בלי לשאול
- **לא** לשנות את הסכמה (`EventSchema.ts`) בלי אישור הארכיטקט — היא תואמת Google Calendar בכוונה
- **לא** לשנות `app.json` או `eas.json` בלי לשאול
- **לא** לעשות commit לקבצי `.env` או משהו עם סודות
- **לא** לכתוב מחדש את `DateService.ts`, `ZmanimService.ts`, `StorageService.ts` מההתחלה — הם עובדים ונבדקים. הוסף להם, אל תחליף
- **לא** להוסיף backend, API client, או analytics — Luchot היא offline-first בעיקרון
- **לא** להשתמש בצבעי parchment, חומים חמים, או אלמנטים דקורטיביים "יודאיים" — ראה DESIGN.md

---

### ⚠️ בעיות ידועות

- `kosher-zmanim` 0.9.x מגיע עם imports ESM ללא סיומות. ה-`scripts/patch-expo-sqlite-imports.cjs` postinstall מטפל ב-`expo-sqlite`. אם תוסיף dependencies עם בעיות דומות — אולי תצטרך לעשות patch דומה
- `@gorhom/bottom-sheet` v4 **לא** מטפל בכפתור חזרה אנדרואיד באופן מובנה. תמיד חבר ידני עם `BackHandler`
- `use24hTime` לא היה נשמר בין הפעלות. **זה סוג הבאג שכדאי לשים אליו לב** — כשמוסיפים הגדרה חדשה, ודא ש-`save()` וגם `loadFromStorage()` מפנים אליה

---

### 🧪 בדיקה ואימות

כרגע אין tests אוטומטיים. בינתיים, אימות הוא:

1. `npm run typecheck` — חייב לעבור
2. בדיקה ידנית על Android — תאר מה נבדק ב-WORK_LOG
3. בדיקה ויזואלית שהסטיילינג תואם ל-DESIGN.md (בלי hex codes חופשיים)

הוספת Jest + RNTL ב-roadmap לשלב 2.

---

### 📞 כשבספק

אם משהו לא ברור:
1. **קרא שוב** את VISION.md, SCREENS.md, DESIGN.md
2. **חפש** ב-WORK_LOG.md החלטות קודמות
3. **שאל את המשתמש** — הוא מתאם עם הארכיטקט ויביא לך תשובה ברורה

לעולם אל תנחש על החלטות עיצוב. לעולם אל תניח על ארכיטקטורה. שאל.
