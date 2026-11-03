# Handoff: Hebrew/Gregorian date converter

## 1. Goal
A converter screen, opened from the hamburger drawer, that turns any Gregorian date into a Hebrew date and any Hebrew date into a Gregorian one, including dates far in the past.

## 2. Decisions
- A stack route opened from the drawer (`app/converter.tsx`), not a tab. Shlomo chose this, and there are 4 bottom tabs, a locked decision.
- The screen does conversion only: no "open this day in the calendar" and no "add a yahrzeit". Shlomo chose this.
- Day and month are pickers. The year is a numeric text input, because a picker covering thousands of years is unusable. A Hebrew year is typed as a number (5559), and the gematria (ה׳תקנ״ט) is shown under the fields.
- Gregorian → Hebrew has an "after sunset" switch, because the Hebrew day starts at sunset and a birth or death in the evening otherwise converts to the wrong date. Hebrew → Gregorian instead says, in the result, on which evening the Hebrew day begins.
- Dates before 1582 show a note. @hebcal/core and JS `Date` calculate those dates on the proleptic Gregorian calendar, while sources from that period used the Julian calendar. This is an inference from how the library works: check it during implementation (see 6).
- The Hebrew month picker lists the months of the selected year: אדר א׳ and אדר ב׳ in a leap year, and only אדר otherwise. The day picker offers only the days that exist in that month and year (29 or 30, and 28 to 31 in Gregorian months), so an impossible day cannot be picked.
- New local Figma component `converter/field` (label + 48 px box, `Chevron` boolean). In code: one shared component for the three fields.

## 3. Constraints — VERBATIM
- Shlomo: "האם אפשר לייצר מחשבון המרה לתאריכים? מכל תאריך שהוא אפילו שנים אחורה"
- Shlomo (2026-11-03): "יושב בתפריט המבורגר ורק מציג המרה בשני הכיוונים"
- Shlomo (2026-11-03, approving the Phase 2–3 frames, a standing rule): "הייתי רוצה שתשמור על רמת הפיקסלים בעיצוב". Build the approved frames pixel for pixel, and list any deviation in the PR.

## 4. Figma frames (designed 2026-11-03, **waiting for Shlomo's approval**)
File "Luchot — Design System & Screens", page `05 · Sync & Import (Phase 2–3)`. Base URL:
`https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=`
- [ ] Light section — [52-3](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=52-3)
  - D1 Gregorian → Hebrew (14 May 1948 → ה׳ באייר תש״ח) — 52-10
  - D2 Hebrew → Gregorian (י״ט כסלו 5559 → 27 November 1798) — 52-74
  - D3 date before 1582 with the note (1 January 1200 → ה׳ בטבת ד׳תתק״ס) — 52-123
  - D4 invalid year (error state, empty result) — 52-195
  - D5 Hebrew month picker sheet, leap year — 53-58
  - D6 drawer with the new item "ממיר תאריכים" after "לימוד יומי" — 53-150
- [ ] Dark section (D1–D5) — [53-442](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=53-442)
- [ ] Tablet 768, light + dark, content column capped at 560 — [53-1000](https://www.figma.com/design/yFaCDCb17k2BVTGLzwj64a/Luchot-%E2%80%94-Design-System---Screens?node-id=53-1000)
- Component `converter/field` — 52-4

The example results in the frames come from @hebcal/core in this repo (run on 2026-11-03).

## 5. Acceptance criteria
- [ ] Drawer item "ממיר תאריכים" opens the screen — verified by: tap on a device or emulator, screenshot
- [ ] 14/5/1948 → ה׳ באייר תש״ח; with "after sunset" on → ו׳ באייר תש״ח — verified by: manual check on the screen
- [ ] י״ט כסלו 5559 → 27 November 1798 — verified by: manual check on the screen
- [ ] The month list follows the year: אדר א׳/ב׳ in 5559, only אדר in 5558 — verified by: manual check on the screen
- [ ] Year 0 or empty → error state D4, no crash; years 1–99 do not jump to 1900–1999 — verified by: manual check on the screen
- [ ] Note D3 is shown only for dates before 1582 — verified by: manual check on the screen
- [ ] Screenshots at 375/768/1280 next to the frames — verified by: screenshots in the PR
- [ ] DoD — verified by: `npm run typecheck; if ($?) { npx expo-doctor }`

## 6. Open questions
- Is the proleptic-Gregorian behaviour before 1582 confirmed in @hebcal/core 5.x (greg.ts) and in Hermes' `Date`? If not, the note's wording changes. — owner: agent
- In the Figma file the drawer has fewer items than the code. In the code the item goes after "פרטי לימוד". — owner: agent
- The dark drawer frame is not drawn: the source drawer frame uses hardcoded light colours. — owner: agent (no app impact)

## 7. Independent parts
none (one screen plus one drawer line)

## 8. State at handoff
- Done so far: Figma frames only (this branch, docs). No app code.
- Last verification output: none (docs only)
- Next step: after Shlomo approves the frames, implement on a new branch `feat/date-converter`.
