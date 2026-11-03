## 2026-11-03 — Figma: date converter screen (branch `claude/date-converter-figma`)
### What was done
- Shlomo asked for a date converter for "any date, even years back". He chose to put it in the hamburger drawer, with conversion in both directions only.
- Designed in Figma (no app code), page `05 · Sync & Import (Phase 2–3)`: D1 Gregorian→Hebrew, D2 Hebrew→Gregorian, D3 before 1582 with a note, D4 invalid year, D5 Hebrew month picker (leap year), D6 drawer with the new item. D1–D5 in dark as well; D1 also at tablet 768 in light and dark. New local component `converter/field`.
- Plan and frame links: `docs/handoffs/2026-11-03-date-converter.md`.
### Decisions made
- Year as a numeric input, with the gematria shown under it; day and month as pickers limited to valid values.
- "After sunset" switch for Gregorian→Hebrew; a note for dates before 1582 (proleptic Gregorian, to be verified).
### Open issues / blocked
- Approved 2026-11-03, Shlomo: "מאשר, תבנה".
### Next steps
- After approval: implement on `feat/date-converter` per the handoff.
