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
    // Gal C orthogonal model: 'yearly' + recurrenceCalendar replaces the old
    // compound 'yearly_hebrew'/'yearly_gregorian'. Behavior unchanged — only
    // yearly events get annual reminders (daily/weekly/monthly are C4).
    const recurring = events.filter(e =>
      e.hebrewExtensions.recurrenceType === 'yearly',
    );

    const scheduled = await NotificationService.getScheduled();
    const scheduledIds = new Set(scheduled.map(n => n.identifier));

    for (const event of recurring) {
      const reminderMinutes = event.reminders?.overrides?.[0]?.minutes;
      if (reminderMinutes == null) continue;

      let occurrence: Date | undefined;

      if (event.hebrewExtensions.recurrenceCalendar === 'gregorian') {
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
   * Sweep-on-init model for daily/weekly/monthly recurring reminders.
   *
   * For each master recurring event (recurrence_type IN daily/weekly/monthly)
   * with a reminder set:
   *   1. Compute occurrences in a 60-day forward window (local midnight today ..
   *      today+60d), capped at 20 per event.
   *   2. Cancel all previously scheduled notifications whose id starts with
   *      `evt-{eventId}-` (handles reminderMinutes/time edits and prevents
   *      duplicates).
   *   3. Schedule fresh notifications for the computed window.
   *
   * Occurrence rules (Gregorian JS Date arithmetic, anchored at start_date):
   *   - daily:   every day from max(anchor, today) through today+60.
   *   - weekly:  every 7 days from anchor that falls in the window.
   *   - monthly: same day-of-month each month; months where that day does not
   *              exist (e.g. day 31 in February) are skipped via a
   *              getDate/getMonth normalization guard.
   *   All occurrences must be >= anchor (no pre-existence instances) and >= today.
   *
   * Fire-time anchor (locked):
   *   - Timed event (start.dateTime present): HH:MM from start.dateTime applied
   *     to the occurrence date in local time, then minus reminderMinutes.
   *   - All-day (no start.dateTime): 09:00 local on the occurrence date, then
   *     minus reminderMinutes.
   *   Any fire time <= now is skipped.
   *
   * Notification id namespace: `evt-{eventId}-{YYYYMMDD}` (occurrence date).
   *
   * Does NOT touch yearly events (owned by ensureAnnualReminders).
   * Does NOT import useNotes / expandRecurringNotes (circular-import constraint).
   * Does NOT apply exception/tombstone overlays (C4 scope: master series only).
   */
  static async ensureRecurringReminders(): Promise<void> {
    const events = await StorageService.getRecurringRemindableEvents();
    if (events.length === 0) return;

    // Snapshot of all currently scheduled notifications — used to build
    // per-event cancel sets without re-calling getScheduled() in every loop.
    const scheduled = await NotificationService.getScheduled();

    // Build a map: eventId -> Set<notificationId> for ids matching evt-{eventId}-
    const scheduledByEvent = new Map<string, Set<string>>();
    for (const n of scheduled) {
      if (!n.identifier.startsWith('evt-')) continue;
      // id format: evt-{eventId}-{YYYYMMDD}
      // eventId itself may contain hyphens, so we split on '-' only at the last 8 chars.
      // Safer: strip the known prefix 'evt-' then find the trailing '-YYYYMMDD' (9 chars).
      const withoutPrefix = n.identifier.slice(4); // remove 'evt-'
      const dashPos = withoutPrefix.lastIndexOf('-');
      if (dashPos < 0) continue;
      const evtId = withoutPrefix.slice(0, dashPos);
      if (!scheduledByEvent.has(evtId)) scheduledByEvent.set(evtId, new Set());
      scheduledByEvent.get(evtId)!.add(n.identifier);
    }

    const now      = new Date();
    const WINDOW   = 60; // days forward
    const MAX_OCC  = 20; // safety cap per event

    // Local midnight today — all occurrence generation is relative to this.
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (const event of events) {
      const reminderMinutes = event.reminders?.overrides?.[0]?.minutes;
      if (reminderMinutes == null) continue;

      const startDateStr = event.start.date; // YYYY-MM-DD
      if (!startDateStr) continue;

      const [sy, sm, sd] = startDateStr.split('-').map(Number);
      // Anchor = event creation date, parsed as LOCAL midnight.
      const anchor = new Date(sy, sm - 1, sd);

      const recurrenceType = event.hebrewExtensions.recurrenceType; // 'daily'|'weekly'|'monthly'

      // Extract HH:MM from start.dateTime if this is a timed event.
      let timedHour: number | null   = null;
      let timedMinute: number | null = null;
      if (event.start.dateTime) {
        const dt = new Date(event.start.dateTime);
        timedHour   = dt.getHours();
        timedMinute = dt.getMinutes();
      }

      // ── 1. Compute occurrences ─────────────────────────────────────────────
      const occurrences: Date[] = [];

      if (recurrenceType === 'daily') {
        // Start from max(anchor, today).
        const startFrom = anchor > todayMidnight ? anchor : todayMidnight;
        let cursor = new Date(startFrom);
        while (cursor <= new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), todayMidnight.getDate() + WINDOW)
               && occurrences.length < MAX_OCC) {
          if (cursor >= anchor) {
            occurrences.push(new Date(cursor));
          }
          cursor.setDate(cursor.getDate() + 1);
        }

      } else if (recurrenceType === 'weekly') {
        // Every 7 days from anchor; include only occurrences in [today, today+60].
        const windowEnd = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), todayMidnight.getDate() + WINDOW);
        let cursor = new Date(anchor);
        // Advance to the first occurrence >= today.
        while (cursor < todayMidnight) {
          cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
        }
        while (cursor <= windowEnd && occurrences.length < MAX_OCC) {
          occurrences.push(new Date(cursor));
          cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
        }

      } else if (recurrenceType === 'monthly') {
        // Same day-of-month each month; skip months where that day doesn't exist.
        const targetDay = anchor.getDate();
        const windowEnd = new Date(todayMidnight.getFullYear(), todayMidnight.getMonth(), todayMidnight.getDate() + WINDOW);

        // Start from the month of max(anchor, today).
        const startRef = anchor > todayMidnight ? anchor : todayMidnight;
        let curYear  = startRef.getFullYear();
        let curMonth = startRef.getMonth();

        // Walk forward month by month until we pass the window end.
        while (occurrences.length < MAX_OCC) {
          const candidate = new Date(curYear, curMonth, targetDay);
          // Normalization guard: if day doesn't exist in this month, JS rolls
          // over (e.g. Feb 31 -> Mar 2/3). Check getDate() equals targetDay.
          if (candidate.getDate() === targetDay) {
            if (candidate >= todayMidnight && candidate >= anchor && candidate <= windowEnd) {
              occurrences.push(candidate);
            }
          }
          // Advance to the next month.
          curMonth++;
          if (curMonth > 11) { curMonth = 0; curYear++; }
          // Break if the first day of the new month is already past the window.
          if (new Date(curYear, curMonth, 1) > windowEnd) break;
        }
      }

      // ── 2. Cancel existing scheduled notifications for this event ──────────
      const existingIds = scheduledByEvent.get(event.id) ?? new Set<string>();
      for (const nid of existingIds) {
        await NotificationService.cancelNotification(nid);
      }

      // ── 3. Schedule fresh notifications ────────────────────────────────────
      for (const occ of occurrences) {
        // Build the fire date.
        let fireDate: Date;
        if (timedHour !== null && timedMinute !== null) {
          // Timed event: apply the master's HH:MM to the occurrence date (local).
          fireDate = new Date(occ.getFullYear(), occ.getMonth(), occ.getDate(), timedHour, timedMinute, 0, 0);
        } else {
          // All-day event: 09:00 local on the occurrence date.
          fireDate = new Date(occ.getFullYear(), occ.getMonth(), occ.getDate(), 9, 0, 0, 0);
        }
        // Subtract reminder lead time.
        fireDate = new Date(fireDate.getTime() - reminderMinutes * 60_000);

        // Skip if fire time is in the past.
        if (fireDate <= now) continue;

        // Build occurrence date string for the id (YYYYMMDD).
        const occDateStr =
          `${occ.getFullYear()}` +
          `${String(occ.getMonth() + 1).padStart(2, '0')}` +
          `${String(occ.getDate()).padStart(2, '0')}`;
        const notifId = `evt-${event.id}-${occDateStr}`;

        await NotificationService.scheduleLocalNotification({
          id: notifId,
          title: event.summary,
          body: `תזכורת: ${event.summary}`,
          triggerDate: fireDate,
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
    override?: { lat: number; lng: number; placeName: string; il: boolean },
  ): Promise<void> {
    // 1. Always cancel all candle-* first (city or lead-time change requires full reset)
    const scheduled = await NotificationService.getScheduled();
    for (const n of scheduled) {
      if (n.identifier.startsWith('candle-')) {
        await NotificationService.cancelNotification(n.identifier);
      }
    }
    if (!enabled) return;
    if (!override && !city) return;

    // 2. Resolve coordinates + display name + il flag
    let lat: number;
    let lng: number;
    let cityNameHe: string;
    let il: boolean;

    if (override) {
      // GPS override path — skip city-key resolution entirely
      lat = override.lat;
      lng = override.lng;
      cityNameHe = override.placeName;
      il = override.il;
    } else {
      // Existing city-key path (back-compat) — city is non-null here (guarded above)
      const coords = getCityCoordinates(city!);
      if (!coords) return; // unknown key — defensive
      lat = coords.lat;
      lng = coords.lng;
      const cityEntry = findCityByKey(city!);
      cityNameHe = cityEntry?.nameHe ?? city!;
      il = cityEntry?.country === 'IL';
    }

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
