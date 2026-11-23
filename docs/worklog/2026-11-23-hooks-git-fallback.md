# 2026-11-23 Project hooks: stop-check git fallback; worklog correction

## Done
- `.claude/hooks/lib.js` and `stop-check.js` copied from ai-kit `main` (ai-kit#26, retro 2026-11-22 P1). A work log entry written outside Edit/Write now counts when git shows it.
- `2026-11-16-expo-sdk58-patches.md`: added a correction line. The config plugins were not reverted for good; `app.json` on `main` has them.

## Verification
- `stop-check.js` smoke run with no session changes → exit 0, no output.
- ai-kit `node hooks/test.js` → all passed (463 PASS).
