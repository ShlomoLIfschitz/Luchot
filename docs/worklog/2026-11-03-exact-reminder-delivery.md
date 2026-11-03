## 2026-11-03 — Reminders not delivered on the SDK 58 build (branch `fix/exact-reminder-delivery`)
### What was done
- Device test of preview build `b102a04a` (SDK 58.0.0, version code 11) by Shlomo: everything passed except a reminder, which was saved but never showed (no sound, nothing in the shade). Notes survived the upgrade.
- Cause (from expo-notifications native code, not device logs): no exact-alarm permission, so `ExpoSchedulingDelegate.setupAlarm` uses inexact `setAndAllowWhileIdle`, which Doze defers. Also no `channelId` on the trigger, so the fallback channel was used.
- Fix: `USE_EXACT_ALARM` in `app.json`; `channelId: 'default'` in `NotificationService.scheduleLocalNotification`. Orchestrator, directly.
### Decisions made
- DECISIONS.md 2026-11-03: USE_EXACT_ALARM (calendar-app exemption) + HIGH channel.
### Open issues / blocked
- Not verified on a device: needs a full EAS build (`app.json` changed).
- Play Console exact-alarm declaration (Shlomo's, at store submission).
- Reminders scheduled before this build stay on the fallback channel until rescheduled.
### Next steps
- Full preview build, reinstall over the current one, re-test a reminder 2–3 minutes ahead with the screen off.
