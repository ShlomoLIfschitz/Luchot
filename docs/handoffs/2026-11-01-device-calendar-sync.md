# Handoff: Google Calendar sync (device calendar) + .ics import

## 1. Goal
Let users opt in to syncing Luchot with their Google Calendar (import and export) through the device calendar provider, plus import of .ics files, without any network call from Luchot.

## 2. Decisions
- Sync goes through Android's CalendarContract via `expo-calendar`, not the Google Calendar API — because it needs no OAuth, no token, no Google app verification, and keeps "offline-first, no backend ever" intact (DECISIONS.md, 2026-11-01).
- .ics import is built as well — because export already exists and import is the missing half of Wave 4; it also covers users who do not run the Google Calendar app.
- `EventSchema.ts` is not changed; sync mapping lives in a new table — because the schema is locked and Google-compatible already.
- Order: SDK upgrade first, then .ics import, then device sync — because every new native module forces a full build, Play requires API 36 (SDK 51 cannot ship), and building native features on SDK 51 means redoing the build after the upgrade.
- Writes to Google go into an existing Google-account calendar the user picks — because a calendar Luchot creates itself is local-only (inference, verify on device in phase 3).

## 3. Constraints — VERBATIM
- Shlomo: "הייתי רוצה שיהיה את הבחירה לאנשים אם להתחבר ולסנכרן את הלוח הזה עם הלוח של גוגל כדי שגם יוכלו לייבא בקלות וגם לייצא"
- Shlomo's choice (2026-11-01): "יומן המכשיר + ייבוא ics"
- Google Play: new apps and updates must target "Android 16 (API level 36) or higher" (in effect since August 31, 2026).
- VISION.md: "Not an account-required app — ever. Even if sync is added later, it will be optional"
- VISION.md: "Not permission-hungry — only location (for zmanim) and notifications (for reminders)" — calendar permission is a deliberate exception, requested only when the user turns sync on.
- Shlomo (2026-11-03, approving the Phase 2–3 Figma frames): "אני מאשר את כל המסכים , הייתי רוצה שתשמור על רמת הפיקסלים בעיצוב" — the implementation must match the frames pixel for pixel; any deviation is listed in the PR (global CLAUDE.md, "Deviations").

## 4. Acceptance criteria
Phase 1 — Expo SDK upgrade (prerequisite for Play)
- [ ] Expo SDK ≥ 54, target SDK 36 — verified by: `npx expo config --type prebuild` shows `targetSdkVersion` 36 (or `expo-build-properties` value), and the built AAB's manifest
- [ ] `expo-sqlite/legacy` replaced by the current async API, `runExclusive` gate kept — verified by: `grep -r "expo-sqlite/legacy" src` returns nothing; typecheck green
- [ ] Existing installs keep their data — verified by: upgrade-scenario check on a device with v-current data (`docs/agentic/local-first.md`)
- [ ] `runtimeVersion` policy moved to `fingerprint` — verified by: `app.json`
- [ ] Gate — verified by: `npm run typecheck; if ($?) { npx expo-doctor }` and `npx expo export --platform android`

Phase 2 — .ics import
- [ ] User picks an .ics file (and can open one from another app via intent filter) — verified by: on-device test with a Google Calendar export
- [ ] VEVENTs map to `CalendarEvent` (all-day DTEND exclusive, timed with TZID, RRULE kept) — verified by: unit test over sample .ics fixtures
- [ ] Re-importing the same file creates no duplicates (UID match) — verified by: unit test + device test
- [ ] Preview screen before import (count, date range, skip duplicates) — verified by: screenshots 375/768/1280 next to the Figma frame

