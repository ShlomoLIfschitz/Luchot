# State Discipline and Project Structure — Luchot

> Read this when writing a work log or DECISIONS entry, at session close, or when looking for where a file belongs.

### 📝 State Discipline (docs mapping)

Luchot keeps its own doc set — **do not** introduce a PROGRESS doc (that is a generic-template name). The mapping is:

- **`docs/worklog/`** — the "what happened" record: one new file per task, `YYYY-MM-DD-<topic>.md`, written at close. Never edit another task's file. `docs/WORK_LOG.md` is the archive (most-recent-first, frozen on 2026-11-02): read it, never append to it.
- **`docs/ROADMAP.md`** — phases and backlog. Update when a phase closes or priorities shift.
- **`docs/DECISIONS.md`** — locked architectural decisions with rationale. Append whenever a non-trivial architectural choice is made. Format:
  ```markdown
  ## [Decision title]
  - Date: YYYY-MM-DD
  - Context: [why this came up]
  - Choice: [what we picked]
  - Alternatives considered: [what we rejected and why]
  - Implications: [what this affects]
  ```
- **`docs/SCHEMA.md`** — human-readable DB schema (owned by `database-architect`).
- **`docs/API.md`** — data-layer hook documentation (owned by `local-data-builder`; "API" here means the internal data hooks, since there is no network API).

Work log entry format (unchanged; also in `docs/worklog/_TEMPLATE.md`):
```markdown
## [YYYY-MM-DD]
### What was done
- <bullets, including which sub-agent did what>
### Decisions made
- <decisions affecting future work; cross-reference docs/DECISIONS.md if architectural>
### Open issues / blocked
- <in-progress or stuck>
### Next steps
- <next session>
```


### 📁 Project Structure

```
luchot/
├── app/                          # Expo Router screens (routes)  [mobile-ui-builder]
│   ├── _layout.tsx               # Root layout, providers init
│   └── (tabs)/                   # Tab navigator group
│       ├── _layout.tsx           # Tab bar config
│       ├── index.tsx             # Hebrew calendar (default)
│       ├── gregorian.tsx         # Gregorian calendar
│       ├── day.tsx               # Day view
│       ├── zmanim.tsx            # Zmanim view
│       └── settings.tsx          # Settings (hamburger access)
│
├── src/
│   ├── components/               # [mobile-ui-builder]  calendar/ notes/ zmanim/ ui/
│   ├── constants/                # [mobile-ui-builder]  colors.ts typography.ts spacing.ts config.ts  (mirror docs/DESIGN.md)
│   ├── hooks/                    # UI hooks [mobile-ui-builder]; data hooks [local-data-builder]
│   ├── providers/                # [local-data-builder]  Zustand stores (Calendar, Settings, Location)
│   ├── schemas/                  # [local-data-builder]  TS types + Zod (EventSchema, ...)
│   ├── services/                 # [local-data-builder]  DateService, ZmanimService, StorageService
│   └── utils/                    # helpers (dateUtils, hebrewUtils)
│
├── docs/                         # [Claude Code orchestrator]  all .md docs live here
│   ├── VISION.md  SCREENS.md  DESIGN.md      (stable specs)
│   ├── ROADMAP.md  WORK_LOG.md               (living state)
│   └── DECISIONS.md  SCHEMA.md  API.md       (DECISIONS new; SCHEMA/API as needed)
├── CLAUDE.md                     # This file (project root)
├── eas.json                      # ⚠️ sensitive — ask before edit
├── app.json                      # ⚠️ sensitive — ask before edit
└── package.json
```


### 📝 End-of-Session Checklist

1. `npm run typecheck` — fix any errors; never end with broken types.
2. Write the `docs/worklog/` entry file (format above), noting which sub-agents did what.
3. Update `docs/ROADMAP.md` if anything shifted.
4. Append to `docs/DECISIONS.md` if a new architectural choice was made.
5. Commit on the task branch, push it (`git push -u origin <branch>`) and open or update the PR. Never push to `main`.
6. Report to user (3–5 lines): what changed, the PR, sub-agents used, open items.

