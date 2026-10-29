# Parallel Execution & Worktree Policy

> Read this before dispatching a task to more than one sub-agent, or opening parallel sessions.

Before dispatching a task to more than one sub-agent at the same time, decide
the execution mode. Do not default to parallel just because tasks are
unrelated in topic — check file overlap explicitly.

**Approval gate: parallel work runs only after Shlomo says yes.**

1. **Plan:** run the decision steps below and write down the parts, the agent for each, the files each one writes, whether it needs a worktree, and what could conflict.
2. **Propose:** show that plan in a few lines, with the cost: how many agents, and roughly how many times the tokens of doing it one after another.
3. **Ask:** "Run these in parallel, or one after another?" Dispatch only after a yes.

Exception: a single read-only search agent (no file writes, no worktree) doesn't need approval.

A common case to propose: end-of-task review run in parallel, with `security-auditor`, `test-engineer`, and `accessibility-auditor` for UI work. They are all read-only, so no worktree is needed, but the review still goes through this approval gate.

**Decision steps (run every time you're about to fan out work):**

1. **Check file overlap** — cross-reference the Artifact Ownership table
   (`docs/agentic/ownership.md`). Will two or more agents write to the same
   file or directory in this task?
2. **Check dependency** — does any agent need another agent's output
   (schema, contract, endpoint) before it can start?
3. **Choose the mode:**
   - **No overlap, no dependency → parallel, same session.** Dispatch
     normally; no worktree needed.
   - **No overlap, but dependency → sequential, same session.** Wait for
     the upstream agent's result before dispatching the downstream one.
   - **File overlap (with or without dependency) → separate git worktree
     per agent**, each on its own branch. Never let two agents write to the
     same file in the same working directory at the same time.
4. **On worktree completion** — once all worktree-isolated agents report
   done, dispatch `merge-coordinator` (if active for this project) to merge
   branches back and resolve conflicts. If `merge-coordinator` is not
   active, you (architect) perform the merge yourself before marking the
   task complete.

This check applies to sub-agents dispatched within the current session and
to any parallel sessions you open yourself.

## Luchot: dispatch discipline

Parallel dispatch works well here and is worth using for large tasks — the 2026-08-30 redesign ran seven agents across disjoint file sets. It requires discipline:

1. **Partition by FILE, never by concern.** Two agents both "doing RTL fixes" will collide; two agents owning disjoint file lists cannot. Give every agent an explicit ownership list AND an explicit do-NOT-touch list.
2. **Enumerate every file.** Files assigned to nobody silently keep their defects — the redesign left `MonthYearPicker`, three picker hooks, `NoteList`'s header and `CandleIcon` unassigned, and they had to be swept up afterwards. Before dispatching, list every file the task could plausibly touch and confirm each has exactly one owner.
3. **Freeze shared contracts up front.** When file A's owner consumes a type or prop interface from file B, state in *both* briefs that the interface is frozen (`NoteEditor.Props`, `ShabbatCard.Props`, existing `DayCell` props). Agents may ADD optional props; they may never remove or rename.
4. **Sequence anything that blocks.** Design tokens, schemas, and shared types must land BEFORE their consumers start, or every downstream agent invents its own.
5. **Expect cross-agent typecheck noise.** An agent running `tsc` mid-flight will see errors in files another agent is still writing. Tell each agent to report but never fix errors outside its ownership, and re-run the gate yourself once all agents are done.
6. **Verify the reports; don't trust them.** Agents describe their own work optimistically and occasionally inaccurately. Read the actual code for anything high-risk (`Drawer.tsx`'s locked constraints, geometry, hook ordering) rather than accepting a checklist. Both week-timeline bugs came from an agent that reported success in good faith.
7. **Push back on scope cuts.** An agent that drops functionality because it "wasn't in the design" or "lives in a folder I don't own" is describing a regression. Restore it or decide explicitly to defer it.

