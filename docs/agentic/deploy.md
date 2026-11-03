# Deploy

> Read this before any task that touches CI, hosting config, environment variables or the release path. `/ai-workflow-setup` fills in the table from discovery; Shlomo reviews it.

## The rule

A production deploy happens only through a merge to the default branch that Shlomo approved (when the host auto-deploys it) or Shlomo's manual trigger. An agent never deploys directly. The guard blocks `gh workflow run`, `gh secret set` and direct deploy-hook calls; `vercel --prod` and `eas submit` were already blocked.

Merges: run `gh pr checks <n>`; when every check passed, Claude merges and says "checks passed". The guard blocks a merge with any check not passed, and decides per repo from `~/.claude/guard-merge.json`: `deployOnMerge` (a merge to the default branch deploys production) and unknown repos show Shlomo a one-click card; `free` repos merge with no card. This repo is: `free` (a merge to `main` deploys nothing; releases are manual `eas` commands).

## This project

| Question | Answer |
|---|---|
| Host | EAS (Expo Application Services). No web host, no backend. |
| What deploys production | Nothing on merge. Releases are manual: JS-only changes ship as an OTA update, `eas update --branch preview --environment preview --platform android --message "..."` (or `--branch production --environment production` for release; without `--platform android` the export also builds web and fails, and `--non-interactive` requires `--environment`); native changes (new native packages, `app.json` changes, new permissions, a `runtimeVersion` move) need a full `eas build --profile preview` (or `production`). Only Shlomo uses the `preview` APK, so a `preview` OTA is not a production deploy. |
| Does it run before or after CI? | Manual, after the PR is merged with CI green. Before any `eas build`, run `npx expo export --platform android` locally (see `docs/agentic/integration-checks.md`). |
| Previews | The `preview` channel / profile (internal APK distribution). |
| DB migrations on deploy | None on a server. SQLite upgrade logic runs on app launch on the device (see `docs/agentic/local-first.md`). |
| OTA config | `expo-updates`, URL `https://u.expo.dev/73dcf406-9cd1-4bec-a83c-cde688268f4a` in `app.json`; `runtimeVersion` policy `fingerprint` (since the SDK 58 upgrade, 2026-11-02); `checkAutomatically: ON_LOAD`. Channels: `preview` → preview profile, `production` → production profile (`eas.json`). |
| Secrets live in | EAS (Expo account login). No app secrets: offline-first, no API keys. Nothing in GitHub. |
| Rollback | OTA: republish the previous update to the branch (`eas update:republish`), or publish a revert. Build: reinstall the previous APK/AAB. |
| CI workflow | `.github/workflows/ci.yml` (typecheck, expo-doctor, `expo export --platform android`; no secrets) |
| Branch protection | Private repo on GitHub Free: not available (API returns 403). Gate = the guard + `gh pr checks` before merge. |
| Guard | Blocks `eas update --branch production` and `eas submit` (Shlomo's). `eas update --branch preview` and `eas build --profile preview` are allowed. |

## Play Store release

Once the app is on Google Play, the `production` channel is real users, and their device holds the only copy of their data (offline-first, no backend, no backup).

**Release order (every step after the merge is Shlomo's; the guard blocks `eas submit` and `eas update --branch production`):**
1. The PR is merged with every check green.
2. Upgrade-scenario check on a device with existing data (`docs/agentic/local-first.md`): the migration applies cleanly and no data is lost. Mandatory for every production release, not only schema changes.
3. A full build: `eas build --profile production` (Android App Bundle, `autoIncrement`).
4. `eas submit --profile production` to the Play Console track.
5. Later JS-only fixes: `eas update --branch production --environment production --platform android --message "..."`, only for builds that share the current `runtimeVersion`.

**`runtimeVersion`:** the policy is `fingerprint` (it was `sdkVersion` until 2026-11-02). The runtime version is a hash of the native project, so a new native dependency, an `app.json` change or a native config change produces a new runtime version and an OTA no longer reaches older builds — the crash-on-launch trap of `sdkVersion` is closed. After any of those, the next production release is still a full build (step 3); run `npx expo-updates fingerprint:generate` to see whether the runtime version moved.

**Store requirements (Shlomo's, outside the code):** a privacy policy URL, the Play Console Data safety form, and the exact-alarm declaration (App content → Sensitive app permissions: `USE_EXACT_ALARM`, use case "calendar app" — event, Omer and candle-lighting reminders must fire on time). Inference, not verified against the current Play policy text: both are needed because the app requests location and sends rounded coordinates to Nominatim (`src/utils/reverseGeocode.ts`).

## Open gaps

- None blocking. A production release (`eas update --branch production`, `eas build --profile production`, `eas submit`) is Shlomo's step.
