/**
 * Stripe: hosted Stripe Checkout, confirmed by the webhook at
 * /api/webhooks/stripe. Talks to the Stripe REST API directly (no SDK).
 *
 * Setup (Vercel environment variables / .env):
 *   STRIPE_SECRET_KEY        Developers > API keys (sk_test_... while testing, sk_live_... to go live)
 *   STRIPE_WEBHOOK_SECRET    Developers > Webhooks > add endpoint
 *                            https://<your-domain>/api/webhooks/stripe
 *                            events: checkout.session.completed,
 *                                    checkout.session.async_payment_succeeded
 *                            then copy its signing secret (whsec_...)
 */
import { env } from "../env.server";
import type { CheckoutRequest, CheckoutSession, PaymentAdapter } from "./types";

const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(env().STRIPE_SECRET_KEY);
}

async function createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured.");

  // Stripe's API takes form-encoded bodies with bracketed keys.
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", req.redirectUrl);
  form.set("cancel_url", req.cancelUrl ?? req.redirectUrl);
  form.set("client_reference_id", req.reference);
  form.set("metadata[reference]", req.reference);
  form.set("payment_intent_data[description]", `Modern Bella Design ${req.reference}`);
  form.set("payment_intent_data[metadata][reference]", req.reference);
  if (req.email) form.set("customer_email", req.email);
  req.lines
    .filter((l) => l.unitCents > 0 && l.qty > 0)
    .forEach((l, i) => {
      form.set(`line_items[${i}][quantity]`, String(l.qty));
      form.set(`line_items[${i}][price_data][currency]`, "usd");
      form.set(`line_items[${i}][price_data][unit_amount]`, String(l.unitCents));
      form.set(`line_items[${i}][price_data][product_data][name]`, l.name.slice(0, 250));
    });

  const res = await fetch(`${API}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": req.idempotencyKey,
    },
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !body.id || !body.url) {
    console.error("Stripe checkout failed", res.status, body.error?.message);
    throw new Error("We could not start the card payment. Please try again or contact us.");
  }
  return { url: body.url, providerOrderId: body.id };
}

export const stripeAdapter: PaymentAdapter = {
  mode: "stripe",
  label: "Stripe",
  createCheckout,
};

const TOLERANCE_SECONDS = 300;

/**
 * Verifies the Stripe-Signature header: `t=<unix>,v1=<hex>[,v1=...]`, where
 * v1 = HMAC-SHA256(webhook secret, `${t}.${rawBody}`). Rejects stale events.
 */
export async function verifyStripeSignature(header: string | null, rawBody: string): Promise<boolean> {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  let timestamp = "";
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = v;
    if (k === "v1" && v) signatures.push(v);
  }
  const t = Number(timestamp);
  if (!t || !signatures.length || Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  return signatures.some((sig) => {
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    return diff === 0;
  });
}
