# CLAUDE.md — Operating Instructions for Claude Code (Luchot)

> Read at the start of every session. General rules (Claude decides and does, the closed list of stops, DoD, merges, parallel work, Figma first) are in the global `~/.claude/CLAUDE.md`. This file holds only what is specific to Luchot; task-specific detail lives in `docs/agentic/` behind the pointers below.

### Project Overview

**Luchot** — A bilingual Hebrew/Gregorian calendar app for iOS and Android, built with React Native and Expo Router.

- **Stack:** React Native 0.74.5, Expo SDK 51, TypeScript (strict), Expo Router, Zustand, SQLite (`expo-sqlite/legacy`), @hebcal/core (v5.x pinned), kosher-zmanim, react-native-svg, lucide-react-native
- **Architecture:** Offline-first, no backend, no account, no network. All data is local (SQLite). See `docs/VISION.md`.
- **Status:** Post-MVP (`mvp-1.0.0` tagged). Phases 4.5–4.7 closed. APK distribution in progress (EAS Build, preview profile). Phase 5 backlog defined in ROADMAP.
- **Language:** UI is Hebrew RTL with parallel Gregorian. Code comments and docs can be English.

### 🚨 Start-of-Session Checklist (DO THIS FIRST)

Before touching any code, read these files in order (all live under `docs/`):

1. `docs/VISION.md` — What Luchot is, who it's for, what it must never be
2. `docs/SCREENS.md` — The complete screen map, interactions, and navigation
3. `docs/DESIGN.md` — Color tokens, typography, spacing, component specs
4. `docs/WORK_LOG.md` — What was done in the previous session, what's open, what's blocked
5. `docs/ROADMAP.md` — Current phase, what to work on next
6. `docs/DECISIONS.md` — Locked architectural decisions and their rationale (new — created alongside this update)

**Do not skip steps 4 and 6.** If `docs/WORK_LOG.md` says "open issue: X", do not start something unrelated until X is resolved or explicitly deferred. If `docs/DECISIONS.md` locks a choice, do not revisit it unless the user explicitly reopens it.

### Where things are (read on demand)

