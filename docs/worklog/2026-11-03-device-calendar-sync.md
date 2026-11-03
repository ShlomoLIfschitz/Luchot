## 2026-11-03 — Device calendar sync (handoff 2026-11-01, Phase 3)
### What was done
- `expo-calendar` ~58.0.6 added (`npx expo install`); READ/WRITE_CALENDAR in `app.json` (+ the `expo-calendar` plugin). Native: full EAS build.
- Schema v8 (additive): `device_sync_map` (Luchot id ↔ device event id). StorageService accessors.
- `src/services/DeviceSyncPlan.ts` (pure, Node-tested): Luchot event → device events, 10-year Hebrew-date expansion, diff against the map, device occurrence → Phase 2 `.ics` shape.
- `src/services/DeviceCalendarService.ts`: permission state, device calendars, live overlay (never stored). `src/services/DeviceSyncService.ts`: write-through on create/edit/delete (useNotes), launch re-sync (`_layout`).
- Settings section per Figma B1/B3–B6 (`src/components/sync/SyncSettingsSection.tsx`); overlay styling per C1/C2 in DayCell, day view (hourly + all-day list) and the week timeline.
- Tests: `npm run test:sync` (25 pass); `npm run test:ics` still 32 pass.
### Decisions made
- DECISIONS.md 2026-11-03 "Device calendar sync: how Luchot events are written".
### Open issues / blocked
- Device test by Shlomo on the preview build (checklist in the PR). No screenshots yet: the screens need the native module (preview APK).
- Product question for Shlomo: push existing events when sync is first turned on? Today only events created/edited/deleted afterwards are written (matches the B3 copy).
- C3 (legend, 40:2) is an explainer panel without a phone frame; not built as an in-app screen (see PR).
- `security-auditor` pass pending Shlomo's activation.
### Next steps
- After the device test: fix findings, take 375/768/1280 screenshots next to B1/B3–B6 and C1/C2, then merge.
