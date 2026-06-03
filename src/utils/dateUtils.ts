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
 * Formats a Date as "YYYY-MM-DD" using LOCAL date components.
 * All date writes and reads in this codebase must go through this
 * function to avoid UTC/local off-by-one errors.
 */
export function formatDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}
