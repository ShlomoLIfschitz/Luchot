## 2026-11-05 — Play Console App content declarations
### What was done
- Filled and saved 9 of the 10 App content declarations in Play Console (Claude in Chrome): privacy policy, ads, app access, advertising ID, government, financial, health, target audience, content rating. Answers are recorded in `docs/store/play-release-checklist.md` section 5.
- Content rating result: ESRB Everyone, PEGI 3, USK 0, IARC 3+. Shlomo approved accepting the IARC terms ("כן, מלא").
### Decisions made
- Target audience 13+ (13-15, 16-17, 18+), to stay out of the Families policy.
- App access "no restricted parts": Google sync goes through the device calendar, no sign-in.
### Open issues / blocked
- Data safety waits for PR #22 (calendar permission changes the answers).
- Exact alarm declaration is not offered yet; expected after the first AAB upload.
- App category and store contact details not filled yet.
### Next steps
- Category and contact details; then PR #22, the production AAB and the closed test.
- When tips ship: redo the content rating ("digital purchases" = Yes) and the financial features answer if Play asks.
