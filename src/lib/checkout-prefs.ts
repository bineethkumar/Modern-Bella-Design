/** Cart-page choices (install, haul away, delivery) carried into checkout. */
import { useSyncExternalStore } from "react";

import type { QuoteOptions } from "./pricing";

const KEY = "mbd-checkout-v1";
const DEFAULTS: QuoteOptions = { install: true, haul: false, fulfilment: "delivery" };
let prefs: QuoteOptions = DEFAULTS;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const p = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (p && typeof p.install === "boolean") {
      prefs = { install: p.install, haul: !!p.haul, fulfilment: p.fulfilment === "pickup" ? "pickup" : "delivery" };
    }
  } catch {
    prefs = DEFAULTS;
  }
}

export function setCheckoutPrefs(next: Partial<QuoteOptions>) {
  load();
  prefs = { ...prefs, ...next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable; the choice still holds for this visit.
  }
  subs.forEach((f) => f());
}

export function useCheckoutPrefs(): QuoteOptions {
  return useSyncExternalStore(
    (f) => {
      load();
      subs.add(f);
      return () => subs.delete(f);
    },
    () => {
      load();
      return prefs;
    },
    () => DEFAULTS,
  );
}
