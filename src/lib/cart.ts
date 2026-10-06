/**
 * The shopping cart lives in the visitor's browser until checkout, when the
 * server re-prices it and writes the order to the database. SSR-safe: the
 * server snapshot is always the empty cart, and storage is only touched in
 * the browser.
 */
import { useSyncExternalStore } from "react";

import { DEFAULT_FINISH, FINISH_BY_ID, type Finish } from "./catalog";
import { lineKey, type CartLine } from "./pricing";

const CART_KEY = "mbd-cart-v1";
const FINISH_KEY = "mbd-finish-v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let finishId: string = DEFAULT_FINISH.id;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "[]");
    if (Array.isArray(parsed)) {
      lines = parsed.filter(
        (l): l is CartLine => l && typeof l.sku === "string" && typeof l.qty === "number",
      );
    }
    const f = window.localStorage.getItem(FINISH_KEY);
    if (f && FINISH_BY_ID[f]) finishId = f;
  } catch {
    lines = EMPTY;
  }
}

function emit() {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
    window.localStorage.setItem(FINISH_KEY, finishId);
  } catch {
    // Private windows can refuse storage; the cart still works for this visit.
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void) {
  load();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const cart = {
  add(sku: string, finish: string | null, qty = 1) {
    load();
    const key = lineKey(sku, finish);
    const existing = lines.find((l) => lineKey(l.sku, l.finishId) === key);
    lines = existing
      ? lines.map((l) => (l === existing ? { ...l, qty: Math.min(99, l.qty + qty) } : l))
      : [...lines, { sku, finishId: finish, qty }];
    emit();
  },
  setQty(key: string, qty: number) {
    load();
    lines = qty <= 0
      ? lines.filter((l) => lineKey(l.sku, l.finishId) !== key)
      : lines.map((l) => (lineKey(l.sku, l.finishId) === key ? { ...l, qty: Math.min(99, qty) } : l));
    emit();
  },
  clear() {
    lines = EMPTY;
    emit();
  },
  setFinish(id: string) {
    load();
    if (FINISH_BY_ID[id]) finishId = id;
    emit();
  },
};

export function useCart(): CartLine[] {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return lines;
    },
    () => EMPTY,
  );
}

export function useFinish(): Finish {
  const id = useSyncExternalStore(
    subscribe,
    () => {
      load();
      return finishId;
    },
    () => DEFAULT_FINISH.id,
  );
  return FINISH_BY_ID[id] ?? DEFAULT_FINISH;
}

export const cartCount = (ls: CartLine[]) => ls.reduce((a, l) => a + l.qty, 0);
