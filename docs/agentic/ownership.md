# Execution Sequence and Artifact Ownership — Luchot

> Read this before delegating, before fanning out work (file-overlap check), and when a Definition of Done command fails (to find the owner).

### 🔁 Execution Sequence (per feature)

When a task (Shlomo's request or a handoff file) describes a feature, follow this order. Skip stages that don't apply.

1. **Clarify** — If the task conflicts with a spec file or a locked decision, or needs a product decision → STOP and ask Shlomo. Other ambiguity (code or architecture): decide and report the decision in one line.
2. **Log** — Note the task as in-progress (mention in your plan; full entry goes to a new docs/worklog/ file at close).
3. **Schema layer** (if data model changes) → `database-architect`. Defines tables + **migration/upgrade logic that runs on app launch against real user data**. This is critical — there are real installs with real data.
4. **Schema/types (Zod + TS)** → `local-data-builder` defines/updates `src/schemas/`.
5. **Data layer** → `local-data-builder` — services, query helpers, hooks. Each result validated before reaching UI.
6. **UI** → `mobile-ui-builder` — screens/components, consuming types from `src/schemas/`. May start in parallel with step 7 once schemas are locked.
7. **Tests** → `test-engineer` — **dormant; skip unless activated.**
8. **Security review** → `security-auditor` — dormant; skip unless explicitly requested.
9. **Integration Gate** → YOU run the Definition of Done (below).
10. **Close** → write the docs/worklog/ entry file, docs/ROADMAP.md (if shifted), docs/DECISIONS.md (if a new architectural choice was made), then commit.

> Stages 3–5 are sequential (data shape must settle before consumers build on it). Stage 6 can overlap stage 5 only after the schema is locked.


### 📦 Artifact Ownership (prevents collisions)

| Owner | Owns (read + write) |
|---|---|
| `database-architect` | SQLite schema, migration/version logic, `docs/SCHEMA.md` |
| `local-data-builder` | `src/services/`, `src/providers/`, `src/schemas/`, data hooks, `docs/API.md` (data-layer hook docs) |
| `mobile-ui-builder` | `app/`, `src/components/`, `src/hooks/` (UI), `src/navigation/`, `src/constants/` (tokens — coordinate with docs/DESIGN.md) |
| `test-engineer` | `tests/`, `*.test.*` (dormant) |
| `security-auditor` | READ-ONLY |
| Claude Code (you, as orchestrator) | `docs/` (worklog/, ROADMAP, DECISIONS), `CLAUDE.md` |
| Sensitive (flag in the report: forces a full EAS build) | `app.json`, `eas.json`, `package.json` native deps, native config |

If a sub-agent needs to modify a file outside its ownership, it must STOP and report to you. You then re-delegate to the correct owner, or decide yourself and note it in the report.

**Resolving `src/hooks/` ownership (the split isn't always obvious):** Classify by the hook's PRIMARY purpose. If it primarily reads/writes storage or computes business logic (e.g. `useZmanim`, `useNotes`), it belongs to `local-data-builder`. If it primarily manages display state or user interaction (e.g. `useDatePicker`, animation/gesture hooks), it belongs to `mobile-ui-builder`. A hook that calls a service only to format output for one screen is a UI hook. When still genuinely ambiguous, the orchestrator (Claude Code) decides and notes the call in WORK_LOG — do not let two agents both edit the same hook.

