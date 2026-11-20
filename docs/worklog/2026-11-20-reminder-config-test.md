# 2026-11-20 Reminder config regression test

Retro item: ai-kit retro 2026-11-08 P3.

## Done
- `scripts/test-reminder-config.ts` (`npm run test:reminders`, node:test). It covers the 2026-11-03 fix where reminders were saved but never shown. Checks:
  - `app.json` asks for `USE_EXACT_ALARM`
  - the `scheduleLocalNotification` trigger sets `channelId: REMINDER_CHANNEL_ID`
  - `init()` creates that channel with HIGH importance and `REMINDER_SOUND`
  - the sound file is in the expo-notifications plugin `sounds`
- CI: a new "Script tests" step runs `test:ics`, `test:sync` and `test:reminders` on every PR. Until now they ran only by hand.

## Verification
- `npm run test:reminders` → pass 4, fail 0
- `npm run test:ics` → pass 32; `npm run test:sync` → pass 29
- Mutation check: removing `channelId` from the trigger → fail 1.
- `npm run typecheck` → exit 0 (no output).
