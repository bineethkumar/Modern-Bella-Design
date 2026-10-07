/**
 * Customer-facing server functions: checkout, order tracking, consultation
 * requests and invoice payment. Prices are always recomputed here.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { db, newId, nowIso, orderNumber, randomToken, requestOrigin } from "../db.server";
import { paymentAdapter, paymentMode } from "../payments/index.server";
import type { CheckoutLine } from "../payments/types";
import { quote } from "../pricing";

const lineSchema = z.object({
  sku: z.string().min(1).max(40),
  finishId: z.string().max(40).nullable(),
  qty: z.number().int().min(1).max(99),
});

const checkoutSchema = z.object({
  lines: z.array(lineSchema).min(1).max(200),
  install: z.boolean(),
  haul: z.boolean(),
  fulfilment: z.enum(["delivery", "pickup"]),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160),
    phone: z.string().trim().min(7).max(40),
    address1: z.string().trim().max(160).optional().default(""),
    address2: z.string().trim().max(160).optional().default(""),
    city: z.string().trim().max(80).optional().default(""),
    state: z.string().trim().max(40).optional().default(""),
    zip: z.string().trim().max(12).optional().default(""),
    notes: z.string().trim().max(2000).optional().default(""),
  }),
});

/** What the checkout page needs to know before it renders the pay button. */
export const getCheckoutInfo = createServerFn({ method: "GET" }).handler(async () => {
  return { mode: paymentMode(), label: paymentAdapter()?.label ?? null };
});

export const placeOrder = createServerFn({ method: "POST" })
  .validator(checkoutSchema)
  .handler(async ({ data }) => {
    const q = quote(data.lines, { install: data.install, haul: data.haul, fulfilment: data.fulfilment });
    if (q.invalid.length || q.lines.length === 0) {
      throw new Error("Some items in your cart are no longer available. Please review your cart.");
    }
    const c = data.customer;
    if (data.fulfilment === "delivery" && (!c.address1 || !c.city || !c.zip)) {
      throw new Error("Please add a delivery address.");
    }

    const id = newId();
    const number = orderNumber();
    const token = randomToken();
    const now = nowIso();
    const DB = db();

    await DB.batch([
      DB.prepare(
        `INSERT INTO orders (id, number, public_token, status, payment_status, customer_name, email, phone,
          address_line1, address_line2, city, state, zip, fulfilment, install, haul, notes,
          subtotal_cents, install_cents, haul_cents, delivery_cents, tax_cents, total_cents, created_at, updated_at)
         VALUES (?, ?, ?, 'received', 'unpaid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id, number, token, c.name, c.email.toLowerCase(), c.phone,
        c.address1, c.address2, c.city, c.state, c.zip, data.fulfilment,
        data.install ? 1 : 0, data.install && data.haul ? 1 : 0, c.notes,
        q.subtotalCents, q.installCents, q.haulCents, q.deliveryCents, q.taxCents, q.totalCents, now, now,
      ),
      ...q.lines.map((l) =>
        DB.prepare(
          `INSERT INTO order_items (order_id, sku, name, finish_id, finish_label, qty, unit_cents, total_cents)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(id, l.sku, l.name, l.finishId, l.finishLabel, l.qty, l.unitCents, l.totalCents),
      ),
      DB.prepare(
        "INSERT INTO order_events (order_id, status, note, visible, author, created_at) VALUES (?, 'received', ?, 1, 'system', ?)",
      ).bind(id, "Order placed online.", now),
    ]);

    const orderUrl = `/order/${number}?t=${token}`;
    const adapter = paymentAdapter();
    if (!adapter) return { number, token, orderUrl, payUrl: null as string | null };

    const lines: CheckoutLine[] = q.lines.map((l) => ({
      name: l.finishLabel ? `${l.name} ${l.sku} (${l.finishLabel})` : `${l.name} ${l.sku}`,
      qty: l.qty,
      unitCents: l.unitCents,
    }));
    if (q.installCents) lines.push({ name: "Installation", qty: 1, unitCents: q.installCents });
    if (q.haulCents) lines.push({ name: "Old cabinet removal", qty: 1, unitCents: q.haulCents });
    if (q.deliveryCents) lines.push({ name: "Delivery", qty: 1, unitCents: q.deliveryCents });
    if (q.taxCents) lines.push({ name: "Maryland sales tax", qty: 1, unitCents: q.taxCents });
    const origin = requestOrigin();

    try {
      const session = await adapter.createCheckout({
        idempotencyKey: id,
        reference: number,
        lines,
        email: c.email,
        redirectUrl: `${origin}${orderUrl}&paid=1`,
        cancelUrl: `${origin}${orderUrl}`,
      });
      await DB.prepare(
        "UPDATE orders SET payment_provider = ?, provider_order_id = ?, payment_link_url = ?, updated_at = ? WHERE id = ?",
      ).bind(adapter.mode, session.providerOrderId, session.url, nowIso(), id).run();
      return { number, token, orderUrl, payUrl: session.url as string | null };
    } catch (error) {
      // The order is safe in the database; the customer can pay from the order page or by invoice.
      console.error(error);
      return { number, token, orderUrl, payUrl: null as string | null };
    }
  });

