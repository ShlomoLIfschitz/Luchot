// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { HDate, HebrewCalendar, flags } from '@hebcal/core';
import '@hebcal/cities';
import { StorageService } from './StorageService';
import { getOmerForDate } from './DateService';
import { getZmanim } from './ZmanimService';
import { getCandleLightingOffset } from '../utils/candleLightingOffset';
import { getCityCoordinates, findCityByKey } from '../utils/locationLookup';

/**
 * Returns true if `date` is erev Yom Tov Rishon (first-day eve).
 * Logic: tomorrow has the CHAG flag AND today does NOT.
 * This correctly excludes Yom Tov Sheni eves (the day before Sheni is Rishon,
 * which IS CHAG, so the "today NOT CHAG" condition fails).
 */
function checkErevYomTovRishon(date: Date, il: boolean): boolean {
  const todayHD = new HDate(date);
  const tomorrowDate = new Date(date);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowHD = new HDate(tomorrowDate);

  const todayEvents = HebrewCalendar.calendar({ start: todayHD, end: todayHD, il });
  const tomorrowEvents = HebrewCalendar.calendar({ start: tomorrowHD, end: tomorrowHD, il });

  const todayIsChag = todayEvents.some(ev => Boolean(ev.getFlags() & flags.CHAG));
  const tomorrowIsChag = tomorrowEvents.some(ev => Boolean(ev.getFlags() & flags.CHAG));
  return tomorrowIsChag && !todayIsChag;
}

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

  /**
   * Sweep-on-init model for candle-lighting reminders.
   * Cancels all candle-* notifications first (handles city/lead-time changes),
   * then sweeps 13 weeks (91 days) scheduling Shabbat + Yom Tov Rishon eves.
   * Fire time: candle-lighting timestamp (shkia − city offset) − leadMinutes.
   * Max 64 notifications (iOS limit).
   */
  static async ensureCandleLightingReminders(
    enabled: boolean,
    leadMinutes: number,
    city: string | null,
  ): Promise<void> {
    // 1. Always cancel all candle-* first (city or lead-time change requires full reset)
    const scheduled = await NotificationService.getScheduled();
    for (const n of scheduled) {
      if (n.identifier.startsWith('candle-')) {
        await NotificationService.cancelNotification(n.identifier);
      }
    }
    if (!enabled || !city) return;

    // 2. Resolve city → coordinates + metadata
    const coords = getCityCoordinates(city);
    if (!coords) return; // unknown key — defensive
    const { lat, lng } = coords;
    const cityEntry = findCityByKey(city);
    const cityNameHe = cityEntry?.nameHe ?? city;
    const il = cityEntry?.country === 'IL';

    // 3. City-specific candle-lighting offset (Jerusalem 40 min, Haifa 30, Safed 40, others 18)
    const clOffsetMinutes = getCandleLightingOffset(lat, lng).minutes;

    // 4. Sweep 91 days (13 weeks rolling window)
    const now = new Date();
    let count = 0;
    for (let dayOffset = 0; dayOffset < 91 && count < 64; dayOffset++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);

      const isErevShabbat = date.getDay() === 5; // Friday
      const isErevYomTov = checkErevYomTovRishon(date, il);
      if (!isErevShabbat && !isErevYomTov) continue;

      // Get shkia for this date via ZmanimService (works any day of week)
      const zmanim = getZmanim(date, lat, lng);
      if (!zmanim.shkia) continue;

      // Compute candle-lighting time (bypass ZmanimResult.candleLighting which is Friday-only)
      const candleLightingTime = new Date(zmanim.shkia.getTime() - clOffsetMinutes * 60_000);
      const fireDate = new Date(candleLightingTime.getTime() - leadMinutes * 60_000);
      if (fireDate <= now) continue; // already past

      const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
      const hhmm = candleLightingTime.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      await NotificationService.scheduleLocalNotification({
        id: `candle-${dateStr}`,
        title: 'הדלקת נרות',
        body: `${cityNameHe}, ${hhmm}`,
        triggerDate: fireDate,
      });
      count++;
    }
  }
}
