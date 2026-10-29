# Local-First Considerations (CRITICAL) — MOBILE APP WITH LOCAL STORAGE

> Read this before any schema change or migration, and when a task touches backup/restore, data loss on uninstall, export, multi-device/sync, or on-device storage growth.

### Data Migrations on Real Devices
- Users have existing data. Every schema change must handle upgrades.
- `database-architect` writes migration logic that runs on app launch.
- Test path: install old version → put data in → install new version →
  verify data still works.

### Backup & Restore
- iCloud / Google Backup includes app data by default. Is this OK for your
  privacy posture?
- For sensitive data: opt out of backup or encrypt.

### App Uninstall
- All local data is lost on uninstall. If unacceptable, user needs export
  feature → `data-export-engineer`.

### Multi-Device
- No remote backend → no sync → user data doesn't follow them across
  devices.
- If this is needed, plan for sync layer (separate decision, document in
  docs/DECISIONS.md).

### Storage Limits
- SQLite has no practical limit, but device storage does.
- Plan for cleanup of old data (e.g., archive after N days, max DB size).
