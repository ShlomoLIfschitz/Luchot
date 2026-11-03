// src/services/BillingService.ts
// "Support the project" tips through Google Play Billing (DECISIONS.md, 2026-11-03).
// Three consumable in-app products; a tip unlocks nothing. The purchase runs
// inside the Play Store app — Luchot itself makes no network call.
//
// Product IDs must match the in-app products created in Play Console.

import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  isUserCancelledError,
  type Product,
  type Purchase,
} from 'expo-iap';

/** Ordered as shown on screen (10 / 25 / 50 ₪ in the Figma frames). */
export const SUPPORT_PRODUCT_IDS = ['support_10', 'support_25', 'support_50'] as const;

export interface SupportProduct {
  id: string;
  /** Localized price from Play, e.g. "‏25.00 ₪" — never hard-coded. */
  displayPrice: string;
}

export type PurchaseOutcome = 'success' | 'cancelled' | 'failed';

/**
 * Connects to Play and loads the tip products. Also consumes any purchase left
 * unconsumed by an earlier session (e.g. a pending payment that completed while
 * the app was closed) — Play refunds purchases not finalized within 3 days.
 * Throws when billing is unavailable or no product is configured.
 */
export async function connectSupport(): Promise<SupportProduct[]> {
  await initConnection();
  await consumeLeftovers();
  const products = (await fetchProducts({
    skus: [...SUPPORT_PRODUCT_IDS],
    type: 'in-app',
  })) as Product[] | null;
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const ordered = SUPPORT_PRODUCT_IDS.flatMap((id) => {
    const p = byId.get(id);
    return p ? [{ id, displayPrice: p.displayPrice }] : [];
  });
  if (ordered.length === 0) throw new Error('No support products available');
  return ordered;
}

export function disconnectSupport(): void {
  void endConnection().catch(() => {});
}

async function consumeLeftovers(): Promise<void> {
  try {
    const owned = await getAvailablePurchases();
    for (const p of owned) {
      if (isSupportPurchase(p) && p.purchaseState === 'purchased') {
        await finishTransaction({ purchase: p, isConsumable: true });
      }
    }
  } catch {
    // Not fatal: the next connect retries.
  }
}

function isSupportPurchase(p: Purchase): boolean {
  return (SUPPORT_PRODUCT_IDS as readonly string[]).includes(p.productId);
}

/**
 * Opens the Play purchase sheet and resolves once Play reports the outcome.
 * A pending payment (e.g. cash at a store) resolves 'cancelled' — nothing is
 * shown now, and the purchase is consumed on a later connect once it completes.
 */
export function purchaseSupport(productId: string): Promise<PurchaseOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (outcome: PurchaseOutcome) => {
      if (settled) return;
      settled = true;
      updated.remove();
      failed.remove();
      resolve(outcome);
    };

    const updated = purchaseUpdatedListener((purchase: Purchase) => {
      if (purchase.productId !== productId) return;
      if (purchase.purchaseState !== 'purchased') {
        done('cancelled');
        return;
      }
      finishTransaction({ purchase, isConsumable: true })
        .then(() => done('success'))
        // The charge went through; consuming retries on the next connect.
        .catch(() => done('success'));
    });

    const failed = purchaseErrorListener((error) => {
      done(isUserCancelledError(error) ? 'cancelled' : 'failed');
    });

    requestPurchase({
      request: { google: { skus: [productId] } },
      type: 'in-app',
    }).catch((error: unknown) => {
      done(isUserCancelledError(error) ? 'cancelled' : 'failed');
    });
  });
}
