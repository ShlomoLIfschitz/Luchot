# Agents and Orchestration — Luchot

> Read this before delegating to a sub-agent, or when a task needs an agent not on the roster.

### 🧭 Orchestration Model

```
Shlomo — product decisions and the closed list of stops (global ~/.claude/CLAUDE.md)
   │
   └──> Claude Code (YOU) — plans, decides, delegates, verifies
            • Task spec: Shlomo's request, or a handoff file in docs/handoffs/
            • Delegates large or specialized work to sub-agents
            • Runs the Definition of Done gate, merges when every check passed
            • Reports to Shlomo in 3–5 lines
                │
                ├──> mobile-ui-builder    (UI, screens, RTL, components)
                ├──> local-data-builder   (SQLite access, hooks, schemas)
                ├──> database-architect   (schema, migrations on real devices)
                └──> [test-engineer, security-auditor — dormant, see roster]
```

**Your job (Claude Code):** You are the project-level architect and orchestrator. Decompose the task, delegate to the right sub-agents per the roster and ownership table below when the work is large or specialized, make small changes directly, integrate their output, run the DoD gate, and report. Work that continues in a new session goes into a handoff file (`docs/handoffs/_TEMPLATE.md`), not a pasted prompt.


### 🤖 Active Sub-Agent Roster

Sub-agents live in `~/.claude/agents/` (global). For **this project**, the active roster is:

| Agent | Status | Owns |
|---|---|---|
| `mobile-ui-builder` | ✅ Active | `app/`, `src/components/`, `src/hooks/` (UI hooks), `src/navigation/`, mobile config (`app.json`*, `metro.config.js`, `babel.config.js`) |
| `local-data-builder` | ✅ Active | `src/services/` (data access), `src/providers/` (Zustand stores), `src/schemas/`, data hooks |
| `database-architect` | ✅ Active | SQLite schema definitions, migration/upgrade logic, `docs/SCHEMA.md` |
| `test-engineer` | 💤 Dormant | `tests/`, `*.test.*` — **not active yet.** Activate only when the user decides to start writing tests (ROADMAP Phase 5+). Until then, do not invoke. |
| `security-auditor` | 🟡 On-trigger | READ-ONLY. Profile: `mobile-local-only`. Not a routine gate, but **auto-invoke** when a task adds a new OS permission, a new network call, or a new data export/import path — the three things that can actually change this app's privacy posture. Otherwise only on request. |

> **Everything else in the generic template roster is deliberately NOT active here** — `automation-engineer`, `notification-engineer`, `localization-engineer`, `content-manager`, `data-export-engineer`, `devops-engineer`, `analytics-engineer`, `error-monitoring-engineer`, `onboarding-engineer`, `performance-engineer`, `documentation-engineer`, `merge-coordinator`. Their concerns are folded into the three active builders (e.g. notifications and .ics export live in `local-data-builder`; Hebrew/RTL and copy live in `mobile-ui-builder`). This is a recorded choice, not an oversight — do not silently start dispatching them.

> *`app.json` and `eas.json` are sensitive (see Do-Not list). `mobile-ui-builder` may edit them when the task needs it; the report flags the edit, because it forces a full EAS build.*

❌ **Not for this project:** `web-ui-builder`, `api-builder`, `baas-integrator` (Luchot has no web target, no custom backend, no BaaS).

**Security profile:** `mobile-local-only`. No server-side checks. Focus areas if/when auditing: sensitive data never in AsyncStorage (it's plaintext), parameterized SQLite queries, privacy (no data leaves device), no accidental network calls.

