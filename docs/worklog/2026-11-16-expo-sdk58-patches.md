## 2026-11-16 — expo-* packages to the current SDK 58 patch versions (branch `chore/expo-sdk58-patches`)
### What was done
- `npx expo install --fix`: 15 expo-* packages moved one patch up (e.g. `expo` ~58.0.23 → ~58.0.25, `expo-notifications` ~58.1.8 → ~58.1.9, `expo-sqlite` ~58.0.15 → ~58.0.17, `expo-updates` ~58.0.21 → ~58.0.22). `package.json` + `package-lock.json` only.
- CI had turned red on `main` without a code change: `expo-doctor` → "15 packages out of date" after Expo published new SDK 58 patches (first seen on PR #33, 2026-11-15).
### Decisions made
- Reverted the `app.json` edit `expo install` made (added config plugins `expo-sqlite`, `expo-status-bar`): not needed, `expo-doctor` passes 20/20 without it, and it would change native config.
- These are native modules: the next production release must be a full `eas build`, not an OTA (see `docs/agentic/deploy.md`, runtimeVersion trap).
### Verification
- `npm run typecheck` → exit 0
- `npx expo-doctor` → 20/20 checks passed
- `npm run test:ics` → pass 32, fail 0; `npm run test:sync` → pass 29, fail 0
- `npx expo export --platform android` → exported, Android bundle `index-ad28278e….hbc`
### Open issues / blocked
- Not verified on a device.
### Next steps
- Merge PR #33 (stop-check hooks) once `main` is green.
