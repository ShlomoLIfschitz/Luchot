import { randomUUID as expoRandomUUID } from 'expo-crypto';

/**
 * Cryptographically secure RFC 4122 v4 UUID.
 * Prefers `globalThis.crypto.randomUUID()` (Web Crypto); falls back to `expo-crypto` on React Native where needed.
 */
export function generateUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return expoRandomUUID();
}

/**
 * Formats a Date as "YYYY-MM-DD" using UTC components.
 *
 * Matches the date-string format stored in the `start_date` column of
 * the events table (StorageService uses `toISOString().split('T')[0]`
 * for all writes). All date-key comparisons in this codebase must use
 * this function to stay consistent with stored values.
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}
