## 2026-11-15 — Project hooks: stop-check checks the worktree a session edited (retro 2026-11-15 P1)

**Done**
- `.claude/hooks/lib.js`, `.claude/hooks/stop-check.js` copied from ai-kit `2645603` (ai-kit#21). Sessions working in `.claude/worktrees/<name>/` no longer get a false "No work log entry" reminder every turn, and now get a real "uncommitted" reminder for that worktree.

**Verification**
- ai-kit `node hooks/test.js` → all passed (433 PASS, 4 new worktree cases).
- In this repo: stop-check with a code file and an entry file changed in a worktree, both committed → no reminder (see PR body).

**State:** working
