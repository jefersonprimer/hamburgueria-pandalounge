import type { Product } from "@/types/product";
import type { AppliedCoupon } from "@/types/coupon";

export interface CartItem {
  product: Product;
  quantity: number;
  addonIds: string[];
  observation: string;
}

export function getCartItemKey(item: Pick<CartItem, "product" | "addonIds" | "observation">) {
  return `${item.product.id}:${[...item.addonIds].sort().join(",")}:${item.observation.trim()}`;
}

export function getCartItemAddons(item: CartItem) {
  return item.addonIds.flatMap((id) => {
    const addon = item.product.addons?.find((candidate) => candidate.id === id);
    return addon ? [addon] : [];
  });
}

export function getCartItemAddonGroups(item: CartItem) {
  return (item.product.addons ?? []).flatMap((addon) => {
    const quantity = item.addonIds.filter((id) => id === addon.id).length;
    return quantity > 0 ? [{ addon, quantity }] : [];
  });
}

export function getCartItemUnitPrice(item: CartItem) {
  return Number(item.product.price) + getCartItemAddons(item).reduce((sum, addon) => sum + Number(addon.price), 0);
}

const STORAGE_KEY = "fanfar_cart";
const COUPON_STORAGE_KEY = "fanfar_coupon";
const EMPTY_ITEMS: CartItem[] = [];

let cartItems: CartItem[] = EMPTY_ITEMS;
let initialized = false;
let appliedCoupon: AppliedCoupon | null = null;
let couponInitialized = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function readFromStorage(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_ITEMS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_ITEMS;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_ITEMS;

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];

      const candidate = entry as { product?: Product; quantity?: unknown; addonIds?: unknown; observation?: unknown };

      if (
        !candidate.product ||
        typeof candidate.product.id !== "string" ||
        typeof candidate.quantity !== "number" ||
        candidate.quantity <= 0
      ) {
        return [];
      }

      return [
        {
          product: candidate.product,
          quantity: Math.floor(candidate.quantity),
          addonIds: Array.isArray(candidate.addonIds) ? candidate.addonIds.filter((id): id is string => typeof id === "string") : [],
          observation: typeof candidate.observation === "string" ? candidate.observation : "",
        },
      ];
    });
  } catch {
    return EMPTY_ITEMS;
  }
}

function readCouponFromStorage(): AppliedCoupon | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(COUPON_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const candidate = parsed as Partial<AppliedCoupon>;

    if (
      typeof candidate.id !== "string" ||
      typeof candidate.code !== "string" ||
      (candidate.discount_type !== "percentage" &&
        candidate.discount_type !== "fixed") ||
      typeof candidate.discount_value !== "number" ||
      typeof candidate.min_purchase !== "number"
    ) {
      return null;
    }

    return {
      id: candidate.id,
      code: candidate.code,
      discount_type: candidate.discount_type,
      discount_value: candidate.discount_value,
      min_purchase: candidate.min_purchase,
      max_discount:
        typeof candidate.max_discount === "number"
          ? candidate.max_discount
          : null,
      free_shipping: candidate.free_shipping === true,
    };
  } catch {
    return null;
  }
}

function ensureInitialized() {
  if (!initialized && typeof window !== "undefined") {
    cartItems = readFromStorage();
    initialized = true;
  }
}

function ensureCouponInitialized() {
  if (!couponInitialized && typeof window !== "undefined") {
    appliedCoupon = readCouponFromStorage();
    couponInitialized = true;
  }
}

function commit(nextItems: CartItem[]) {
  cartItems = nextItems;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
    } catch {}
  }

  notifyListeners();
}

export function subscribe(listener: () => void) {
  ensureInitialized();
  ensureCouponInitialized();
  listeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) {
      cartItems = readFromStorage();
      notifyListeners();
    }

    if (event.key === COUPON_STORAGE_KEY) {
      appliedCoupon = readCouponFromStorage();
      notifyListeners();
    }
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getSnapshot() {
  ensureInitialized();
  return cartItems;
}

