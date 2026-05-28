# CLAUDE.md — Operating Instructions for Claude Code (Luchot)

> This file tells Claude Code how to work on the Luchot project. Read it at the start of every session, before doing anything else.
> קובץ זה מסביר לקלוד קוד איך לעבוד על פרויקט Luchot. קרא אותו בתחילת כל session, לפני כל פעולה אחרת.

---

## 🇬🇧 English

### Project Overview

**Luchot** — A bilingual Hebrew/Gregorian calendar app for iOS and Android, built with React Native and Expo Router.

- **Stack:** React Native 0.74.5, Expo SDK 51, TypeScript (strict), Expo Router, Zustand, SQLite (`expo-sqlite/legacy`), @hebcal/core (v5.x pinned), kosher-zmanim, react-native-svg, lucide-react-native
- **Architecture:** Offline-first, no backend, no account, no network. All data is local (SQLite). See `VISION.md`.
- **Status:** Post-MVP (`mvp-1.0.0` tagged). Phases 4.5–4.7 closed. APK distribution in progress (EAS Build, preview profile). Phase 5 backlog defined in ROADMAP.
- **Language:** UI is Hebrew RTL with parallel Gregorian. Code comments and docs can be English.

---

### 🚨 Start-of-Session Checklist (DO THIS FIRST)

Before touching any code, read these files in order (all live under `docs/`):

1. `docs/VISION.md` — What Luchot is, who it's for, what it must never be
2. `docs/SCREENS.md` — The complete screen map, interactions, and navigation
3. `docs/DESIGN.md` — Color tokens, typography, spacing, component specs
4. `docs/WORK_LOG.md` — What was done in the previous session, what's open, what's blocked
5. `docs/ROADMAP.md` — Current phase, what to work on next
6. `docs/DECISIONS.md` — Locked architectural decisions and their rationale (new — created alongside this update)

**Do not skip steps 4 and 6.** If `WORK_LOG.md` says "open issue: X", do not start something unrelated until X is resolved or explicitly deferred. If `DECISIONS.md` locks a choice, do not revisit it unless the user explicitly reopens it.

---

### 🧭 Orchestration Model — Two Layers of Planning

This project runs with a **two-layer orchestration model**. Understand your place in it.

```
User (orchestrator / bridge)
   │
   ├──> Architect Claude (separate chat) — meta-planner
   │        • Receives your final reports (pasted by user)
   │        • Writes long, precise, structured prompts
   │        • Owns strategy, vision, cross-session context
   │
   └──> Claude Code (YOU) — sub-agent orchestrator
            • Receives the Architect's prompt (pasted by user)
            • Decomposes it and delegates to sub-agents
            • Runs the Definition of Done gate
            • Reports back up to the user → Architect
                │
                ├──> mobile-ui-builder    (UI, screens, RTL, components)
                ├──> local-data-builder   (SQLite access, hooks, schemas)
                ├──> database-architect   (schema, migrations on real devices)
                └──> [test-engineer, security-auditor — dormant, see roster]
```

**Your job (Claude Code):** You are the project-level orchestrator. The Architect's prompt is your task spec. You decompose it, delegate to the right sub-agents per the roster and ownership table below, integrate their output, run the DoD gate, and produce one consolidated report for the user to paste back to the Architect.

**You do NOT write feature code directly when a sub-agent owns that area.** Your direct work is: planning, delegation, integration verification, running checks, and state-keeping (docs).

---

### 🤖 Active Sub-Agent Roster

Sub-agents live in `~/.claude/agents/` (global). For **this project**, the active roster is:

| Agent | Status | Owns |
|---|---|---|
| `mobile-ui-builder` | ✅ Active | `app/`, `src/components/`, `src/hooks/` (UI hooks), `src/navigation/`, mobile config (`app.json`*, `metro.config.js`, `babel.config.js`) |
| `local-data-builder` | ✅ Active | `src/services/` (data access), `src/providers/` (Zustand stores), `src/schemas/`, data hooks |
| `database-architect` | ✅ Active | SQLite schema definitions, migration/upgrade logic, `docs/SCHEMA.md` |
| `test-engineer` | 💤 Dormant | `tests/`, `*.test.*` — **not active yet.** Activate only when the user decides to start writing tests (ROADMAP Phase 5+). Until then, do not invoke. |
| `security-auditor` | 💤 Dormant | READ-ONLY. Profile: `mobile-local-only`. Low priority (no network attack surface). Invoke only for AsyncStorage hygiene / privacy review when explicitly asked. |

