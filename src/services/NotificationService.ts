// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { getZmanim } from './ZmanimService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  static async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
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
}
