# Security: `security-auditor` Configuration — MOBILE APP WITH LOCAL STORAGE

> Read this before app store submission, and for any task touching secure storage handling, sensitive data, app permissions or data export features.

- **Model:** Claude Opus.
- **Local-only profile focus:** sensitive data must be in
  `expo-secure-store`, never SQLite/AsyncStorage in plaintext; privacy
  nutrition label accuracy; telemetry/analytics PII exclusion.
- **Trigger conditions:** before app store submission, and on any change to
  secure storage handling, permissions, or data export features.
- See the full `security-auditor` agent definition for the complete
  methodology.