> *`app.json` and `eas.json` are sensitive (see Do-Not list). `mobile-ui-builder` may READ them but must ask the user before any edit.*

❌ **Not for this project:** `web-ui-builder`, `api-builder`, `baas-integrator` (Luchot has no web target, no custom backend, no BaaS).

**Security profile:** `mobile-local-only`. No server-side checks. Focus areas if/when auditing: sensitive data never in AsyncStorage (it's plaintext), parameterized SQLite queries, privacy (no data leaves device), no accidental network calls.

---

### 🛑 Autonomy Rules (CRITICAL)

The user has explicitly requested **approval before any task** — this applies to YOU and to every sub-agent you dispatch.

**Without asking, allowed:** reading files, `npm run typecheck`, listing directories, searching usages, planning a delegation.

**Requires explicit user approval first:** editing files, creating files, deleting files, `npm install` / adding dependencies, modifying any config (`app.json`, `eas.json`, `metro.config.js`, `babel.config.js`, `tsconfig.json`), running `eas build`, dispatching a sub-agent to perform writes.

**How to ask:**
> "Plan: delegate to `local-data-builder` → add `useReminders` hook + reminders table read layer (~2 files, ~80 lines). Then `mobile-ui-builder` for the settings toggle. Proceed?"

State the delegation plan, the agents involved, and the rough scope. Wait for explicit "yes" / "go" / "כן" before executing.

---

### 🔁 Execution Sequence (per feature)

When the Architect's prompt describes a feature, follow this order. Skip stages that don't apply.

1. **Clarify** — If the prompt is ambiguous or conflicts with a spec file or a locked decision → STOP, report to user, don't improvise.
2. **Log** — Note the task as in-progress (mention in your plan; full entry goes to WORK_LOG at close).
3. **Schema layer** (if data model changes) → `database-architect`. Defines tables + **migration/upgrade logic that runs on app launch against real user data**. This is critical — there are real installs with real data.
4. **Schema/types (Zod + TS)** → `local-data-builder` defines/updates `src/schemas/`.
5. **Data layer** → `local-data-builder` — services, query helpers, hooks. Each result validated before reaching UI.
6. **UI** → `mobile-ui-builder` — screens/components, consuming types from `src/schemas/`. May start in parallel with step 7 once schemas are locked.
7. **Tests** → `test-engineer` — **dormant; skip unless activated.**
8. **Security review** → `security-auditor` — dormant; skip unless explicitly requested.
9. **Integration Gate** → YOU run the Definition of Done (below).
10. **Close** → update WORK_LOG.md, ROADMAP.md (if shifted), DECISIONS.md (if a new architectural choice was made), then commit.

> Stages 3–5 are sequential (data shape must settle before consumers build on it). Stage 6 can overlap stage 5 only after the schema is locked.

---

### 📦 Artifact Ownership (prevents collisions)

| Owner | Owns (read + write) |
|---|---|
| `database-architect` | SQLite schema, migration/version logic, `docs/SCHEMA.md` |
| `local-data-builder` | `src/services/`, `src/providers/`, `src/schemas/`, data hooks, `docs/API.md` (data-layer hook docs) |
| `mobile-ui-builder` | `app/`, `src/components/`, `src/hooks/` (UI), `src/navigation/`, `src/constants/` (tokens — coordinate with DESIGN.md) |
| `test-engineer` | `tests/`, `*.test.*` (dormant) |
| `security-auditor` | READ-ONLY |
| Claude Code (you, as orchestrator) | `docs/` (WORK_LOG, ROADMAP, DECISIONS), `CLAUDE.md` |
| Sensitive (user approval each time) | `app.json`, `eas.json`, `package.json`, native config |

If a sub-agent needs to modify a file outside its ownership, it must STOP and report to you. You then either re-delegate to the correct owner or ask the user.

---

### ✅ Definition of Done (Release Gate — YOU run this, not sub-agents)

Before declaring ANY task complete, run via Bash and confirm exit code 0:

```bash
npm run typecheck      # tsc --noEmit — the contract validator. MUST pass.
npm run lint           # if a lint script exists; skip if not configured
npx expo-doctor        # MUST be 16/16. Catches what typecheck CANNOT: missing/
                       # mismatched native peer deps. This is non-negotiable — it
                       # runs every task, even when dependencies were not touched.
# npm test             # ONLY when test-engineer is active (currently dormant)
```

**Why `expo-doctor` is mandatory in the DoD:** `tsc` validates TYPES, not the
presence of native modules. In the 4.7→APK arc, `react-native-svg` was a missing
peer dep of `lucide-react-native`. typecheck passed green (the types ship with the
library), but the standalone APK crashed on first icon render because the native
module wasn't installed. Expo Go had silently bundled its own copy, masking the gap.
`expo-doctor`'s peer-dependency check is the ONLY gate in this list that catches this
class of bug — the one most likely to pass every other check and still crash in
production. Treat any failure as release-blocking.

If a dependency was added or changed in the task, ALSO run:
```bash
npx expo install --check   # verifies installed versions match SDK 51; reports drift
```
Use `npx expo install <pkg>` (never `npm install <pkg>`) so the SDK-compatible
version is chosen.

For **data-layer / schema changes**, add manual verification:
- Run the app with existing data present (upgrade scenario), confirm migration applies cleanly and no data loss.
- Confirm queries return expected shapes (validation doesn't throw).

For **anything touching the build** (rare; user-approved): the EAS preview build must pass `expo doctor` (16/16) before queuing — a missing peer dep that Expo Go masks will crash a standalone APK (this is exactly what happened in the 4.7→APK arc with `react-native-svg`).

If any check fails: identify the owner from the ownership table, delegate the fix with the **exact error text**, re-run the failing check. Do not proceed until green.

---

### 📝 State Discipline (docs mapping)

Luchot keeps its own doc set — **do not** introduce `PROGRESS.md` (that's a generic-template name). The mapping is:

- **`WORK_LOG.md`** — session log (most-recent-first). The "what happened" record. Append at session close.
- **`ROADMAP.md`** — phases and backlog. Update when a phase closes or priorities shift.
- **`docs/DECISIONS.md`** — locked architectural decisions with rationale. Append whenever a non-trivial architectural choice is made. Format:
  ```markdown
  ## [Decision title]
  - Date: YYYY-MM-DD
  - Context: [why this came up]
  - Choice: [what we picked]
  - Alternatives considered: [what we rejected and why]
  - Implications: [what this affects]
  ```
- **`docs/SCHEMA.md`** — human-readable DB schema (owned by `database-architect`).
- **`docs/API.md`** — data-layer hook documentation (owned by `local-data-builder`; "API" here means the internal data hooks, since there is no network API).

WORK_LOG entry format (unchanged):
```markdown
## [YYYY-MM-DD]
### What was done
- <bullets, including which sub-agent did what>
### Decisions made
- <decisions affecting future work; cross-reference DECISIONS.md if architectural>
### Open issues / blocked
- <in-progress or stuck>
### Next steps
- <next session>
```

---

### 🤝 Delegation Protocol

When dispatching a sub-agent, always provide four things:

1. **Context** — relevant locked decisions (from DECISIONS.md) and current state (from WORK_LOG).
2. **Task** — specific and bounded ("add `useReminders(date)` hook returning Zod-validated rows"), not vague ("work on reminders").
3. **Contracts** — point to the exact schema/types in `src/schemas/` the agent must respect or produce.
4. **DoD for this task** — what output proves it's done.

Example:
> "local-data-builder: implement the reminders read layer.
> Context: offline-first, `expo-sqlite/legacy` API only (locked — see DECISIONS.md). EventSchema stays Google-Calendar-compatible.
> Task: add `reminders` query helpers + `useReminders(date)` hook.
> Contracts: extend `src/schemas/` with a `ReminderSchema`; reuse EventSchema fields where they overlap.
> DoD: hook returns Zod-validated data, parameterized queries only, tsc green, works offline by definition."

---

### 📁 Project Structure

```
luchot/
├── app/                          # Expo Router screens (routes)  [mobile-ui-builder]
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
│   ├── components/               # [mobile-ui-builder]  calendar/ notes/ zmanim/ ui/
│   ├── constants/                # [mobile-ui-builder]  colors.ts typography.ts spacing.ts config.ts  (mirror DESIGN.md)
│   ├── hooks/                    # UI hooks [mobile-ui-builder]; data hooks [local-data-builder]
│   ├── providers/                # [local-data-builder]  Zustand stores (Calendar, Settings, Location)
│   ├── schemas/                  # [local-data-builder]  TS types + Zod (EventSchema, ...)
│   ├── services/                 # [local-data-builder]  DateService, ZmanimService, StorageService
│   └── utils/                    # helpers (dateUtils, hebrewUtils)
│
├── docs/                         # [Claude Code orchestrator]  all .md docs live here
│   ├── VISION.md  SCREENS.md  DESIGN.md      (stable specs)
│   ├── ROADMAP.md  WORK_LOG.md               (living state)
│   └── DECISIONS.md  SCHEMA.md  API.md       (DECISIONS new; SCHEMA/API as needed)
├── CLAUDE.md                     # This file (project root)
├── eas.json                      # ⚠️ sensitive — ask before edit
├── app.json                      # ⚠️ sensitive — ask before edit
└── package.json
```

---

### 💻 Coding Conventions

**File naming:** Components `PascalCase.tsx`; hooks `camelCase.ts` (`use…`); services `PascalCase.ts` (`…Service`); utils/constants `camelCase.ts`.

**Imports:** absolute from `src/` when possible; group React → external → internal → types; no barrel files.

**TypeScript:** strict on. `npm run typecheck` must pass before any commit. Avoid `any` (comment if unavoidable). `type` for unions/intersections, `interface` for object shapes.

**State:** Zustand for global (calendar, settings, location); React hooks for local; no Context API.

**Styling:** `StyleSheet.create`, never inline (locked — not NativeWind). All colors/fonts/spacing pulled from `src/constants/` (mirrors DESIGN.md). No rogue hex codes — if a value isn't a token, ask whether to add it.

---

### 🔄 RTL — Hebrew Right-to-Left (LOCKED, read carefully)

This is the single highest-risk area in Luchot. **Every one of the six bugs fixed in Phase 4.7 was RTL/layout-related.** The rule:

- **Use `flexDirection: 'row-reverse'` for Hebrew RTL rows. Do NOT rely on `flexDirection: 'row'` auto-flip, and do NOT use CSS transforms.** (This supersedes any older guidance that said "row auto-flips" — that approach caused the 4.7 bug cluster.)
- For Hebrew reading order, the first child should land on the **right**. When an icon+text row reads wrong, the fix is usually swapping JSX child order, not adding flips.
- `textAlign: 'right'` for Hebrew text.
- The drawer slides from the **left** (hamburger is top-left). Anchor `left: 0`, initial `translateX = -drawerWidth`.
- Hebrew text with `flex: 1` right-aligns to the container edge — add explicit `gap` between label and value so they don't touch (the Zmanim row bug).
- When in doubt about a layout direction, mentally trace it on an Android device, and prefer explicit dimensions over Yoga inference (the MonthGrid `weekRow` height bug: an empty style let Yoga resolve row height to ~0; explicit `height` broke the cycle).

---

### ⚛️ React Native Specifics

- **Primary target is Android.** Always reason about Android first; test there.
- Use `Pressable` over `TouchableOpacity` for new code.
- **Lists:** `@shopify/flash-list` is preferred for long scrolling lists. **Exception:** MonthGrid was deliberately rebuilt as a manual `View` grid (not a list) for mode-aware RTL/LTR control — do not "optimize" it back into a list.
- Async UI handles 5 states: loading, error, empty, success, **offline** (offline is trivially "always available" here since data is local, but still show sensible empty/error states).
- Touch targets ≥ 48dp. Use `SafeAreaView` / insets where it matters.
- Platform-specific code via `Platform.OS` or `.android.tsx`/`.ios.tsx`, not runtime hacks.

---

### 🌳 Git Workflow

- **Work directly on `main`.** No feature branches (solo project, no PRs).
- **Commit per logical unit** (one fix / feature / refactor — independently revertable), not per session.
- Message format: `<type>: <short summary>` + optional body (what & why, not how). Types: `feat fix refactor chore docs style test`.
- ✅ `fix: handle Android hardware back button in DayModal`  ❌ `wip`, `lots of changes`, mixed commits.
- Push at session end: `git push`. **Never** `--force`.

---

### 📝 End-of-Session Checklist

1. `npm run typecheck` — fix any errors; never end with broken types.
2. Update `WORK_LOG.md` (format above), noting which sub-agents did what.
3. Update `ROADMAP.md` if anything shifted.
4. Append to `docs/DECISIONS.md` if a new architectural choice was made.
5. Commit uncommitted work (`git add . && git commit && git push`).
6. Report to user: "Session done. Pushed N commits. Sub-agents used: … Open items: …"

---

### 🚫 Things You Must NOT Do

- **Do not** revisit locked decisions (see `docs/DECISIONS.md`) unless the user reopens them. The locked set: offline-first / no backend ever; `EventSchema.ts` stays Google-Calendar-compatible; 4 bottom tabs + hamburger drawer; `@hebcal/core` pinned to v5.x (v6 deferred to Phase 5); `flexDirection: 'row-reverse'` for Hebrew RTL; `expo-sqlite/legacy` import path (for Expo Go compatibility).
- **Do not** modify `node_modules/` directly (use patches).
- **Do not** delete `kosher-zmanim-0.9.0.tgz` (orphan) without confirming.
- **Do not** add dependencies without asking. If a peer dep is missing, surface it (`npx expo install --check`) and ask — don't silently install.
- **Do not** change `src/schemas/EventSchema.ts` without architect approval — Google Calendar compatible by design.
- **Do not** modify `app.json` or `eas.json` without asking.
- **Do not** commit `.env` or secrets.
- **Do not** rewrite `DateService.ts`, `ZmanimService.ts`, or `StorageService.ts` wholesale — they work and are battle-tested. Add to them; don't replace.
- **Do not** introduce a backend, API client, or analytics — offline-first by core principle.
- **Do not** use parchment colors, warm browns, or "Judaica" decorative elements — see DESIGN.md.
- **Do not** invoke `test-engineer` or `security-auditor` while they're dormant (see roster) unless the user activates them.

---

### ⚠️ Known Issues / Quirks

- `kosher-zmanim` 0.9.x ships extensionless ESM imports. `scripts/patch-expo-sqlite-imports.cjs` (postinstall) handles `expo-sqlite`. Similar new deps may need similar patches.
- SQLite uses the **`expo-sqlite/legacy`** entry point (classic v13 path: `openDatabase` + `transactionAsync`/`executeSqlAsync`). The non-legacy v14 API (`openDatabaseAsync`/`openDatabaseSync`) routes through a native module not present in Expo Go and will crash there. (Locked — DECISIONS.md.)
- `react-native-svg` is a required peer dep of `lucide-react-native`. Expo Go bundles its own copy, which masks the dependency — but a standalone APK needs it installed explicitly, or it crashes on first icon render. `expo doctor` must be 16/16 before any EAS build.
- `@gorhom/bottom-sheet` v4 does NOT handle the Android hardware back button. Always wire `BackHandler` manually (see SCREENS.md).
- New settings must be referenced in **both** `save()` and `loadFromStorage()` (the `use24hTime` persistence bug). Watch for this whenever adding a setting.

---

### 🧪 Testing & Verification (current state)

No automated tests yet — `test-engineer` is dormant. Verification is:
1. `npm run typecheck` — must pass.
2. Manual test on Android — describe what was tested in WORK_LOG.
3. Visual check against DESIGN.md tokens (no rogue hex codes).

Activating Jest + React Native Testing Library is a Phase 5 decision. When activated, flip `test-engineer` to active in the roster and add `npm test` to the DoD gate.

---

### 📞 When in Doubt

1. Re-read VISION.md, SCREENS.md, DESIGN.md.
2. Search WORK_LOG.md and DECISIONS.md for prior decisions.
3. Ask the user — they bridge to the Architect Claude.

Never guess on design decisions. Never assume on architecture. Ask.

---

## 🇮🇱 עברית — תקציר

> הקטע האנגלי למעלה הוא המקור המלא והמחייב. זהו תקציר עברי של מה שהשתנה והנקודות הקריטיות.

### מודל התזמור — שתי שכבות
- **המשתמש** = מתזמר-על וגשר.
- **הארכיטקט (Claude בצ'אט נפרד)** = מתכנן-על. מקבל את הדוחות שלך, כותב פרומפטים ארוכים ומדויקים, מחזיק אסטרטגיה והקשר חוצה-סשנים.
- **קלוד קוד (אתה)** = מתזמר ברמת הפרויקט. מקבל את הפרומפט של הארכיטקט, מפרק אותו, **מנצח על ה-sub-agents**, מריץ את ה-DoD, ומחזיר דוח אחד מאוחד.
- **אתה לא כותב קוד פיצ'ר ישירות** כשיש sub-agent שמחזיק בתחום. העבודה הישירה שלך: תכנון, האצלה, אימות אינטגרציה, הרצת בדיקות, ותחזוקת docs.

### רוסטר ה-sub-agents הפעילים
- ✅ `mobile-ui-builder` — מסכים, רכיבים, RTL, ניווט
- ✅ `local-data-builder` — SQLite, services, providers, schemas, hooks
- ✅ `database-architect` — schema + migrations על מכשירים אמיתיים
- 💤 `test-engineer` — רדום. להפעיל רק כשמחליטים להתחיל לכתוב tests (Phase 5).
- 💤 `security-auditor` — רדום, read-only, profile `mobile-local-only`. עדיפות נמוכה (אין שטח התקפה רשתי).
- ❌ לא בפרויקט: `web-ui-builder`, `api-builder`, `baas-integrator`.

### כללי אוטונומיה
אישור לפני **כל** משימה — חל גם עליך וגם על כל sub-agent שאתה שולח לכתוב. מותר בלי לשאול: קריאה, typecheck, חיפוש, תכנון. דורש אישור: כל כתיבה/יצירה/מחיקה, `npm install`, שינוי config, `eas build`, שיגור sub-agent לכתיבה. הצג תוכנית האצלה (אילו agents, איזה scope) וחכה ל"כן".

### RTL — נעול וקריטי
- **`flexDirection: 'row-reverse'`** ל-RTL עברי. **לא** להסתמך על auto-flip של `'row'`, ולא CSS transforms. (זה מבטל הנחיה ישנה — היא גרמה לאשכול הבאגים ב-4.7.)
- ילד ראשון נוחת מימין. כששורת icon+text קוראת הפוך — מחליפים סדר JSX, לא מוסיפים flips.
- drawer מהשמאל; `textAlign: 'right'` לעברית; `gap` מפורש בין label לערך; עדיף ממדים מפורשים על הסקת Yoga (באג ה-MonthGrid).

### docs
WORK_LOG.md + ROADMAP.md ממשיכים כרגיל. **אין** PROGRESS.md. נוסף `docs/DECISIONS.md` להחלטות ארכיטקטוניות נעולות. `docs/SCHEMA.md` (database-architect) ו-`docs/API.md` (local-data-builder, = תיעוד hooks פנימיים) לפי הצורך.

### החלטות נעולות (אל תפתח מחדש בלי בקשת המשתמש)
offline-first ללא backend לעולם · EventSchema תואם Google Calendar · 4 טאבים + drawer · hebcal v5.x · `row-reverse` ל-RTL · `expo-sqlite/legacy`.

### Definition of Done (אתה מריץ, לא ה-agents)
`npm run typecheck` חייב לעבור. lint אם קיים. **`npx expo-doctor` חייב 16/16 בכל משימה** — זה תופס מה ש-typecheck לא: peer dependency חסר או לא תואם (בדיוק הבאג של `react-native-svg` ב-4.7 שעבר typecheck אבל קרס ב-APK). אם נגעו ב-deps — גם `npx expo install --check`. `npm test` רק כש-test-engineer פעיל (כרגע רדום). לשינויי data — אימות ידני של migration על data קיים. לבנייה — `expo doctor` כבר חלק מה-DoD.

### דברים שאסור (תוספות מעל הקיים)
אל תפעיל agents רדומים. אל תתקין peer deps בשקט — הצף ושאל. שאר ה-do-nots בקטע האנגלי.
