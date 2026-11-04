## 2026-11-04 — Open-source Luchot under GPL-3.0-or-later (branch `chore/open-source-gpl`)
### What was done
- Play Console: identity and contact phone verified, trader status declared non-trader, app created (`לוחות`, `app.luchot`, iw-IL, free).
- `LICENSE` (GPL-3.0 text), `package.json` `license` + `repository`, new `README.md` with the licence notice.
- `app/about.tsx`: "רישיון" section (GPL-3.0-or-later, link to the source), each credit shows its licence, OpenStreetMap (ODbL) credit added; the last credit row no longer draws a bottom border (`isLast` was never passed).
- DECISIONS.md: "Luchot is free software under GPL-3.0-or-later".
- History scan before going public: `git log --all -p` (70,239 lines) against key/token/private-key/phone patterns: 0 hits. The only personal data in history is the commit author email.
### Decisions made
- GPL-3.0-or-later, not GPL-2.0-only: hebcal allows "any later version", and GPL-2.0-only is incompatible with kosher-zmanim's LGPL-3.0.
### Open issues / blocked
- The repository is still private. Making it public is Shlomo's step (after this PR merges).
- About screen not checked on a device: no emulator or adb on this machine.
### Next steps
- Make the repo public, then production AAB for the closed testing track; Shlomo recruits 12 testers.
