## 2026-11-03 — Figma: .ics import + Google Calendar sync screens (branch `claude/design-sync-screens-ef80e2`)
### What was done
- Designed in Figma (no app code) the flows for Phases 2–3 of `docs/handoffs/2026-11-01-device-calendar-sync.md`, on a new page `05 · Sync & Import (Phase 2–3)` of "Luchot — Design System & Screens". Frame links are in the handoff, section 4.
- Phase 2, .ics import: A1 preview, A2 parsing, A3 empty file, A4 all events already exist, A5 invalid file, A6 success.
- Phase 3, sync settings as a section inside Settings: B1 off (default), B2 system permission dialog, B3 on (calendars to show, calendar to write to, "holidays are never written" note), B4 permission denied, B5 permanently blocked, B6 no Google calendar on the device.
- Google events vs Luchot events: C1 month (outlined chip), C2 day list (outlined block + external-link icon + calendar name), C3 legend.
- Every frame comes in light and dark. A1 and B3 also have 768 px tablet versions where the content column is capped at 560 px.
- New frames bind to the file's color variables, and dark mode is the same frame with the Dark variable mode. C1/C2 are clones of the existing month and day screens with the overlay added.
- Added three variables to the Figma `Color` collection to mirror tokens already in DESIGN.md/code: `state/successBg`, `state/warningBg`, `state/errorBg`.
### Decisions made
- Google events are drawn as an outline with no fill and secondary text, while Luchot events keep their full colour. This is distinct without adding any new token.
- The sync controls sit inline in Settings (section "יומן גוגל"), like the existing candle-lighting toggle, not on a separate screen.
- Write target defaults to the account's primary calendar. The write list shows only Google-account calendars; device-local calendars can be shown but not written to.
- Google's own "Holidays in Israel" calendar is unchecked by default, with a hint that Luchot already shows holidays.
- Card radius 14 follows the existing Figma screens (DESIGN.md says `lg` 12).
### Open issues / blocked
- Approved 2026-11-03: Shlomo: "אני מאשר את כל המסכים , הייתי רוצה שתשמור על רמת הפיקסלים בעיצוב". The implementation matches the frames pixel for pixel.
- Approving the screens settles question 1 (neutral outline, as drawn). Questions 2–5 are not visible in the frames and stay open, for Shlomo:
  1. (Settled by the approval: neutral outline.) Google event colour: neutral outline (designed) or the calendar's own colour from the device (data colour, not a token)?
  2. Tapping a Google event: open it in the Google Calendar app (proposed) or a read-only detail sheet in Luchot?
  3. .ics import while sync is on: imported events become personal events and are auto-written to Google. If the file came from Google, that duplicates them there. Warn, don't write imported events, or write anyway?
  4. Turning sync off: events Luchot already wrote to Google stay there (assumed) or are removed?
  5. Drawer entry "ייבוא מקובץ" next to "ייצוא יומן": not drawn; confirm it goes there.
### Next steps
- After approval: Phase 2 (.ics import) on its own branch, then Phase 3; screenshots at 375/768/1280 next to these frames.
