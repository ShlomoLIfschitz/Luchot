// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HDate } from '@hebcal/core';
import { StorageService } from './StorageService';
import { getOmerForDate } from './DateService';

export class NotificationService {
  static async init(): Promise<void> {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Luchot',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4A90D9',
      });
    }
  }

  static async requestPermissions(): Promise<boolean> {
    const result = await Notifications.requestPermissionsAsync();
    return result.granted;
  }

  /**
   * Returns the current notification permission status without prompting the user.
   */
  static async getPermissionStatus(): Promise<Notifications.PermissionStatus> {
    const result = await Notifications.getPermissionsAsync();
    return result.status;
  }

  /**
   * Schedules a single local notification at the given date.
   * Returns the notification identifier (equals params.id).
   */
  static async scheduleLocalNotification(params: {
    id: string;
    title: string;
    body: string;
    triggerDate: Date;
    data?: Record<string, unknown>;
  }): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      identifier: params.id,
      content: {
        title: params.title,
        body: params.body,
        data: params.data ? { ...params.data } : undefined,
      },
      trigger: { date: params.triggerDate },
    });
  }

  /**
   * Cancels a single scheduled notification by its identifier.
   */
  static async cancelNotification(id: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  /**
   * Cancels all scheduled notifications.
   */
  static async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Returns all currently scheduled notifications.
   */
  static async getScheduled(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Sweep-on-init model: on each app start, ensure the next occurrence of every
   * recurring reminder is scheduled. No on-delivery rescheduling — this sweep
   * fills any gap left by cancellation, timezone shifts, or first-run.
   * Recurring event IDs are owned solely by this method; saveNote does NOT
   * schedule recurring reminders to prevent double-schedule / stale-date collisions.
   */
  static async ensureAnnualReminders(): Promise<void> {
    const events = await StorageService.getEventsWithReminders();
    const recurring = events.filter(e =>
      e.hebrewExtensions.recurrenceType === 'yearly_hebrew' ||
      e.hebrewExtensions.recurrenceType === 'yearly_gregorian',
    );

    const scheduled = await NotificationService.getScheduled();
    const scheduledIds = new Set(scheduled.map(n => n.identifier));

    for (const event of recurring) {
      const reminderMinutes = event.reminders?.overrides?.[0]?.minutes;
      if (reminderMinutes == null) continue;

      let occurrence: Date | undefined;

      if (event.hebrewExtensions.recurrenceType === 'yearly_gregorian') {
        const [, monthStr, dayStr] = (event.start.date ?? '').split('-');
        const month = parseInt(monthStr, 10) - 1; // JS months are 0-indexed
        const day = parseInt(dayStr, 10);
        const now = new Date();
        let candidate = new Date(now.getFullYear(), month, day);
        if (candidate <= now) candidate = new Date(now.getFullYear() + 1, month, day);
        occurrence = candidate;
      } else {
        // yearly_hebrew
        const heb = event.hebrewExtensions.hebrewDate;
        if (!heb) continue; // skip malformed events
        const now = new Date();
        const currentHYear = new HDate(now).getFullYear();
        for (const tryYear of [currentHYear, currentHYear + 1]) {
          try {
            const hdate = new HDate(heb.day, heb.month, tryYear);
            const greg = hdate.greg();
            if (greg > now) { occurrence = greg; break; }
          } catch { continue; }
        }
        if (!occurrence) continue; // skip if can't compute
      }

      const triggerDate = new Date(
        occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate(),
        9, 0, 0, 0, // 09:00 local
      );
      triggerDate.setMinutes(triggerDate.getMinutes() - reminderMinutes);

      // Skip if trigger is in the past
      if (triggerDate <= new Date()) continue;

      if (!scheduledIds.has(event.id)) {
        await NotificationService.scheduleLocalNotification({
          id: event.id,
          title: event.summary,
          body: `תזכורת: ${event.summary}`,
          triggerDate,
        });
      }
    }
  }

  /**
   * Sweep-on-init model for Sefirat HaOmer reminders.
   * Schedules omer notifications for the next 10 calendar days at the user-
   * selected time. Idempotent — skips any id already in the scheduled set.
   * When enabled=false, cancels all existing omer- notifications.
   */
  static async ensureOmerReminders(enabled: boolean, time: string): Promise<void> {
    if (!enabled) {
      const scheduled = await NotificationService.getScheduled();
      for (const n of scheduled) {
        if (n.identifier.startsWith('omer-')) {
          await NotificationService.cancelNotification(n.identifier);
        }
      }
      return;
    }

    const scheduled = await NotificationService.getScheduled();
    const scheduledIds = new Set(scheduled.map(n => n.identifier));

    const [hh, mm] = time.split(':').map(Number);

    const now = new Date();
    for (let offset = 0; offset < 10; offset++) {
      const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);

      const omerInfo = getOmerForDate(candidate);
      if (!omerInfo) continue; // not in Omer period

      const dateStr =
        `${candidate.getFullYear()}` +
        `${String(candidate.getMonth() + 1).padStart(2, '0')}` +
        `${String(candidate.getDate()).padStart(2, '0')}`;
      const id = `omer-${dateStr}`;

      if (scheduledIds.has(id)) continue; // already scheduled — idempotent

      const triggerDate = new Date(
        candidate.getFullYear(), candidate.getMonth(), candidate.getDate(),
        hh, mm, 0, 0,
      );

      if (triggerDate <= new Date()) continue; // in the past

      await NotificationService.scheduleLocalNotification({
        id,
        title: 'ספירת העומר',
        body: omerInfo.text,
        triggerDate,
        data: { type: 'omer', day: omerInfo.day },
      });
    }
  }
}
