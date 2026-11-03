## 2026-11-03 — .ics import, Phase 2 (branch `claude/ics-import-88978c`)
### What was done
- Phase 2 of `docs/handoffs/2026-11-01-device-calendar-sync.md`, built from the approved Figma frames (A1–A6 `37-3`…`37-199`, tablet `40-786`, Settings import row `38:58`).
- `database-architect`: v7 migration adds the `ics_imports` table (`source_key` → `event_id`) and an index. Purely additive: no change to `events` or to `EventSchema.ts`. Documented in `docs/SCHEMA.md`.
- `local-data-builder`:
  - `src/services/IcsParser.ts`: an in-repo RFC 5545 parser, no new dependency. It handles line folding, escaping, DATE vs DATE-TIME, TZID through luxon (including Windows zone names from Outlook), exclusive all-day DTEND, DURATION, RRULE kept as-is, and UID / RECURRENCE-ID. It also holds `toCalendarEvent` and `classifyDuplicates`.
  - `src/services/IcsImportService.ts`: read (5 MB cap), analyze, then import in a single transaction under `runExclusive`.
  - StorageService gains `saveImportedEvents`, `getImportedEventKeys` and `getExistingEventIds`. The INSERT is shared with `saveEvent` through `eventInsertArgs`.
- Tests: `scripts/test-ics-parser.ts` (node:test, `npm run test:ics`) over fixtures in `scripts/ics-fixtures/`: a Google Calendar export shape, Outlook with a Windows TZID, an empty calendar, not-a-calendar, and a Luchot export. 32/32 pass. `test-engineer` is dormant, so this is a script, not a framework.
- `mobile-ui-builder`:
  - `app/importIcs.tsx`: all six states.
  - `src/components/import/ImportEntryRow.tsx`, plus a section "ייבוא" in Settings (an edit of +7 lines).
  - `app/+native-intent.tsx`: a `content://` / `file://` URI → `/importIcs?uri=…`.
  - `app.json`: VIEW intent filter for `text/calendar`.
  - New dependency `expo-document-picker`.
- `security-auditor`: 0 critical/high/medium, 3 low, all fixed here:
  - the file size is checked before reading, also for `content://`;
  - `BROWSABLE` was removed from the intent filter;
  - the picker's cached copy is deleted once it has been read.
### Decisions made
- Simple RRULEs map to `recurrenceType`, which is the only thing Luchot expands: FREQ alone, or with BY* parts implied by DTSTART, and no INTERVAL>1, COUNT or UNTIL. Every other RRULE is stored and the event imports as one-off (first occurrence only).
- EXDATE is ignored. An override with RECURRENCE-ID imports as a separate one-off event. A moved occurrence of a recurring series can therefore appear twice.
- A duplicate is any of these: a UID (or UID|RECURRENCE-ID) whose mapped event still exists; a `<id>@luchot` UID of an existing event; any `@luchot-hebcal` UID (Luchot already shows holidays). After an imported event is deleted, the same file can import it again.
- The import entry lives only in Settings, as in frame B1. The drawer was never designed (open question 5 in the Figma worklog).
- Imported events get no reminders (VALARM is ignored). Their category is `note`, like a regular note.
### Open issues / blocked
- Not checked on a device and no screenshots: there is no emulator on this machine. Shlomo reviews screenshots at 375/768/1280 next to the frames before merge.
- A full EAS build is required: a new native dependency (`expo-document-picker`) and a new intent filter in `app.json`. An OTA does not cover them.
- Residual risk: when a `content://` provider reports no size, `available()` can under-report it. The guard on text length still applies after the read.
- Open question 3 from the Figma worklog (importing while sync is on) only matters in Phase 3.
### Next steps
- Full preview build, then on-device: import a real Google Calendar export, open an .ics from Gmail or Files, re-import and confirm 0 new events, check the screens against the frames.
- Phase 3 (device calendar sync).
