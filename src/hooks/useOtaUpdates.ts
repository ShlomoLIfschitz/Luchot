import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';
import { useModalStateStore } from '../providers/ModalStateProvider';

/**
 * Foreground OTA update check + safe same-session reload.
 *
 * `expo-updates` is configured with `checkAutomatically: "ON_LOAD"`, which
 * downloads a new bundle on cold start but only APPLIES it on the next cold
 * start. If the app just sits in the foreground/background across many
 * `eas update` publishes in a session, the user can go a long time running a
 * stale bundle with no way to tell. This hook re-checks (and re-fetches)
 * whenever the app returns to the foreground, so a new bundle is downloaded
 * as soon as possible rather than only at the next full app launch.
 *
 * Reload behavior (see docs/DECISIONS.md for the earlier deliberately-
 * conservative version of this hook that fetched but never reloaded): once a
 * bundle has been fetched, this hook calls `Updates.reloadAsync()` — but only
 * when ALL of the following hold, checked fresh at the moment of the attempt:
 *
 *   1. `useModalStateStore` reports no state-holding modal is open. Reloading
 *      discards all in-memory JS state; `NoteEditor` holds an unsaved draft
 *      (title, date, recurrence, reminder) in local component state, and
 *      sets this shared flag while it's open (see NoteEditor.tsx). If the
 *      flag is true, this hook skips the reload — the downloaded bundle
 *      stays on disk and still applies automatically on the next full
 *      relaunch via the existing ON_LOAD mechanism, exactly as before this
 *      hook could reload at all. Skipping a reload NEVER loses the update.
 *   2. The app is genuinely returning from background, not a transient
 *      `AppState` blip (a permission dialog, the notification shade, a
 *      share-sheet, etc.). `AppState` distinguishes 'inactive' (a
 *      transitional / overlay state) from 'background' (the app is no
 *      longer visible at all) — a blip typically only flickers through
 *      'inactive' and never truly reaches 'background'. So reload
 *      eligibility requires the PREVIOUS recorded state to have been
 *      literally 'background' (not merely 'inactive', which is still enough
 *      to trigger the check-and-fetch above — fetching is side-effect-free
 *      w.r.t. the running JS, so being lenient there is harmless). On top of
 *      that, the app must have dwelled in 'background' for at least
 *      `MIN_GENUINE_BACKGROUND_MS` before returning, as a second, cheap
 *      filter against same-frame OS state flicker around overlays on some
 *      OEM builds. Both conditions must hold — this deliberately does NOT
 *      reload on every 'active' transition.
 *   3. `__DEV__` is false and `Updates.isEnabled` is true (Metro owns
 *      reloading in development; the native module is absent in Expo Go /
 *      a build without it — both preserved from the original guards).
 *   4. This specific update id has not already triggered a reload this
 *      session (`reloadTriggeredForManifestId` below) — reloadAsync()
 *      restarts the whole app, so in practice this can't double-fire within
 *      one running JS instance, but it's cheap insurance against a retry
 *      landing in the brief window before the restart actually takes effect.
 *
 * If a reload is skipped for any reason, nothing is lost: `lastFetchedManifestId`
 * (the id of the most recently fetched-but-unapplied bundle) persists across
 * foreground events for the life of this JS instance, so the very next
 * genuine foreground return with no modal open will retry the reload for the
 * same pending update — and failing that, the existing ON_LOAD mechanism
 * still applies it on the next full relaunch.
 */

/** Minimum time (ms) the app must have dwelled in 'background' before a
 * return to 'active' is treated as a genuine foreground return eligible for
 * a reload, as opposed to an instantaneous OS state flicker. Small enough to
 * be invisible to a real backgrounding, large enough that a same-frame
 * flicker can't cross it. */
const MIN_GENUINE_BACKGROUND_MS = 1500;

/** Tracks the manifest id of the update we've already fetched, so a later
 * foreground event doesn't repeatedly re-download the same bundle before
 * the user relaunches the app (or before this hook reloads it). Also doubles
 * as "the id of the update currently pending application" for the reload
 * step below. */
let lastFetchedManifestId: string | null = null;
let checkInFlight = false;

/** Guards against attempting `reloadAsync()` twice for the same update id
 * (see point 4 above). */
let reloadTriggeredForManifestId: string | null = null;

