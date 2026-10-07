import { createFileRoute } from "@tanstack/react-router";

import { db, nowIso } from "@/lib/db.server";
import { recordPayment } from "@/lib/ledger.server";
import { verifyStripeSignature } from "@/lib/payments/stripe.server";

interface StripeEvent {
  id?: string;
  type?: string;
  data?: {
    object?: {
      id: string;
      client_reference_id?: string | null;
      amount_total?: number | null;
      payment_status?: string;
      payment_intent?: string | null;
    };
  };
}

const PAID_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

/**
 * Stripe webhook. Register https://<your-domain>/api/webhooks/stripe for
 * checkout.session.completed and checkout.session.async_payment_succeeded,
 * and store its signing secret as STRIPE_WEBHOOK_SECRET. Each checkout is
 * applied exactly once, even if Stripe retries.
 */
export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const ok = await verifyStripeSignature(request.headers.get("stripe-signature"), raw);
        if (!ok) return new Response("Invalid signature", { status: 400 });

        const event = JSON.parse(raw) as StripeEvent;
        const session = event.data?.object;
        if (!event.type || !PAID_EVENTS.has(event.type) || !session || session.payment_status !== "paid") {
          return new Response("Ignored", { status: 200 });
        }

        const DB = db();
        const seen = await DB.prepare(
          "INSERT INTO webhook_events (id, provider, type, created_at) VALUES (?, 'stripe', ?, ?) ON CONFLICT (id) DO NOTHING",
        ).bind(`stripe:${session.id}`, event.type, nowIso()).run();
        if (!seen.meta.changes) return new Response("Duplicate", { status: 200 });

        const amount = session.amount_total ?? 0;
        const reference = session.payment_intent ?? session.id;
        // Match on the checkout id we stored; fall back to our own order or
        // invoice number (client_reference_id) in case a newer checkout was
        // opened after this one.
        const ref = session.client_reference_id ?? "";
        const order = await DB.prepare("SELECT id FROM orders WHERE provider_order_id = ? OR number = ? LIMIT 1")
          .bind(session.id, ref)
          .first<{ id: string }>();
        if (order) {
          await recordPayment("order", order.id, amount, "card (Stripe)", reference);
          return new Response("OK", { status: 200 });
        }
        const invoice = await DB.prepare("SELECT id FROM invoices WHERE provider_order_id = ? OR number = ? LIMIT 1")
          .bind(session.id, ref)
          .first<{ id: string }>();
        if (invoice) {
          await recordPayment("invoice", invoice.id, amount, "card (Stripe)", reference);
          return new Response("OK", { status: 200 });
        }
        console.error("Stripe payment with no matching order or invoice", session.id, ref);
        return new Response("No match", { status: 200 });
      },
    },
  },
});
