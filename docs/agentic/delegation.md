# Delegation Protocol — Luchot

> Read this when writing a delegation brief for a sub-agent.

### 🤝 Delegation Protocol

When dispatching a sub-agent, always provide four things:

1. **Context** — relevant locked decisions (from docs/DECISIONS.md) and current state (from WORK_LOG).
2. **Task** — specific and bounded ("add `useReminders(date)` hook returning Zod-validated rows"), not vague ("work on reminders").
3. **Contracts** — point to the exact schema/types in `src/schemas/` the agent must respect or produce.
4. **DoD for this task** — what output proves it's done.

Example:
> "local-data-builder: implement the reminders read layer.
> Context: offline-first, `expo-sqlite/legacy` API only (locked — see docs/DECISIONS.md). EventSchema stays Google-Calendar-compatible.
> Task: add `reminders` query helpers + `useReminders(date)` hook.
> Contracts: extend `src/schemas/` with a `ReminderSchema`; reuse EventSchema fields where they overlap.
> DoD: hook returns Zod-validated data, parameterized queries only, tsc green, works offline by definition."

**Standing rule for any settings-related delegation:** When briefing `local-data-builder` to add or change a persisted setting, the brief MUST state that the new field has to be wired in BOTH `save()` AND `loadFromStorage()` in StorageService. This is the `use24hTime` persistence bug — a setting wired in only one place silently fails to persist across restarts. It is not obvious from reading the code. Always call it out explicitly.