- `docs/agentic/agents.md` — before delegating: the orchestration model and the active sub-agent roster (which agents are dormant and why).
- `docs/agentic/ownership.md` — before delegating or fanning out: the per-feature execution sequence and the artifact ownership table, including the `src/hooks/` split rule.
- `docs/agentic/delegation.md` — when writing a delegation brief (includes the `save()`/`loadFromStorage()` standing rule for settings).
- `docs/agentic/parallel-policy.md` — before dispatching more than one agent at once (Luchot's seven dispatch rules).
- `docs/agentic/integration-checks.md` — before declaring a task done or running any `eas build`/`eas update`: the full Definition of Done, why each gate exists, and what the gates cannot catch.
- `docs/agentic/state.md` — WORK_LOG and DECISIONS formats, the project structure tree, the end-of-session checklist.
- `docs/agentic/local-first.md` — before any schema change or migration (real installs with real data).
- `docs/agentic/security.md` — when a task adds an OS permission, a network call, or a data export/import path.
- `docs/agentic/deploy.md` — before any `eas build` / `eas update` or a change to the release path.

---

### 💻 Coding Conventions

**File naming:** Components `PascalCase.tsx`; hooks `camelCase.ts` (`use…`); services `PascalCase.ts` (`…Service`); utils/constants `camelCase.ts`.

**Imports:** absolute from `src/` when possible; group React → external → internal → types; no barrel files.

**TypeScript:** strict on. `npm run typecheck` must pass before any commit. Avoid `any` (comment if unavoidable). `type` for unions/intersections, `interface` for object shapes.

**State:** Zustand for global (calendar, settings, location); React hooks for local; no Context API.

**Styling:** `StyleSheet.create`, never inline (locked — not NativeWind). All colors/fonts/spacing pulled from `src/constants/` (mirrors docs/DESIGN.md). No rogue hex codes — if a value isn't a token, ask whether to add it.

---

### 🔄 RTL — Hebrew Right-to-Left (LOCKED, read carefully)

This is the single highest-risk area in Luchot. **Every one of the six bugs fixed in Phase 4.7 was RTL/layout-related.** The rule:

- **Use `flexDirection: 'row-reverse'` for Hebrew RTL rows. Do NOT rely on `flexDirection: 'row'` auto-flip, and do NOT use CSS transforms.** (This supersedes any older guidance that said "row auto-flips" — that approach caused the 4.7 bug cluster.)
- **Reject the "accidentally correct" row.** The recurring anti-pattern here is plain `flexDirection: 'row'` with the JSX children hand-ordered backwards so the pixels come out right. Since the app is pinned to an LTR base, `'row'` is deterministic, so these render correctly *today* — which is exactly why they survive review. They are still wrong: the next person who reorders children in natural reading order silently breaks the layout. The 2026-08-30 audit found this in `settings.tsx` (six rows), three picker hooks, `NoteList`'s header, and `details.tsx`. When you find it, convert to explicit `row-reverse` with natural JSX order and confirm the render is unchanged.
- **Plain `'row'` IS legitimate** for genuinely direction-neutral rows: a symmetric 3-slot header (item-left / title-centre / item-right), a centred icon toolbar, or a `‹ … ›` chevron pair whose glyphs already encode direction. Don't mechanically convert those — judge each one.
- **Absolutely-positioned layouts need ONE geometry source.** When a screen mixes a flex row with absolutely-positioned children (the week timeline), every band must compute x from the same shared function against the same measured width. Two independent direction decisions WILL drift, and the failure is silent — it typechecks, bundles, and renders; it just puts content under the wrong column.
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


### 🌳 Git Workflow

- **One branch per task, one PR.** Never push to `main` directly. CI (`.github/workflows/ci.yml`) runs the DoD on every PR; when every check passed, Claude merges (this repo is `free`: a merge deploys nothing).
- **Commit per logical unit** (one fix / feature / refactor — independently revertable), not per session.
- Message format: `<type>: <short summary>` + optional body (what & why, not how). Types: `feat fix refactor chore docs style test`.
- ✅ `fix: handle Android hardware back button in DayModal`  ❌ `wip`, `lots of changes`, mixed commits.
- **Never** `--force`.

---

### 🚫 Things You Must NOT Do

- **Do not** revisit locked decisions (see `docs/DECISIONS.md`) unless the user reopens them. The locked set: offline-first / no backend ever; `EventSchema.ts` stays Google-Calendar-compatible; 4 bottom tabs + hamburger drawer; `@hebcal/core` pinned to v5.x (v6 deferred to Phase 5); `flexDirection: 'row-reverse'` for Hebrew RTL; `expo-sqlite/legacy` import path (for Expo Go compatibility).
- **Do not** modify `node_modules/` directly (use patches).
- **Do not** delete `kosher-zmanim-0.9.0.tgz` (orphan) without confirming.
- **Dependencies:** add them only with `npx expo install <pkg>` (never `npm install <pkg>`). A native dependency forces a full EAS build: flag it in the report. If a peer dep is missing, surface it (`npx expo install --check`) and fix it; never install silently.
- **Do not** change `src/schemas/EventSchema.ts` without architect approval — Google Calendar compatible by design.
- **`app.json` / `eas.json`:** an edit forces a full EAS build: flag it in the report.
- **Play Store releases:** an OTA to `production` or `eas submit` is a production deploy (closed-list stop 1, Shlomo's); an OTA to `preview` is free. After a native dependency or `app.json`/native config change, the next production release is a full build, never an OTA. Release order and the store checklist: `docs/agentic/deploy.md`.
- **Do not** commit `.env` or secrets.
- **Do not** rewrite `DateService.ts`, `ZmanimService.ts`, or `StorageService.ts` wholesale — they work and are battle-tested. Add to them; don't replace.
- **Do not** introduce a backend, API client, or analytics — offline-first by core principle.
- **Do not** use parchment colors, warm browns, or "Judaica" decorative elements — see docs/DESIGN.md.
- **Do not** invoke `test-engineer` or `security-auditor` while they're dormant (see roster) unless the user activates them.

---

### ⚠️ Known Issues / Quirks

- `kosher-zmanim` 0.9.x ships extensionless ESM imports. `scripts/patch-expo-sqlite-imports.cjs` (postinstall) handles `expo-sqlite`. Similar new deps may need similar patches.
- SQLite uses the **`expo-sqlite/legacy`** entry point (classic v13 path: `openDatabase` + `transactionAsync`/`executeSqlAsync`). The non-legacy v14 API (`openDatabaseAsync`/`openDatabaseSync`) routes through a native module not present in Expo Go and will crash there. (Locked — docs/DECISIONS.md.)
- `react-native-svg` is a required peer dep of `lucide-react-native`. Expo Go bundles its own copy, which masks the dependency — but a standalone APK needs it installed explicitly, or it crashes on first icon render. `expo doctor` must show no new failures beyond baseline (17/17 — all checks pass) before any EAS build.
- `@gorhom/bottom-sheet` v4 does NOT handle the Android hardware back button. Always wire `BackHandler` manually (see docs/SCREENS.md).
- New settings must be referenced in **both** `save()` and `loadFromStorage()` (the `use24hTime` persistence bug). Watch for this whenever adding a setting.
- All SQLite access is serialized through `runExclusive` (single-flight queue) in StorageService. `expo-sqlite/legacy` deadlocks if two `transactionAsync` calls overlap on the one shared connection — the gate makes overlap impossible, so callers may use `Promise.all` / fire-and-forget freely. Do not bypass it. (Locked — docs/DECISIONS.md, 2026-06-03.)


---

### 📞 When in Doubt

1. Re-read docs/VISION.md, docs/SCREENS.md, docs/DESIGN.md.
2. Search docs/WORK_LOG.md and docs/DECISIONS.md for prior decisions.
3. Architecture and code choices: decide, and report the decision in one line. Design and product decisions, and reopening a locked decision: ask Shlomo (closed list in the global `~/.claude/CLAUDE.md`).

---

## Agentic Workflow

General rules (DoD, merges, parallel work, session boundaries, UI Figma-first) are in the global ~/.claude/CLAUDE.md.

### Handoff files
Plans arrive as files in `docs/handoffs/` (format: `docs/handoffs/_TEMPLATE.md`), never as free-form pasted text.
When given a handoff file: before any code, (1) restate section 3 verbatim, (2) map each acceptance criterion to the exact command/check that verifies it, (3) list conflicts with existing code. Then continue without waiting; stop only for a conflict with existing code or an item on the closed list (global ~/.claude/CLAUDE.md).
When a heavy task leaves work for a new session, write it as a handoff file and fill in section 8 (State at handoff).
A new session starts by reading the last `docs/WORK_LOG.md` entry and the handoff file it points to, and nothing else.

### This project
- Verification command (the Definition of Done runs it and pastes its output; details and the visual-check rule in `docs/agentic/integration-checks.md`):
  ```
  npm run typecheck; if ($?) { npx expo-doctor }
  ```
  Before any `eas build`, also: `npx expo export --platform android`.
- Work log: `docs/WORK_LOG.md` (newest first: add entries at the top).
- How this project deploys: `docs/agentic/deploy.md`.
- Parallel-work details for this project: `docs/agentic/parallel-policy.md`.
