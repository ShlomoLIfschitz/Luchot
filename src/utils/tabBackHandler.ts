// src/utils/tabBackHandler.ts
// Last-resort Android back handler for the tab group.
//
// BackHandler calls the NEWEST listener first. The navigation container
// subscribes in its own effect, which runs after every child effect, so a
// listener added by a screen or layout on mount always runs AFTER
// navigation's and never sees a back press the tabs would handle. This
// listener is added at module load instead (imported by app/_layout.tsx), so
// it is the OLDEST one and runs last: after the open drawer, open sheets and
// stack pops have all declined. The tabs use backBehavior="none", so
// navigation declines a back press that would only switch tabs.
// app/(tabs)/_layout.tsx installs the actual behaviour.

import { BackHandler } from 'react-native';

let handler: (() => boolean) | null = null;

export function setTabBackHandler(next: (() => boolean) | null): void {
  handler = next;
}

BackHandler.addEventListener('hardwareBackPress', () => (handler ? handler() : false));
