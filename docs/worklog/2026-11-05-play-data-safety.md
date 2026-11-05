## 2026-11-05 — Play Console Data safety form and privacy policy update
### What was done
- Filled and saved the Data safety form in Play Console (Claude in Chrome), with the answers Shlomo approved ("Yes, fill it"). Answers are recorded in `docs/store/play-release-checklist.md` section 5.
- Opened ShlomoLIfschitz/pricelog.fyi#38: the live Luchot privacy policy (Hebrew and English) gains the calendar (read and write) permission, mirroring `docs/store/privacy-policy.md`.
- Started the production AAB: `eas build --platform android --profile production` (versionCode 18), after typecheck, `expo-doctor` 20/20 and `expo export --platform android` passed on main.
### Decisions made
- Device or other IDs declared as collected (the Expo update check sends a random install ID), not ephemeral, required: the conservative reading.
- Approximate location: collected, not shared, because the transfer to Nominatim is user-initiated.
### Open issues / blocked
- pricelog.fyi#38 waits for Shlomo's merge (deploys pricelog.fyi to production).
- The privacy policy summary says everything stays only on the device; with Google sync on, personal events are written to a Google calendar. Same sentence in the repo and on the live page.
- Exact alarm declaration: expected after the AAB upload.
### Next steps
- Upload the AAB to the closed testing track, then the exact alarm declaration, then 12 testers for 14 days.
