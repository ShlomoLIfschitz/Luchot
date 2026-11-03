## 2026-11-03 — Distinct reminder sound (branch `feat/reminder-sound`)
### What was done
- Shlomo: in ring mode the reminder played the phone's default notification tone, the same as WhatsApp's ("עלול לבלבל"); chose "צליל ייחודי ל-Luchot".
- `assets/sounds/luchot_reminder.wav`: original two-note bell (G5 → C6, 1.6 s, mono 16-bit 44.1 kHz), synthesized by the orchestrator in Python, so no licensing.
- `app.json`: expo-notifications plugin bundles the sound. `NotificationService`: new HIGH channel `reminders` ("תזכורות") with the sound; all scheduled triggers use it. Old `default` channel left in place for notifications scheduled before this build.
- `docs/agentic/deploy.md`: OTA commands need `--environment` and `--platform android` (the documented command failed on 2026-11-03).
### Decisions made
- A new channel instead of changing `default`: Android channel sound is immutable after creation.
### Open issues / blocked
- Shlomo approves the sound before merge (product choice).
- Full EAS build needed (`app.json` + new native asset). Not verified on a device.
- Settings → notifications will show two categories ("Luchot" and "תזכורות") until old reminders have fired.
### Next steps
- After approval: merge, full preview build, test a new reminder in ring mode.
