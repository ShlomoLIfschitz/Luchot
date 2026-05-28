// src/schemas/NotificationSchema.ts

import { z } from 'zod';

export const NotificationType = z.enum([
  'event',
  'omer',
  'candleLighting',
  'exportReminder',
]);
export type NotificationType = z.infer<typeof NotificationType>;

// Stores the token KEY (e.g. 'tagHoliday'), not a raw hex value.
// The UI layer resolves keys to colors from src/constants/colors.ts.
export const NotificationTagColor = z.enum([
  'tagHoliday',
  'tagShabbat',
  'tagSpecial',
  'tagEvent',
  'tagPersonal',
]);
export type NotificationTagColor = z.infer<typeof NotificationTagColor>;

export const NotificationRecurrence = z.enum(['none', 'daily', 'weekly']);
export type NotificationRecurrence = z.infer<typeof NotificationRecurrence>;

// Schema-only field — renewal scheduling logic is not implemented yet.
// Present so a future SQLite migration is not required when the renewal
// feature is built.
export const NotificationRenewalPolicy = z.enum(['never', 'annual', 'september']);
export type NotificationRenewalPolicy = z.infer<typeof NotificationRenewalPolicy>;

export const NotificationRecordSchema = z.object({
  id: z.string(),
  type: NotificationType,
  title: z.string(),
  body: z.string(),
  triggerDate: z.date(),
  sourceId: z.string().optional(),
  createdAt: z.date(),
  recurrence: NotificationRecurrence.default('none'),
  renewalPolicy: NotificationRenewalPolicy.default('never'),
  lastConfirmedAt: z.date().optional(),
  color: NotificationTagColor.optional(),
});
export type NotificationRecord = z.infer<typeof NotificationRecordSchema>;
