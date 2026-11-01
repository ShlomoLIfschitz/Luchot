## 2026-11-02 — Work log: one file per task (branch `chore/worklog-per-file`)
### What was done
- `.claude/workflow.json`: `workLogDir: docs/worklog`. `docs/WORK_LOG.md` stays as the frozen archive (and the fallback while the folder is empty); not edited.
- `.claude/hooks/*` refreshed from ai-kit (ai-kit#20): stop-check accepts a new file in `docs/worklog/`, session-context reads the newest one.
- `docs/worklog/_TEMPLATE.md` in Luchot's entry format; `CLAUDE.md`, `docs/agentic/state.md`, `ownership.md`, `delegation.md`, `integration-checks.md` point to the folder.
### Decisions made
- A shared log file made every pair of open branches conflict, and the conflict re-ran CI before each merge. One file per task removes it.
### Open issues / blocked
- None.
### Next steps
- None from this change.