async function checkAndFetchOnce(): Promise<void> {
  if (checkInFlight) return;
  checkInFlight = true;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return;

    const manifestId = result.manifest.id;
    if (manifestId === lastFetchedManifestId) return; // already downloaded, pending relaunch/reload

    const fetchResult = await Updates.fetchUpdateAsync();
    if (!fetchResult.isNew) return;

    lastFetchedManifestId = manifestId;
    // Visible, unobtrusive answer to "did my change land?" — check Metro /
    // device logs, or the running-bundle indicator on the About screen.
    console.log(
      `[useOtaUpdates] New OTA bundle downloaded (id=${manifestId}). ` +
        'It will reload automatically on the next safe foreground return ' +
        '(no modal open), or apply at the next full relaunch otherwise.',
    );
  } catch {
    // Silent by design. Luchot is offline-first: no network, a rate limit,
    // or a server hiccup during this check is the normal steady state, not
    // an error condition, and must never surface to the user or block the
    // app.
  } finally {
    checkInFlight = false;
  }
}

/**
 * Attempts to apply a previously-fetched, still-pending update. Safe to call
 * on every genuine foreground return regardless of whether THIS event fetched
 * anything new — `lastFetchedManifestId` may hold an update fetched during an
 * earlier foreground event that couldn't reload then (e.g. NoteEditor was
 * open). No-op if there's nothing pending, a modal is open, or this id
 * already triggered a reload.
 */
async function maybeReload(): Promise<void> {
  const pendingId = lastFetchedManifestId;
  if (pendingId === null) return; // nothing downloaded to apply
  if (pendingId === reloadTriggeredForManifestId) return; // already attempted for this id
  if (useModalStateStore.getState().isModalOpen) return; // unsafe — would discard in-memory state

  try {
    reloadTriggeredForManifestId = pendingId;
    await Updates.reloadAsync();
  } catch {
    // Silent by design, matching checkAndFetchOnce above. If the reload
    // itself fails, the bundle is still on disk and the existing ON_LOAD
    // mechanism applies it on the user's next full relaunch — this never
    // loses the update, and must never surface an error or crash the app.
  }
}

/**
 * Call once near the root of the app (see app/_layout.tsx). No-ops entirely
 * in development and in any environment where expo-updates is disabled
 * (Expo Go, or a build missing the native module) — both required guards
 * against dev noise and crashes.
 */
export function useOtaUpdates(): void {
  // AppState.currentState is typed string | null | undefined in RN 0.88.
  const appState = useRef<string | null | undefined>(AppState.currentState);
  // Timestamp of the most recent transition into 'background' (not
  // 'inactive' — see module doc, point 2). Null when not currently tracking
  // a background dwell (i.e. we're active, or the last transition out of
  // background already resolved).
  const backgroundedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (__DEV__) return; // Metro owns reloading during development
    if (!Updates.isEnabled) return; // Expo Go / build without the native module

    const subscription = AppState.addEventListener('change', (nextState) => {
      const prevState = appState.current;
      const cameToForeground =
        (prevState === 'background' || prevState === 'inactive') && nextState === 'active';

      if (nextState === 'background') {
        backgroundedAtRef.current = Date.now();
      }

      appState.current = nextState;

      if (!cameToForeground) return;

      // Reload eligibility is decided HERE, from prevState, before it's
      // overwritten by later events — a genuine return requires having
      // actually been 'background' (not just 'inactive'), for at least
      // MIN_GENUINE_BACKGROUND_MS.
      const backgroundedAt = backgroundedAtRef.current;
      const eligibleForReload =
        prevState === 'background' &&
        backgroundedAt !== null &&
        Date.now() - backgroundedAt >= MIN_GENUINE_BACKGROUND_MS;
      backgroundedAtRef.current = null;

      void checkAndFetchOnce().then(() => {
        if (eligibleForReload) {
          void maybeReload();
        }
      });
    });

    return () => subscription.remove();
  }, []);
}

/**
 * Bundle identity — surfaced on the About screen so "did my change actually
 * land?" is answerable without device logs.
 */
export function getRunningUpdateInfo(): {
  updateId: string | null;
  createdAt: Date | null;
  isEmbeddedLaunch: boolean;
} {
  return {
    updateId: Updates.updateId,
    createdAt: Updates.createdAt,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}
