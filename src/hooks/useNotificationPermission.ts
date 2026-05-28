// src/hooks/useNotificationPermission.ts
// UI hook — manages notification permission state for the settings screen.
// Branching logic: undetermined → OS prompt; denied → open Settings app.

import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
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

export function useNotificationPermission(): NotificationPermissionHook {
  const [status, setStatus] = useState<PermissionStatus | null>(null);

  const refresh = useCallback(async () => {
    const current = await NotificationService.getPermissionStatus();
    setStatus(current);
  }, []);

  // Read current status on mount — no prompt.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(async () => {
    if (status === 'denied') {
      // OS will not re-prompt after denial — send user to Settings app instead.
      await Linking.openSettings();
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
