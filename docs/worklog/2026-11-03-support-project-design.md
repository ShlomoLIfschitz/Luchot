## 2026-11-03 — "Support the project" design (branch `docs/support-project`)
### What was done
- Shlomo asked about a bottom banner ad; ads rejected (VISION, network, tracking). He accepted "תמיכה בפרויקט" and chose Google Play Billing.
- Checked Play's Payments policy: the only donation exemption is "tax exempt donations", so an external tip link is risky.
- Figma frames E1–E4 (light), E2–E4 (dark), E2 tablet 768, and the `support/amount` component. Links in `docs/handoffs/2026-11-03-support-project.md`.
### Decisions made
- DECISIONS.md, 2026-11-03: one-time tips via Play Billing, no ads, nothing unlocked.
- No dark drawer frame: the file has none for the drawer (D6 is light only, not variable-bound).
### Open issues / blocked
- Shlomo approves the frames, the copy and the amounts before any code.
- Shlomo: Play Console payments profile + three in-app products.
### Next steps
- After approval: pick the IAP library (verify SDK 58 support), implement per the handoff.
