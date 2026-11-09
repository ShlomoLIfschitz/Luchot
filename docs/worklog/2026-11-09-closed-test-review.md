## 2026-11-09 — Closed test sent to Google for review
### What was done
- Created the Play Console email list "Luchot testers" with the 12 addresses Shlomo sent, attached it to the Alpha (closed testing) track. Country: Israel (was already set).
- Shlomo approved ("כן, שלח"); sent the 13 pending changes (release 18 (1.0.0), testers, country, store listing, App content declarations) to Google for review. Publishing overview now shows "השינויים בבדיקה". Managed publishing is off, so the release goes live to testers as soon as Google approves.
### Decisions made
- Tester addresses are kept only in Play Console, not in the repo.
- The optional tester feedback URL/email field was left empty.
### Open issues / blocked
- Waiting on Google's review (usually up to 7 days, per the confirmation dialog).
- Exactly 12 testers, no buffer: anyone who opts out before 14 days must be replaced and the count restarts for the new tester.
### Next steps
- After approval: copy the opt-in link from Alpha → Testers and send it to the testers; 14 consecutive opted-in days, then apply for production access.
- Delete `C:\Users\shinl\Downloads\luchot-18.aab`; fix the privacy policy "בקצרה" summary sentence.
