## 2026-11-03 — Play Store preparation (branch `docs/play-store-prep`)
### What was done
- Shlomo opened a personal Play Console account (owner `shlomo.apps.dev@gmail.com`); identity verification pending at Google.
- `docs/store/privacy-policy.md`: Hebrew + English draft, written from the code (local SQLite, location/notification/exact-alarm permissions, rounded coords to Nominatim, Expo update check, Play Billing tips, .ics import/export).
- `docs/store/play-release-checklist.md`: account gates, closed test (12 testers × 14 days), permanent choices, store listing, content declarations, a Data safety draft, and the monetization impact of the tips screen.
### Decisions made
- The privacy policy names the Expo update check as a network call: `app.json` has `updates.checkAutomatically: ON_LOAD`, which `reverseGeocode.ts`'s "ONLY network call" comment does not cover.
- First Play release ships without the tips screen. Shlomo: "בלי, בעדכון מאוחר" (keeps the account non-monetizing, so his full address is not public).
### Open issues / blocked
- Privacy policy needs a public URL (repo is private). Hosting choice is Shlomo's.
- Policy text and Data safety answers need Shlomo's approval; Data safety rows are inference until checked against the form.
- Tips (`feat/support-project`, PR #18) must not reach `main` before the first Play release is out, or the release becomes monetizing.
### Next steps
- Host the policy, collect 12 testers, production AAB build for the closed testing track.
