// ─────────────────────────────────────────────────────────────────────────────
// RevenueCat wrapper
// Werkt alleen op native (iOS/Android via Capacitor).
// Op web toont de shop een alternatieve boodschap.
// ─────────────────────────────────────────────────────────────────────────────

import type { ExpansionId } from "./shop";
import { EXPANSION_PRODUCT_ID, PRO_BUNDLE_PRODUCT_ID, ALL_EXPANSION_IDS } from "./shop";

let rcInitialized = false;

/**
 * Geeft true als de app draait als native Capacitor app (iOS/Android).
 * Veilig aan te roepen in SSR — geeft dan altijd false.
 */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Capacitor zet dit globaal wanneer het in een native context draait
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/**
 * Initialiseer RevenueCat. Roep aan bij app-start zodra de user bekend is.
 * appUserId koppelt de RevenueCat subscriber aan onze user (voor server-verificatie).
 */
export async function initPurchases(appUserId?: string): Promise<void> {
  if (!isNative()) return;
  if (rcInitialized) return;
  try {
    const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
    const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY_IOS ?? "";
    if (!apiKey) {
      console.warn("[purchases] NEXT_PUBLIC_REVENUECAT_API_KEY_IOS niet ingesteld");
      return;
    }
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({ apiKey, appUserID: appUserId ?? null });
    rcInitialized = true;
    console.log("[purchases] RevenueCat geconfigureerd", appUserId ? `als ${appUserId}` : "(anoniem)");
  } catch (err) {
    console.error("[purchases] Kon RevenueCat niet initialiseren:", err);
  }
}

export interface PurchaseResult {
  success: boolean;
  error?: "cancelled" | "already_owned" | "not_native" | "unknown";
  customerInfo?: unknown;
}

/**
 * Koop een losse uitbreiding.
 * Geeft { success: true } als de aankoop gelukt is.
 */
export async function purchaseExpansion(expansionId: ExpansionId): Promise<PurchaseResult> {
  return purchaseProduct(EXPANSION_PRODUCT_ID[expansionId]);
}

/**
 * Koop de Pro Bundle (alle uitbreidingen in één).
 */
export async function purchaseProBundle(): Promise<PurchaseResult> {
  return purchaseProduct(PRO_BUNDLE_PRODUCT_ID);
}

/**
 * Interne helper — koopt een specifiek product ID via RevenueCat.
 */
async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (!isNative()) {
    return { success: false, error: "not_native" };
  }
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { products } = await Purchases.getProducts({ productIdentifiers: [productId] });
    if (!products.length) {
      console.error("[purchases] Product niet gevonden:", productId);
      return { success: false, error: "unknown" };
    }
    const { customerInfo } = await Purchases.purchaseStoreProduct({ product: products[0] });
    return { success: true, customerInfo };
  } catch (err: unknown) {
    const e = err as { userCancelled?: boolean; message?: string };
    if (e?.userCancelled) return { success: false, error: "cancelled" };
    console.error("[purchases] Aankoop mislukt:", err);
    return { success: false, error: "unknown" };
  }
}

export interface RestoreResult {
  success: boolean;
  unlockedIds: ExpansionId[];
  allPro: boolean;
}

/**
 * Herstel eerdere aankopen via RevenueCat + synchroniseer met de server.
 * Geeft de lijst van ontgrendelde expansion IDs terug.
 */
export async function restorePurchases(): Promise<RestoreResult> {
  if (!isNative()) {
    return { success: false, unlockedIds: [], allPro: false };
  }
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.restorePurchases();

    // Bepaal welke expansions ontgrendeld zijn op basis van actieve entitlements
    const activeEntitlements = Object.keys(customerInfo.entitlements.active ?? {});
    const allPro = activeEntitlements.includes("pro");

    const unlockedIds: ExpansionId[] = allPro
      ? [...ALL_EXPANSION_IDS]
      : (ALL_EXPANSION_IDS.filter((id) => activeEntitlements.includes(id)));

    return { success: true, unlockedIds, allPro };
  } catch (err) {
    console.error("[purchases] Herstel mislukt:", err);
    return { success: false, unlockedIds: [], allPro: false };
  }
}

/**
 * Geeft de huidige CustomerInfo van RevenueCat.
 * Handig om te checken of een user al een entitlement heeft zonder opnieuw te kopen.
 */
export async function getCustomerInfo(): Promise<unknown | null> {
  if (!isNative()) return null;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch {
    return null;
  }
}
