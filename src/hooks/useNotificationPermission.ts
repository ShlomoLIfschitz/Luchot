// src/hooks/useNotificationPermission.ts
// UI hook — manages notification permission state for the settings screen.
// Branching logic: undetermined → OS prompt; granted or denied → the app's
// notification settings screen (an app cannot revoke its own permission, and
// the OS will not re-prompt after a denial).

import { useState, useEffect, useCallback } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import type { PermissionStatus } from 'expo-modules-core';
import { NotificationService } from '../services/NotificationService';

export interface NotificationPermissionHook {
  status: PermissionStatus | null; // null while loading
  isGranted: boolean;
  isDenied: boolean;
  isUndetermined: boolean;
  request: () => Promise<void>;
  refresh: () => Promise<void>;
}

/** Opens this app's notification settings; falls back to the app details screen. */
async function openNotificationSettings(): Promise<void> {
  const androidPackage = Constants.expoConfig?.android?.package;
  if (Platform.OS === 'android' && androidPackage) {
    try {
      await Linking.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
        { key: 'android.provider.extra.APP_PACKAGE', value: androidPackage },
      ]);
      return;
    } catch {
      // Some OEM builds lack this screen — fall through to app details.
    }
  }
  await Linking.openSettings();
}

export function useNotificationPermission(): NotificationPermissionHook {
  const [status, setStatus] = useState<PermissionStatus | null>(null);

  const refresh = useCallback(async () => {
    const current = await NotificationService.getPermissionStatus();
    setStatus(current);
  }, []);

  // Read current status on mount — no prompt — and again whenever the app
  // returns to the foreground (the user may have changed it in system settings).
  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    if (status === 'granted' || status === 'denied') {
      await openNotificationSettings();
    } else {
      // undetermined (or null while still loading) → ask the OS.
      await NotificationService.requestPermissions();
      // Re-read authoritative status; do not trust the requestPermissions return value.
      await refresh();
    }
  }, [status, refresh]);

  return {
    status,
    isGranted: status === 'granted',
    isDenied: status === 'denied',
    isUndetermined: status === 'undetermined',
    request,
    refresh,
  };
}
