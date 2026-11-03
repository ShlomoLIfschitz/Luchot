## 2026-11-03 — Notification permission row did nothing (branch `fix/notification-settings-row`)
### What was done
- Device report (build 12): the reminder now arrives on time; with the phone on vibrate there was no sound, and in ring mode it played the phone's default notification tone (same as WhatsApp's on Shlomo's phone). Tapping "הרשאת התראות" in Settings changed nothing and stayed "מופעל".
- Cause: when permission is already granted, `useNotificationPermission.request()` re-requested it, which is a no-op; an app cannot revoke its own permission.
- Fix: granted or denied → open the app's notification settings (`APP_NOTIFICATION_SETTINGS`, fallback `Linking.openSettings()`); status refreshes when the app returns to the foreground. JS-only, OTA-deliverable. Orchestrator, directly.
### Decisions made
- None architectural.
### Open issues / blocked
- Distinct reminder sound (vs the default notification tone): a product choice for Shlomo; needs a new channel + bundled sound + full build.
### Next steps
- `eas update --branch preview` after merge; Shlomo checks the row opens Luchot's notification settings.
