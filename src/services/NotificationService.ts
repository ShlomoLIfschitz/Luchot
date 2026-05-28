// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getZmanim } from './ZmanimService';

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
}
