## 2026-11-03 — "Support the project" implementation (branch `feat/support-project`)
### What was done
- `expo-iap` 6.4.1 installed with `npx expo install` (Expo module, no Nitro; config plugin added to `app.json`). Chosen over `react-native-iap` 17.x, which needs `react-native-nitro-modules`.
- `src/services/BillingService.ts`: connect + load the three consumable products (`support_10`, `support_25`, `support_50`), purchase, consume. Leftover unconsumed purchases (e.g. a pending payment that completed later) are consumed on the next connect, so Play does not auto-refund them after 3 days.
- `app/support.tsx`: E2 / E3 / E4 per the approved frames; prices come from Play (localized). A cancelled purchase returns silently to E2.
- Drawer: "תמיכה בפרויקט" item (lucide `Heart`) between "הגדרות" and "אודות".
### Decisions made
- No `active` highlight on the new drawer item: `main`'s drawer has no active-route tracking yet (it lives on the Figma-parity branch). When that branch merges, add `active={isActive('/support')}`.
- While connecting to Play, E2 shows rows without prices and a loading primary button (state not in Figma).
### Open issues / blocked
- Not run on a device. Needs a full EAS build (native dependency + `app.json`).
- Shlomo: Play Console payments profile, the three in-app products with exactly these IDs, and a license tester for a test purchase.
- The earlier docs PR was opened from `review/device-test-13-14-15` by mistake; closed and replaced by a docs-only PR from `main`.
### Next steps
- After the products exist: preview build, test purchase with a license tester, screenshots at 375 / 768 next to E1–E4.
