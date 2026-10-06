import { env as bindings } from "../env.server";
import { squareAdapter, squareConfigured } from "./square.server";
import { toastAdapter, toastConfigured } from "./toast.server";
import type { PaymentAdapter, PaymentMode } from "./types";

/**
 * Which processor takes card payments right now.
 * PAYMENT_PROVIDER forces a choice; otherwise Square is used as soon as its
 * keys exist, and everything else runs in manual (pay by invoice) mode.
 */
export function paymentMode(): PaymentMode {
  const forced = (bindings().PAYMENT_PROVIDER ?? "").toLowerCase();
  if (forced === "manual") return "manual";
  if (forced === "toast") return toastConfigured() ? "toast" : "manual";
  if (forced === "square" || !forced) return squareConfigured() ? "square" : "manual";
  return "manual";
}

export function paymentAdapter(): PaymentAdapter | null {
  const mode = paymentMode();
  if (mode === "square") return squareAdapter;
  if (mode === "toast") return toastAdapter;
  return null;
}
