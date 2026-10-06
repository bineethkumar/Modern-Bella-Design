import { createFileRoute } from "@tanstack/react-router";

import { db, nowIso } from "@/lib/db.server";
import { recordPayment } from "@/lib/ledger.server";
import { verifySquareSignature } from "@/lib/payments/square.server";

interface SquareEvent {
  event_id?: string;
  type?: string;
  data?: {
    object?: {
      payment?: {
        id: string;
        order_id?: string;
        status?: string;
        amount_money?: { amount: number; currency: string };
      };
    };
  };
}

/**
 * Square payment webhook. Register https://<your-domain>/api/webhooks/square
 * for the payment.updated event and store its signature key as
 * SQUARE_WEBHOOK_SIGNATURE_KEY. Each event is applied exactly once.
 */
export const Route = createFileRoute("/api/webhooks/square")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const ok = await verifySquareSignature(
          request.headers.get("x-square-hmacsha256-signature"),
          request.url,
          raw,
        );
        if (!ok) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(raw) as SquareEvent;
        const payment = event.data?.object?.payment;
        if (!event.event_id || !payment?.order_id || payment.status !== "COMPLETED") {
          return new Response("Ignored", { status: 200 });
        }

        const DB = db();
        const seen = await DB.prepare("INSERT INTO webhook_events (id, provider, type, created_at) VALUES (?, 'square', ?, ?) ON CONFLICT (id) DO NOTHING")
          .bind(`square:${payment.id}`, event.type ?? null, nowIso())
          .run();
        if (!seen.meta.changes) return new Response("Duplicate", { status: 200 });

        const amount = payment.amount_money?.amount ?? 0;
        const order = await DB.prepare("SELECT id FROM orders WHERE provider_order_id = ?")
          .bind(payment.order_id)
          .first<{ id: string }>();
        if (order) {
          await recordPayment("order", order.id, amount, "card (Square)", payment.id);
          return new Response("OK", { status: 200 });
        }
        const invoice = await DB.prepare("SELECT id FROM invoices WHERE provider_order_id = ?")
          .bind(payment.order_id)
          .first<{ id: string }>();
        if (invoice) await recordPayment("invoice", invoice.id, amount, "card (Square)", payment.id);
        return new Response("OK", { status: 200 });
      },
    },
  },
});
