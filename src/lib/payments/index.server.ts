import { env } from "../env.server";
import { squareAdapter, squareConfigured } from "./square.server";
import { stripeAdapter, stripeConfigured } from "./stripe.server";
import { toastAdapter, toastConfigured } from "./toast.server";
import type { PaymentAdapter, PaymentMode } from "./types";

/**
 * Which processor takes card payments right now.
 * PAYMENT_PROVIDER forces a choice ("stripe", "square", "toast", "manual").
 * Otherwise the first processor with keys wins: Stripe, then Square.
 * With no keys at all the store runs in manual (pay by invoice) mode.
 */
export function paymentMode(): PaymentMode {
  const forced = (env().PAYMENT_PROVIDER ?? "").toLowerCase();
  if (forced === "manual") return "manual";
  if (forced === "stripe") return stripeConfigured() ? "stripe" : "manual";
  if (forced === "square") return squareConfigured() ? "square" : "manual";
  if (forced === "toast") return toastConfigured() ? "toast" : "manual";
  if (stripeConfigured()) return "stripe";
  if (squareConfigured()) return "square";
  return "manual";
}

export function paymentAdapter(): PaymentAdapter | null {
  switch (paymentMode()) {
    case "stripe":
      return stripeAdapter;
    case "square":
      return squareAdapter;
    case "toast":
      return toastAdapter;
    default:
      return null;
  }
}
