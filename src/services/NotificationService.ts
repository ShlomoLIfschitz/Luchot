// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HDate } from '@hebcal/core';
import { getZmanim } from './ZmanimService';
import { StorageService } from './StorageService';

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
   * Schedule Sefirat HaOmer reminders for the entire Omer period
   */
  static async scheduleOmerReminders(
    latitude: number,
    longitude: number,
    omerStartDate: Date,  // Night of Pesach (16 Nisan)
  ): Promise<void> {
    // Cancel existing omer notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'omer') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    // Schedule 49 notifications, each at sunset of the relevant day
    for (let day = 1; day <= 49; day++) {
      const date = new Date(omerStartDate);
      date.setDate(date.getDate() + day - 1);

      const zmanim = getZmanim(date, latitude, longitude);
      if (!zmanim.shkia) continue;

      // 10 minutes after shkia
      const notifTime = new Date(zmanim.shkia.getTime() + 10 * 60 * 1000);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'ספירת העומר',
          body: `הגיע זמן ספירת העומר — יום ${day} לעומר`,
          data: { type: 'omer', day },
        },
        trigger: {
          date: notifTime,
        },
      });
    }
  }

  /**
   * Schedule a reminder for a specific event
   */
  static async scheduleEventReminder(
    eventId: string,
    title: string,
    date: Date,
    minutesBefore = 30,
  ): Promise<string> {
    const triggerDate = new Date(date.getTime() - minutesBefore * 60 * 1000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: `תזכורת: ${title}`,
        data: { type: 'event', eventId },
      },
      trigger: { date: triggerDate },
    });
    return id;
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
}
