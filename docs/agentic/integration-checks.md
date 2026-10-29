# Definition of Done and Integration Checks — Luchot

> Read this before declaring a task done, before any `eas build` or `eas update`, and when a DoD command fails. The short form is in `CLAUDE.md`.

### ✅ Definition of Done (Release Gate — YOU run this, not sub-agents)

Before declaring ANY task complete, run via Bash and confirm exit code 0:

```bash
npm run typecheck      # tsc --noEmit — the contract validator. MUST pass.
npm run lint           # if a lint script exists; skip if not configured
npx expo-doctor        # MUST NOT introduce any NEW failing checks beyond the
                       # documented baseline. Current baseline: 17/17 (all checks
                       # pass). The pre-existing metro.config.js custom-config
                       # warning that previously held the baseline at 16/17 (see
                       # WORK_LOG, a4889c3) resolved itself as of acf610c — there is
                       # no longer any accepted/known failure. A task is blocked if
                       # expo-doctor shows ANY failure (e.g. a missing peer dep — the
                       # react-native-svg class of bug). Runs every task, even when
                       # deps were not touched.
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

**Before ANY `eas build`, also run a local production bundle:**
```bash
npx expo export --platform android   # must complete with 0 errors
```
`tsc` validates types and `expo-doctor` validates dependency wiring, but neither
executes the module graph. Only a real bundle catches broken imports, unresolved
assets, and circular dependencies — the class of failure that produces a green
checklist and an APK that crashes on launch. An EAS build costs real quota and
~20 minutes; this costs ~90 seconds. Never skip it to save time.

**Understand what these gates CANNOT catch.** They are all static. In the
2026-08-30 redesign, `tsc` and `expo-doctor` were both fully green while the week
view rendered every event under the wrong day column (the header was laid out
left-to-right while the grid positioned columns right-to-left) and the all-day row
was shifted off-screen by the gutter width. Anything involving **layout geometry,
RTL direction, or absolute positioning must be verified visually** — a green gate
is necessary, never sufficient.

For **data-layer / schema changes**, add manual verification:
- Run the app with existing data present (upgrade scenario), confirm migration applies cleanly and no data loss.
- Confirm queries return expected shapes (validation doesn't throw).

For **anything touching the build** (rare; user-approved): the EAS preview build must show no new `expo-doctor` failures beyond the documented baseline (currently 17/17 — all checks pass; the formerly-known metro.config.js warning resolved itself as of acf610c) before queuing. A NEW failure — e.g. a missing native peer dep like `react-native-svg` — must block the build, since it will crash the standalone APK.

If any check fails: identify the owner from the ownership table, delegate the fix with the **exact error text**, re-run the failing check. Do not proceed until green.


### 🧪 Testing & Verification (current state)

No automated tests yet — `test-engineer` is dormant. Verification is:
1. `npm run typecheck` — must pass.
2. Manual test on Android — describe what was tested in WORK_LOG.
3. Visual check against docs/DESIGN.md tokens (no rogue hex codes).

Activating Jest + React Native Testing Library is a Phase 5 decision. When activated, flip `test-engineer` to active in the roster and add `npm test` to the DoD gate.


### Integration checks (you run these after the DoD commands pass)

1. **No accidental network calls** — the only permitted network call is `src/utils/reverseGeocode.ts` (Nominatim, on an explicit user tap):
   ```bash
   grep -rn "fetch(\|axios\|XMLHttpRequest" src/ app/ | grep -v ".test."
   # Should list only src/utils/reverseGeocode.ts
   ```
2. **Sensitive data NOT in AsyncStorage:**
   ```bash
   grep -rn "AsyncStorage" src/ app/ | head
   # Review each occurrence — none should be tokens, passwords, PII
   ```
3. **Schema changes have upgrade logic** that runs on launch against existing data (see `docs/agentic/local-first.md`).
