// @ts-nocheck -- runs under plain Node (node:test); the project tsconfig has no @types/node.
// scripts/test-reminder-config.ts
// Run: npm run test:reminders
// Guards the reminder delivery fix (docs/worklog/2026-11-03-exact-reminder-delivery.md
// and 2026-11-03-reminder-sound.md): on the SDK 58 build reminders were saved but
// never shown until the app asked for exact alarms and scheduled on its own channel.
// Text checks on app.json and NotificationService.ts; the expo calls are device-only.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const app = JSON.parse(readFileSync(new URL('app.json', root), 'utf8'));
const svc = readFileSync(new URL('src/services/NotificationService.ts', root), 'utf8');

const channelId = svc.match(/const REMINDER_CHANNEL_ID = '([^']+)'/)?.[1];
const sound = svc.match(/const REMINDER_SOUND = '([^']+)'/)?.[1];

test('Android asks for exact alarms', () => {
  assert.ok(app.expo.android.permissions.includes('android.permission.USE_EXACT_ALARM'));
});

test('the reminder trigger names our channel', () => {
  assert.ok(channelId, 'REMINDER_CHANNEL_ID not found');
  const schedule = svc.slice(svc.indexOf('static async scheduleLocalNotification'));
  const trigger = schedule.slice(schedule.indexOf('trigger:'), schedule.indexOf('});'));
  assert.match(trigger, /channelId: REMINDER_CHANNEL_ID/);
});

test('init() creates that channel with high importance and the reminder sound', () => {
  const init = svc.slice(svc.indexOf('static async init'), svc.indexOf('static async requestPermissions'));
  const created = init.slice(init.indexOf('setNotificationChannelAsync(REMINDER_CHANNEL_ID'));
  assert.ok(created.length > 0, 'init() does not create REMINDER_CHANNEL_ID');
  const opts = created.slice(0, created.indexOf('});'));
  assert.match(opts, /importance: Notifications\.AndroidImportance\.(HIGH|MAX)/);
  assert.match(opts, /sound: REMINDER_SOUND/);
});

test('the reminder sound is bundled by the expo-notifications plugin', () => {
  const plugin = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-notifications');
  assert.ok(plugin, 'expo-notifications plugin missing');
  assert.ok((plugin[1].sounds || []).some((s) => s.endsWith('/' + sound)), `${sound} not in plugin sounds`);
});
