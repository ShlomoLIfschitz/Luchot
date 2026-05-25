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
