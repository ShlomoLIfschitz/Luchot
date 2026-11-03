# Handoff: "Support the project" (one-time tips via Google Play Billing)

## 1. Goal
Let users who want to support Luchot leave a one-time tip through Google Play Billing, without ads and without unlocking anything.

## 2. Decisions
- Google Play Billing, not an external link — because Play's Payments policy exempts only "tax exempt donations" from Play Billing (DECISIONS.md, 2026-11-03).
- Three consumable products, all unlocking nothing — because the app stays fully free.
- Entry point is a drawer item between "הגדרות" and "אודות" — because the drawer holds secondary screens (SCREENS.md).
- The screen is a full-screen modal with an X, same shell as the .ics import screen — because it reuses an approved pattern.
- A cancelled purchase returns silently to the amount screen (no error frame) — because the user chose to cancel.

## 3. Constraints — VERBATIM
- VISION.md: "**לא** מציגה פרסומות — לעולם"
- Shlomo (2026-11-03): "קיבלתי את החלופה של "תמיכה בפרויקט""
- Shlomo's choice (2026-11-03): "Google Play Billing (Recommended)"
- Google Play Payments policy: Play Billing must not be used for "tax exempt donations" (the only donation exemption).
- Memory: "הייתי רוצה שתשמור על רמת הפיקסלים בעיצוב" — build pixel for pixel from the frames.

## 4. Acceptance criteria
- [x] Shlomo approved frames E1–E4 (light, dark, tablet), the copy and the amounts 10/25/50 ₪ on 2026-11-03: "מאשר" — verified by: quoted in the PR.
- [ ] Drawer shows "תמיכה בפרויקט" with the heart icon, matching E1 — verified by: screenshot at 375 next to E1.
- [ ] Amount screen matches E2; prices are read from Play (localized), not hard-coded — verified by: screenshot + code review.
- [ ] A completed purchase shows E3 and the product is consumed (can tip again) — verified by: Play test purchase with a license tester on a device.
- [ ] Billing unavailable shows E4 — verified by: device with Play disabled or airplane mode.
- [ ] `npm run typecheck; if ($?) { npx expo-doctor }` passes — verified by: pasted output.

## 5. Out of scope
- Ads, any paid feature or subscription, any network call from Luchot's own code.
- `src/schemas/EventSchema.ts`.

## 6. Open questions
- Product copy and the three amounts (10 / 25 / 50 ₪) — owner: Shlomo (approved with the frames).
- Which IAP library (`expo-iap` vs `react-native-iap`) supports Expo SDK 58 / RN 0.88 today — owner: agent, verify before installing.
- Play Console payments profile and the three in-app products (IDs, prices) — owner: Shlomo.

## 7. Independent parts
none

## 8. State at handoff
- Done so far: DECISIONS.md entry; Figma frames in file `yFaCDCb17k2BVTGLzwj64a`, page "05 · Sync & Import (Phase 2–3)":
  - Light (E1 drawer, E2 amount, E3 thanks, E4 Play unavailable): https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/?node-id=59-170
  - Dark (E2–E4): https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/?node-id=60-482
  - Tablet 768 (E2 light/dark): https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/?node-id=60-844
  - Component `support/amount` (default/selected): https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/?node-id=60-385
- Last verification output: docs only, no code changed.
- Next step: after Shlomo approves the frames, verify the IAP library, then implement.
