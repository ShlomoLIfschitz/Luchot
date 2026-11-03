## 2026-11-03 — Fixes from Shlomo's device check of build 16
### What was done
- Tab bar (PR #23): bottom padding was `max(inset, 18)`, so with 3-button navigation the labels touched the system bar. Now `max(18, inset + 8)`.
- Jump to today (PR #23): in the Hebrew month view `navigateToHebrewMonth` resets the selection to the 15th, so the button selected ט״ו חשון. Today is now selected after navigating.
- Expo SDK 58 patch updates (PR #23): `expo-doctor` failed on main without them. `app.json` gained the `expo-sharing` and `expo-splash-screen` config plugins, so the next release needs a full build.
- Settings gear (this branch): Figma drew it as two concentric circles, almost the same as the jump-to-today target. Shlomo chose a real cog: `GearIcon` is now lucide `Settings` (stroke 1.6 in the 21 box), and the Figma drawer frames were updated to match (Light `17:258`, Dark `20:961`).
### Open issues / blocked
- None of these is verified on a device yet; they reach the device through the next build of PR #22 after it merges main.
