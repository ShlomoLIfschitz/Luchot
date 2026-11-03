## 2026-11-03 — Distinct reminder sound (branch `feat/reminder-sound`)
### What was done
- Shlomo: in ring mode the reminder played the phone's default notification tone, the same as WhatsApp's ("עלול לבלבל"); chose "צליל ייחודי ל-Luchot".
- `assets/sounds/luchot_reminder.wav`: built from Shlomo's own whistle (WhatsApp voice note, 2026-11-03). Pitch-tracked into 7 notes (G#–A#–C–C#–C#–C–G#), quantized to semitones, one octave down (the whistle sat at 1.6–2.3 kHz), re-synthesized as an electronic pluck and time-compressed to 1.25 s at his request ("תקצר אותה לשניה וקצת"). Mono 16-bit 44.1 kHz. Render script: `scripts/make-reminder-sound.py` (reads the note list extracted from the recording; the recording itself is not committed).
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
