/**
 * Toast adapter.
 *
 * Toast's APIs are built around restaurant point-of-sale; online card
 * checkout for a retail store is not part of Toast's public API, and access
 * to its partner APIs is granted per account. Once Toast gives you API access
 * for online payments, implement `createCheckout` below against the endpoint
 * they provide and set these secrets in the website settings:
 *   PAYMENT_PROVIDER=toast, TOAST_CLIENT_ID, TOAST_CLIENT_SECRET, TOAST_RESTAURANT_GUID
 *
 * Until then the store falls back to "manual" mode automatically: orders are
 * placed, tracked and invoiced, and payment is collected on your Toast
 * terminal or by invoice. Nothing else in the site needs to change.
 */
import { env as bindings } from "../env.server";
import type { CheckoutRequest, CheckoutSession, PaymentAdapter } from "./types";

export function toastConfigured(): boolean {
  const { TOAST_CLIENT_ID, TOAST_CLIENT_SECRET, TOAST_RESTAURANT_GUID } = bindings();
  return Boolean(TOAST_CLIENT_ID && TOAST_CLIENT_SECRET && TOAST_RESTAURANT_GUID) && toastCheckoutImplemented;
}

/** Flip to true once createCheckout talks to the Toast endpoint you were given. */
const toastCheckoutImplemented = false;

async function createCheckout(_req: CheckoutRequest): Promise<CheckoutSession> {
  throw new Error("Toast online checkout is not connected yet.");
}

export const toastAdapter: PaymentAdapter = {
  mode: "toast",
  label: "Toast",
  createCheckout,
};
