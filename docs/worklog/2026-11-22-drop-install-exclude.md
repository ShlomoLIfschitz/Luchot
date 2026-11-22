## 2026-11-22 — Drop the stale expo.install.exclude; keyboard fix OTA path
### What was done
- PR #36 (keyboard covers Save) merged. PR #38 had already moved the 5 held-back expo-* packages to the current SDK 58 patches, so the `expo.install.exclude` added in #36 is stale; removed (it would hide future patch mismatches of those packages from expo-doctor).
- Side effect of #38: main's Android fingerprint is now `753ed38…`, not build 20's `77ff1c9…`. An OTA from main does not reach the testers on build 20.
- The keyboard fix reaches build 20 by an OTA published from `defaf5b` (the #36 branch tip, fingerprint `77ff1c9…`), from a separate worktree with that commit's own `node_modules`.
### Open issues / blocked
- Production OTA (Shlomo's step) not run yet.
### Next steps
- Next full build ships main as is (no exclude, current patches).