interface OrderRow {
  id: string;
  number: string;
  status: string;
  payment_status: string;
  payment_link_url: string | null;
  customer_name: string;
  fulfilment: string;
  install: number;
  city: string | null;
  state: string | null;
  subtotal_cents: number;
  install_cents: number;
  haul_cents: number;
  delivery_cents: number;
  tax_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  created_at: string;
}

export const getPublicOrder = createServerFn({ method: "GET" })
  .validator(z.object({ number: z.string().max(40), token: z.string().max(80) }))
  .handler(async ({ data }) => {
    const DB = db();
    const order = await DB.prepare(
      `SELECT id, number, status, payment_status, payment_link_url, customer_name, fulfilment, install, city, state,
              subtotal_cents, install_cents, haul_cents, delivery_cents, tax_cents, total_cents, amount_paid_cents, created_at
       FROM orders WHERE number = ? AND public_token = ?`,
    ).bind(data.number, data.token).first<OrderRow>();
    if (!order) return null;
    const [items, events] = await Promise.all([
      DB.prepare("SELECT sku, name, finish_label, qty, unit_cents, total_cents FROM order_items WHERE order_id = ? ORDER BY id")
        .bind(order.id)
        .all<{ sku: string; name: string; finish_label: string | null; qty: number; unit_cents: number; total_cents: number }>(),
      DB.prepare("SELECT status, note, created_at FROM order_events WHERE order_id = ? AND visible = 1 ORDER BY id DESC")
        .bind(order.id)
        .all<{ status: string | null; note: string | null; created_at: string }>(),
    ]);
    const { id: _id, ...rest } = order;
    return { ...rest, items: items.results, events: events.results, canPayOnline: paymentMode() !== "manual" };
  });

export const lookupOrder = createServerFn({ method: "POST" })
  .validator(z.object({ number: z.string().trim().max(40), email: z.string().trim().max(160) }))
  .handler(async ({ data }) => {
    const row = await db()
      .prepare("SELECT number, public_token FROM orders WHERE UPPER(number) = UPPER(?) AND email = LOWER(?)")
      .bind(data.number, data.email)
      .first<{ number: string; public_token: string }>();
    if (!row) throw new Error("We could not find an order with that number and email.");
    return { url: `/order/${row.number}?t=${row.public_token}` };
  });

export const requestConsultation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(160),
      phone: z.string().trim().max(40).optional().default(""),
      zip: z.string().trim().max(12).optional().default(""),
      room: z.string().trim().max(40).optional().default(""),
      message: z.string().trim().max(2000).optional().default(""),
    }),
  )
  .handler(async ({ data }) => {
    await db()
      .prepare(
        "INSERT INTO consultations (id, name, email, phone, zip, room, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)",
      )
      .bind(newId(), data.name, data.email.toLowerCase(), data.phone, data.zip, data.room, data.message, nowIso())
      .run();
    return { ok: true };
  });

interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  customer_name: string;
  email: string | null;
  address: string | null;
  issue_date: string;
  due_date: string;
  notes: string | null;
  subtotal_cents: number;
  discount_cents: number;
  tax_rate_bps: number;
  tax_cents: number;
  total_cents: number;
  amount_paid_cents: number;
}