Phase 3 — Device calendar sync
- [ ] Sync is off by default; turning it on requests READ/WRITE_CALENDAR only then — verified by: fresh install shows no calendar permission prompt
- [ ] User picks which device calendars to show in Luchot and one Google calendar to write to — verified by: device test
- [ ] Events from chosen calendars appear in Luchot's month/day/week views — verified by: device test with an event created in Google Calendar
- [ ] Luchot create/edit/delete is reflected in the chosen Google calendar (after the Google app syncs) — verified by: device test + calendar.google.com
- [ ] Turning sync off stops all reads/writes and leaves Luchot's own data intact — verified by: device test
- [ ] Denied / permanently blocked permission handled with a clear state — verified by: device test
- [ ] `security-auditor` pass on the new permission and data path — verified by: its report
- [ ] Gate — verified by: `npm run typecheck; if ($?) { npx expo-doctor }` and `npx expo export --platform android`

Figma frames for Phases 2–3 (designed 2026-11-03, **approved by Shlomo 2026-11-03**, all screens; build them pixel for pixel).
File "Luchot — Design System & Screens", page `05 · Sync & Import (Phase 2–3)`. Base URL:
`https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=`
- [ ] Page (everything below) — [36-5](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=36-5)
- [ ] Phase 2 · .ics import, Light — [37-2](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=37-2) · Dark — [40-68](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=40-68)
  - A1 preview (file, count, date range, duplicates skipped, list preview, "ייבא 37 אירועים" / "ביטול") `37-3` · A2 parsing `37-97` · A3 empty file `37-120` · A4 everything already imported `37-146` · A5 invalid file `37-170` · A6 success `37-199`
- [ ] Phase 3 · sync settings inside Settings, Light — [38-2](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=38-2) · Dark — [40-293](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=40-293)
  - B1 sync off (default) + import entry `38-3` · B2 system permission dialog `38-66` · B3 sync on: calendars to show (multi) + calendar to write to (single) + "holidays are never written" (full scroll) `38-142` · B4 permission denied `38-254` · B5 permanently blocked → open system settings `38-328` · B6 no Google calendar on the device `38-405`
- [ ] Phase 3 · Google events vs Luchot events, Light — [39-2](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=39-2) · Dark — [39-369](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=39-369)
  - C1 month cell (outlined chip) `39-3` · C2 day list (outlined block + external-link icon + calendar name) `39-223` · C3 legend `40-2`
- [ ] Tablet 768 (A1, B3; light + dark) — [40-785](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=40-785)

## 5. Out of scope
- Google Calendar API, OAuth, any network client.
- iCloud / iOS calendar specifics beyond what `expo-calendar` gives for free (Android first).
- Changing `EventSchema.ts`.
- `@hebcal/core` v6 upgrade.
- Play Console account, privacy policy page, Data safety form (Shlomo's).

## 6. Open questions
Answered 2026-11-02. Shlomo chose "תצוגה חיה" for the first; for the rest he accepted the recommendations ("בשאר השאלות הפתוחות בתוכנית אלך עם ההמלצות שלי, אלא אם תגיד אחרת" — no objection).
- Reading Google events → **live overlay**: shown in Luchot's views, never copied into SQLite, edited in Google. — answered: Shlomo
- Writing Luchot events → **automatic** on every create/edit/delete once sync is on. — answered: recommendation accepted
- Which events go out → **personal events only**; hebcal holidays never. — answered: recommendation accepted
- Hebrew-date yearly events → **10 years ahead**, extended on app launch. — answered: recommendation accepted
- Settings screen and import preview are a new flow: Figma frames before UI code. — owner: agent designs, Shlomo approves

## 7. Independent parts
none — Phase 1 changes the native base and the SQLite layer every later phase builds on; Phase 3 reuses Phase 2's event mapping.

## 8. State at handoff
- Done so far: decision recorded (DECISIONS.md 2026-11-01), ROADMAP Wave 4 updated, this file.
- Last verification output: `npm run typecheck` → clean; `npx expo-doctor` → "17/17 checks passed. No issues detected!" (2026-10-28, before this docs change)
- Next step: answer the open questions in section 6, then start Phase 1 (SDK upgrade) on its own branch.
