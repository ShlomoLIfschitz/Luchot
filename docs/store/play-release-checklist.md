# Google Play release checklist — Luchot

Status as of 2026-11-03. Owner column: **S** = Shlomo (account, money, legal, store text), **C** = Claude (code, builds, drafts).
Facts marked *(verified)* were checked against Google's help pages on 2026-11-03; *(inference)* means not checked against the current policy text.

## 1. Account gates (S)
- [x] Personal Play Console account created (owner `shlomo.apps.dev@gmail.com`).
- [ ] Identity verification approved by Google.
- [ ] Contact phone verified (opens after identity verification).
- [ ] Device verified via the Play Console mobile app.
- [ ] Add the personal Google account as a user with Admin rights (Users and permissions).

## 2. Closed test (the long pole)
- [ ] (S) Collect 12+ testers: Gmail address + Android device each. *(verified: "At least 12 testers must be opted in", 14 consecutive days, opting out and back in restarts the count.)*
- [ ] (C) Production AAB: `eas build --platform android --profile production` (`eas.json` already builds `app-bundle`, `autoIncrement` on).
- [ ] (S) Create the app in Play Console, closed testing track, upload the AAB, add the testers list, send them the opt-in link.
- [ ] (S) After 14 days: apply for production access (Google asks questions about the test).

## 3. Permanent choices — decide once
- **Package name `app.luchot`** (`app.json`): cannot be changed after the first upload. Keep it unless there is a reason now.
- **Play App Signing:** Google holds the app signing key; EAS holds the upload key (`eas credentials`). Back up the EAS credentials.

## 4. Store listing (S writes, C can draft)
- [ ] App name (≤30 chars), short description (≤80), full description (≤4000), Hebrew as the default language. *(inference on limits)*
- [ ] App icon 512×512 PNG: export from `assets/icon.png` (1024×1024).
- [ ] Feature graphic 1024×500 PNG: does not exist yet.
- [ ] Phone screenshots, at least 2: from a device or emulator.
- [ ] Support email for the app (can differ from the developer email *(verified, Play Console signup screen)*).
- [ ] Privacy policy URL: `https://pricelog.fyi/he/luchot/privacy` (English: `/en/luchot/privacy`), live once ShlomoLIfschitz/pricelog.fyi#36 is merged. Source text: `docs/store/privacy-policy.md`; a change to one goes with a change to the other.

## 5. App content declarations (S answers, C drafts)
- [ ] Privacy policy URL (above).
- [ ] Ads: **No** (DECISIONS.md: no ads ever).
- [ ] App access: no login, everything available.
- [ ] Content rating questionnaire (IARC): calendar/utility, no user-generated content shared, no violence.
- [ ] Target audience: 18+ (or 13+ without children). Choosing an audience that includes children brings the Families policy.
- [ ] **Exact alarm declaration:** `USE_EXACT_ALARM` is declared (DECISIONS.md 2026-11-03). Play restricts it to apps whose core function is alarms or **calendar** *(inference: Luchot qualifies as a calendar app; the declaration form will ask)*.
- [ ] Data safety form: draft below.
- [ ] Financial features / health / news / government: none.

### Data safety draft *(inference, verify against the form's own definitions)*
| Data | Leaves the device? | Declare |
|---|---|---|
| Events, notes, reminders, settings | No | Not collected |
| Approximate location (rounded ~110 m to Nominatim, on user action) | Yes, to a third party | Collected, processed ephemerally, optional, purpose "App functionality"; decide on "shared" with the form's definitions |
| Precise location | No (only rounded coords leave) | Not collected *(check: the form may treat the GPS read itself as collection only if transmitted)* |
| Expo update check (app/OS version, random install ID) | Yes, to Expo | Check whether "Device or other IDs" applies |
| Encryption in transit | Nominatim and Expo use HTTPS | Yes |
| Deletion | Uninstall removes everything | No account, so no deletion request flow |

## 6. Tips via Play Billing (PR #18 decision, `feat/support-project`) — NOT in the first release
Shlomo, 2026-11-03: "בלי, בעדכון מאוחר". The first Play release ships without the tips screen, so the account stays non-monetizing. When tips ship in a later update:
- Add back a "supporting the project" section to the privacy policy (payment handled by Google Play, we receive no payment details) and a Purchases row to the Data safety form.
- Selling in-app products makes the account a **monetizing** account. The signup screen says: "If you choose to earn money, your full legal address will be shown publicly".
- Needs a Google Payments merchant profile linked to the Play Console, and the three products (`support_10`, `support_25`, `support_50`) created as managed products before the screen can load prices.
- Tax/VAT on the income in Israel: outside this checklist, ask an accountant.