export const getPublicInvoice = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().max(80) }))
  .handler(async ({ data }) => {
    const DB = db();
    const inv = await DB.prepare(
      `SELECT id, number, status, customer_name, email, address, issue_date, due_date, notes, subtotal_cents,
              discount_cents, tax_rate_bps, tax_cents, total_cents, amount_paid_cents
       FROM invoices WHERE public_token = ? AND status != 'draft'`,
    ).bind(data.token).first<InvoiceRow>();
    if (!inv) return null;
    const items = await DB.prepare(
      "SELECT description, qty, unit_cents, total_cents FROM invoice_items WHERE invoice_id = ? ORDER BY position",
    ).bind(inv.id).all<{ description: string; qty: number; unit_cents: number; total_cents: number }>();
    const { id: _id, ...rest } = inv;
    return { ...rest, items: items.results, canPayOnline: paymentMode() !== "manual" };
  });

/** Starts (or reuses) a hosted card checkout for the invoice's balance. */
export const payInvoice = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().max(80) }))
  .handler(async ({ data }) => {
    const DB = db();
    const inv = await DB.prepare(
      "SELECT id, number, status, email, total_cents, amount_paid_cents, payment_link_url FROM invoices WHERE public_token = ?",
    ).bind(data.token).first<{
      id: string; number: string; status: string; email: string | null;
      total_cents: number; amount_paid_cents: number; payment_link_url: string | null;
    }>();
    if (!inv || inv.status === "draft" || inv.status === "void") throw new Error("This invoice is not available.");
    const balance = inv.total_cents - inv.amount_paid_cents;
    if (balance <= 0) throw new Error("This invoice is already paid.");
    const adapter = paymentAdapter();
    if (!adapter) throw new Error("Online card payment is not enabled yet. Please contact us to pay.");

    const session = await adapter.createCheckout({
      idempotencyKey: `${inv.id}-${balance}-${Math.floor(Date.now() / 3_600_000)}`,
      reference: inv.number,
      lines: [{ name: `Invoice ${inv.number}`, qty: 1, unitCents: balance }],
      email: inv.email,
      redirectUrl: `${requestOrigin()}/invoice/${data.token}?paid=1`,
      cancelUrl: `${requestOrigin()}/invoice/${data.token}`,
    });
    await DB.prepare(
      "UPDATE invoices SET payment_provider = ?, provider_order_id = ?, payment_link_url = ?, updated_at = ? WHERE id = ?",
    ).bind(adapter.mode, session.providerOrderId, session.url, nowIso(), inv.id).run();
    return { url: session.url };
  });

/** Starts a fresh hosted checkout for an order's remaining balance. */
export const payOrder = createServerFn({ method: "POST" })
  .validator(z.object({ number: z.string().max(40), token: z.string().max(80) }))
  .handler(async ({ data }) => {
    const DB = db();
    const o = await DB.prepare(
      "SELECT id, number, email, status, total_cents, amount_paid_cents FROM orders WHERE number = ? AND public_token = ?",
    ).bind(data.number, data.token).first<{
      id: string; number: string; email: string; status: string; total_cents: number; amount_paid_cents: number;
    }>();
    if (!o || o.status === "cancelled") throw new Error("This order is not available.");
    const balance = o.total_cents - o.amount_paid_cents;
    if (balance <= 0) throw new Error("This order is already paid.");
    const adapter = paymentAdapter();
    if (!adapter) throw new Error("Online card payment is not enabled yet. We will send you an invoice.");

    const orderUrl = `${requestOrigin()}/order/${o.number}?t=${data.token}`;
    const session = await adapter.createCheckout({
      idempotencyKey: `${o.id}-${balance}-${Math.floor(Date.now() / 3_600_000)}`,
      reference: o.number,
      lines: [{ name: `Order ${o.number}`, qty: 1, unitCents: balance }],
      email: o.email,
      redirectUrl: `${orderUrl}&paid=1`,
      cancelUrl: orderUrl,
    });
    await DB.prepare(
      "UPDATE orders SET payment_provider = ?, provider_order_id = ?, payment_link_url = ?, updated_at = ? WHERE id = ?",
    ).bind(adapter.mode, session.providerOrderId, session.url, nowIso(), o.id).run();
    return { url: session.url };
  });