export function getServerSnapshot() {
  return EMPTY_ITEMS;
}

export function getCouponSnapshot() {
  ensureCouponInitialized();
  return appliedCoupon;
}

export function getServerCouponSnapshot() {
  return null;
}

export function applyCoupon(coupon: AppliedCoupon) {
  ensureCouponInitialized();
  appliedCoupon = coupon;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(coupon));
    } catch {}
  }

  notifyListeners();
}

export function removeCoupon() {
  ensureCouponInitialized();
  appliedCoupon = null;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(COUPON_STORAGE_KEY);
    } catch {}
  }

  notifyListeners();
}

export function addToCart(product: Product, quantity = 1, addonIds: string[] = [], observation = "") {
  if (quantity <= 0 || product.stock <= 0) return;

  ensureInitialized();

  const normalizedIds = [...addonIds].sort();
  const normalizedObservation = observation.trim().slice(0, 300);
  const config = { product, addonIds: normalizedIds, observation: normalizedObservation };
  const itemKey = getCartItemKey(config);
  const existingItem = cartItems.find((item) => getCartItemKey(item) === itemKey);
  const productQuantity = cartItems
    .filter((item) => item.product.id === product.id)
    .reduce((sum, item) => sum + item.quantity, 0);
  const allowedQuantity = Math.max(product.stock - productQuantity, 0);
  const quantityToAdd = Math.min(quantity, allowedQuantity);
  if (quantityToAdd <= 0) return;

  if (existingItem) {
    commit(
      cartItems.map((item) =>
        getCartItemKey(item) === itemKey
          ? {
              ...item,
              product,
              quantity: Math.min(
                item.quantity + quantityToAdd,
                product.stock
              ),
            }
          : item
      )
    );
  } else {
    commit([
      ...cartItems,
      { ...config, quantity: quantityToAdd },
    ]);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fanfar:cart-toast", { detail: { product } })
    );
  }
}

export function setCartQuantity(product: Product, quantity: number, addonIds?: string[], observation = "") {
  ensureInitialized();

  if (addonIds === undefined) {
    const currentQuantity = cartItems
      .filter((item) => item.product.id === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    const difference = quantity - currentQuantity;
    if (difference > 0) {
      addToCart(product, difference);
      return;
    }
    if (difference < 0) {
      let removeCount = -difference;
      const next = [...cartItems];
      for (let index = next.length - 1; index >= 0 && removeCount > 0; index -= 1) {
        const item = next[index];
        if (item.product.id !== product.id) continue;
        const removed = Math.min(removeCount, item.quantity);
        item.quantity -= removed;
        removeCount -= removed;
        if (item.quantity <= 0) next.splice(index, 1);
      }
      commit(next);
    }
    return;
  }

  if (quantity <= 0) {
    removeFromCart(product.id, addonIds, observation);
    return;
  }

  const otherQuantity = cartItems
    .filter((item) => item.product.id === product.id && getCartItemKey(item) !== getCartItemKey({ product, addonIds, observation }))
    .reduce((sum, item) => sum + item.quantity, 0);
  const maxQuantity = Math.max(product.stock - otherQuantity, 0);

  commit(
    cartItems.map((item) =>
      getCartItemKey(item) === getCartItemKey({ product, addonIds, observation })
        ? { ...item, product, quantity: Math.min(quantity, maxQuantity) }
        : item
    )
  );
}

export function removeFromCart(productId: string, addonIds?: string[], observation?: string) {
  ensureInitialized();
  commit(cartItems.filter((item) => {
    if (item.product.id !== productId) return true;
    if (addonIds === undefined) return false;
    return getCartItemKey(item) !== getCartItemKey({ product: item.product, addonIds, observation: observation ?? "" });
  }));
}

export function clearCart() {
  ensureInitialized();
  commit([]);
  removeCoupon();
}
