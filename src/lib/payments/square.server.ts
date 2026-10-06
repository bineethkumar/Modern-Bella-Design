/**
 * Square: hosted checkout through the Payment Links API, confirmed by the
 * payment webhook at /api/webhooks/square.
 *
 * Setup (website settings, secrets):
 *   SQUARE_ACCESS_TOKEN            from the Square Developer dashboard
 *   SQUARE_LOCATION_ID             the location that receives the money
 *   SQUARE_ENV                     "sandbox" while testing, "production" to go live
 *   SQUARE_WEBHOOK_SIGNATURE_KEY   from the webhook subscription (event: payment.updated)
 * Webhook URL to register in Square: https://<your-domain>/api/webhooks/square
 */
import { env as bindings } from "../env.server";
import type { CheckoutRequest, CheckoutSession, PaymentAdapter } from "./types";

const SQUARE_VERSION = "2025-01-23";

function apiBase(): string {
  return bindings().SQUARE_ENV === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

export function squareConfigured(): boolean {
  const { SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID } = bindings();
  return Boolean(SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID);
}

async function createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
  const { SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID } = bindings();
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) throw new Error("Square is not configured.");

  const res = await fetch(`${apiBase()}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    },
    body: JSON.stringify({
      idempotency_key: req.idempotencyKey,
      order: {
        location_id: SQUARE_LOCATION_ID,
        reference_id: req.reference.slice(0, 40),
        line_items: req.lines
          .filter((l) => l.unitCents > 0 && l.qty > 0)
          .map((l) => ({
            name: l.name.slice(0, 500),
            quantity: String(l.qty),
            base_price_money: { amount: l.unitCents, currency: "USD" },
          })),
      },
      checkout_options: { redirect_url: req.redirectUrl },
      ...(req.email ? { pre_populated_data: { buyer_email: req.email } } : {}),
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    payment_link?: { url: string; order_id: string };
    errors?: { detail?: string }[];
  };
  if (!res.ok || !body.payment_link) {
    console.error("Square payment link failed", res.status, JSON.stringify(body.errors ?? body));
    throw new Error("We could not start the card payment. Please try again or contact us.");
  }
  return { url: body.payment_link.url, providerOrderId: body.payment_link.order_id };
}

export const squareAdapter: PaymentAdapter = {
  mode: "square",
  label: "Square",
  createCheckout,
};

/** Square signs `notificationUrl + rawBody` with HMAC-SHA256 (base64). */
export async function verifySquareSignature(
  signature: string | null,
  notificationUrl: string,
  rawBody: string,
): Promise<boolean> {
  const key = bindings().SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key || !signature) return false;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(notificationUrl + rawBody));
  let bin = "";
  for (const b of new Uint8Array(mac)) bin += String.fromCharCode(b);
  const expected = btoa(bin);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
