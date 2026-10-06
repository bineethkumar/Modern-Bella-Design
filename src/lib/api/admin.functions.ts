/**
 * Management portal server functions. Every handler that reads or changes
 * business data starts with requireAdmin(), so the portal pages are only a
 * convenience: the data itself is guarded here.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { currentAdmin, loginConfigured, requireAdmin, signIn, signOut } from "../auth.server";
import { db, newId, nowIso, randomToken, requestOrigin } from "../db.server";
import { recordPayment } from "../ledger.server";
import { paymentAdapter, paymentMode } from "../payments/index.server";
import { ALL_ORDER_STATUS_IDS } from "../statuses";
import { TAX_RATE } from "../store-config";

/* ---------- session ---------- */

export const getAdmin = createServerFn({ method: "GET" }).handler(async () => {
  const admin = await currentAdmin();
  return { admin, configured: loginConfigured() };
});

export const adminSignIn = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().trim().max(160), password: z.string().max(200) }))
  .handler(async ({ data }) => signIn(data.email, data.password));

export const adminSignOut = createServerFn({ method: "POST" }).handler(async () => {
  await signOut();
  return { ok: true };
});

/* ---------- dashboard ---------- */

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const DB = db();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [open, month, outstanding, overdue, leads, recent, overdueList] = await Promise.all([
    DB.prepare("SELECT COUNT(*)::int AS n FROM orders WHERE status NOT IN ('completed','cancelled')").first<{ n: number }>(),
    DB.prepare("SELECT COALESCE(SUM(amount_cents),0)::float8 AS c FROM payments WHERE created_at >= ?").bind(monthStart).first<{ c: number }>(),
    DB.prepare(
      "SELECT COALESCE(SUM(total_cents - amount_paid_cents),0)::float8 AS c FROM invoices WHERE status IN ('sent','partially_paid')",
    ).first<{ c: number }>(),
    DB.prepare(
      "SELECT COUNT(*)::int AS n FROM invoices WHERE status IN ('sent','partially_paid') AND due_date < ?",
    ).bind(today).first<{ n: number }>(),
    DB.prepare("SELECT COUNT(*)::int AS n FROM consultations WHERE status = 'new'").first<{ n: number }>(),
    DB.prepare(
      "SELECT number, customer_name, status, payment_status, total_cents, created_at FROM orders ORDER BY created_at DESC LIMIT 8",
    ).all<{ number: string; customer_name: string; status: string; payment_status: string; total_cents: number; created_at: string }>(),
    DB.prepare(
      `SELECT id, number, customer_name, due_date, total_cents - amount_paid_cents AS balance_cents
       FROM invoices WHERE status IN ('sent','partially_paid') AND due_date < ? ORDER BY due_date LIMIT 8`,
    ).bind(today).all<{ id: string; number: string; customer_name: string; due_date: string; balance_cents: number }>(),
  ]);
  return {
    openOrders: open?.n ?? 0,
    collectedThisMonth: month?.c ?? 0,
    outstanding: outstanding?.c ?? 0,
    overdueCount: overdue?.n ?? 0,
    newLeads: leads?.n ?? 0,
    recent: recent.results,
    overdue: overdueList.results,
    paymentMode: paymentMode(),
  };
});

/* ---------- orders ---------- */

export const listOrders = createServerFn({ method: "GET" })
  .validator(z.object({ status: z.string().max(30).optional(), q: z.string().max(80).optional() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const where: string[] = [];
    const args: (string | number)[] = [];
    if (data.status === "open") where.push("status NOT IN ('completed','cancelled')");
    else if (data.status && ALL_ORDER_STATUS_IDS.includes(data.status)) {
      where.push("status = ?");
      args.push(data.status);
    }
    if (data.q) {
      where.push("(number ILIKE ? OR customer_name ILIKE ? OR email ILIKE ? OR phone ILIKE ?)");
      const like = `%${data.q}%`;
      args.push(like, like, like, like);
    }
    const sql = `SELECT number, customer_name, email, status, payment_status, fulfilment, install, total_cents, amount_paid_cents, created_at
      FROM orders ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 200`;
    const rows = await db().prepare(sql).bind(...args).all<{
      number: string; customer_name: string; email: string; status: string; payment_status: string;
      fulfilment: string; install: number; total_cents: number; amount_paid_cents: number; created_at: string;
    }>();
    return rows.results;
  });

export const getOrderAdmin = createServerFn({ method: "GET" })
  .validator(z.object({ number: z.string().max(40) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const DB = db();
    const order = await DB.prepare("SELECT * FROM orders WHERE number = ?").bind(data.number).first<Record<string, unknown> & { id: string }>();
    if (!order) return null;
    const [items, events, payments, invoices] = await Promise.all([
      DB.prepare("SELECT sku, name, finish_label, qty, unit_cents, total_cents FROM order_items WHERE order_id = ? ORDER BY id").bind(order.id)
        .all<{ sku: string; name: string; finish_label: string | null; qty: number; unit_cents: number; total_cents: number }>(),
      DB.prepare("SELECT id, status, note, visible, author, created_at FROM order_events WHERE order_id = ? ORDER BY id DESC").bind(order.id)
        .all<{ id: number; status: string | null; note: string | null; visible: number; author: string | null; created_at: string }>(),
      DB.prepare("SELECT amount_cents, method, reference, created_at FROM payments WHERE target_type = 'order' AND target_id = ? ORDER BY created_at DESC").bind(order.id)
        .all<{ amount_cents: number; method: string; reference: string | null; created_at: string }>(),
      DB.prepare("SELECT id, number, status, total_cents FROM invoices WHERE order_id = ? ORDER BY created_at DESC").bind(order.id)
        .all<{ id: string; number: string; status: string; total_cents: number }>(),
    ]);
    return {
      order: order as {
        id: string; number: string; public_token: string; status: string; payment_status: string;
        payment_provider: string | null; customer_name: string; email: string; phone: string;
        address_line1: string | null; address_line2: string | null; city: string | null; state: string | null; zip: string | null;
        fulfilment: string; install: number; haul: number; notes: string | null;
        subtotal_cents: number; install_cents: number; haul_cents: number; delivery_cents: number; tax_cents: number;
        total_cents: number; amount_paid_cents: number; created_at: string;
      },
      items: items.results,
      events: events.results,
      payments: payments.results,
      invoices: invoices.results,
    };
  });

export const updateOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      number: z.string().max(40),
      status: z.string().max(30).optional(),
      note: z.string().trim().max(2000).optional(),
      visible: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    const DB = db();
    const order = await DB.prepare("SELECT id, status FROM orders WHERE number = ?").bind(data.number).first<{ id: string; status: string }>();
    if (!order) throw new Error("Order not found.");
    const changed = data.status && data.status !== order.status;
    if (data.status && !ALL_ORDER_STATUS_IDS.includes(data.status)) throw new Error("Unknown status.");
    if (!changed && !data.note) return { ok: true };
    const now = nowIso();
    const stmts = [
      DB.prepare(
        "INSERT INTO order_events (order_id, status, note, visible, author, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(order.id, changed ? data.status! : null, data.note || null, data.visible ? 1 : 0, admin.email, now),
    ];
    if (changed) {
      stmts.push(DB.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").bind(data.status!, now, order.id));
    }
    await DB.batch(stmts);
    return { ok: true };
  });

const paymentSchema = z.object({
  amountCents: z.number().int().min(1).max(100_000_000),
  method: z.string().trim().min(2).max(40),
  reference: z.string().trim().max(120).optional().default(""),
});

export const recordOrderPayment = createServerFn({ method: "POST" })
  .validator(paymentSchema.extend({ number: z.string().max(40) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const order = await db().prepare("SELECT id FROM orders WHERE number = ?").bind(data.number).first<{ id: string }>();
    if (!order) throw new Error("Order not found.");
    await recordPayment("order", order.id, data.amountCents, data.method, data.reference || null);
    return { ok: true };
  });

/* ---------- invoices ---------- */

const invoiceSchema = z.object({
  id: z.string().max(60).optional(),
  orderId: z.string().max(60).nullable().optional(),
  customerName: z.string().trim().min(2).max(120),
  email: z.string().trim().max(160).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(400).optional().default(""),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(2000).optional().default(""),
  discountCents: z.number().int().min(0).max(100_000_000).default(0),
  taxRateBps: z.number().int().min(0).max(2500).default(Math.round(TAX_RATE * 10000)),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(300),
        qty: z.number().min(0.01).max(100000),
        unitCents: z.number().int().min(0).max(100_000_000),
        taxable: z.boolean().default(true),
      }),
    )
    .min(1)
    .max(200),
});

function invoiceTotals(items: z.infer<typeof invoiceSchema>["items"], discountCents: number, taxRateBps: number) {
  const lines = items.map((i) => ({ ...i, totalCents: Math.round(i.qty * i.unitCents) }));
  const subtotal = lines.reduce((a, l) => a + l.totalCents, 0);
  const taxableBase = Math.max(0, lines.filter((l) => l.taxable).reduce((a, l) => a + l.totalCents, 0) - discountCents);
  const tax = Math.round((taxableBase * taxRateBps) / 10000);
  return { lines, subtotal, tax, total: Math.max(0, subtotal - discountCents + tax) };
}

export const listInvoices = createServerFn({ method: "GET" })
  .validator(z.object({ status: z.string().max(30).optional(), q: z.string().max(80).optional() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const where: string[] = [];
    const args: string[] = [];
    const today = new Date().toISOString().slice(0, 10);
    if (data.status === "overdue") {
      where.push("status IN ('sent','partially_paid') AND due_date < ?");
      args.push(today);
    } else if (data.status === "unpaid") {
      where.push("status IN ('sent','partially_paid')");
    } else if (data.status) {
      where.push("status = ?");
      args.push(data.status);
    }
    if (data.q) {
      where.push("(number ILIKE ? OR customer_name ILIKE ? OR email ILIKE ?)");
      args.push(`%${data.q}%`, `%${data.q}%`, `%${data.q}%`);
    }
    const rows = await db()
      .prepare(
        `SELECT id, number, customer_name, status, issue_date, due_date, total_cents, amount_paid_cents
         FROM invoices ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY seq DESC LIMIT 300`,
      )
      .bind(...args)
      .all<{ id: string; number: string; customer_name: string; status: string; issue_date: string; due_date: string; total_cents: number; amount_paid_cents: number }>();
    return rows.results;
  });

export const getInvoiceAdmin = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().max(60) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const DB = db();
    const invoice = await DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(data.id).first<{
      id: string; number: string; public_token: string; order_id: string | null; status: string;
      customer_name: string; email: string | null; phone: string | null; address: string | null;
      issue_date: string; due_date: string; notes: string | null; subtotal_cents: number; discount_cents: number;
      tax_rate_bps: number; tax_cents: number; total_cents: number; amount_paid_cents: number;
      payment_link_url: string | null; created_at: string;
    }>();
    if (!invoice) return null;
    const [items, payments, order] = await Promise.all([
      DB.prepare("SELECT description, qty, unit_cents, total_cents, taxable FROM invoice_items WHERE invoice_id = ? ORDER BY position").bind(data.id)
        .all<{ description: string; qty: number; unit_cents: number; total_cents: number; taxable: number }>(),
      DB.prepare("SELECT amount_cents, method, reference, created_at FROM payments WHERE target_type = 'invoice' AND target_id = ? ORDER BY created_at DESC").bind(data.id)
        .all<{ amount_cents: number; method: string; reference: string | null; created_at: string }>(),
      invoice.order_id
        ? DB.prepare("SELECT number FROM orders WHERE id = ?").bind(invoice.order_id).first<{ number: string }>()
        : Promise.resolve(null),
    ]);
    return { invoice, items: items.results, payments: payments.results, orderNumber: order?.number ?? null, origin: requestOrigin() };
  });

/** A draft prefilled from an order, for the "Create invoice" button. */
export const draftFromOrder = createServerFn({ method: "GET" })
  .validator(z.object({ number: z.string().max(40) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const DB = db();
    const o = await DB.prepare("SELECT * FROM orders WHERE number = ?").bind(data.number).first<{
      id: string; customer_name: string; email: string; phone: string; address_line1: string | null; address_line2: string | null;
      city: string | null; state: string | null; zip: string | null; install_cents: number; haul_cents: number; delivery_cents: number;
      amount_paid_cents: number;
    }>();
    if (!o) return null;
    const items = await DB.prepare("SELECT sku, name, finish_label, qty, unit_cents FROM order_items WHERE order_id = ? ORDER BY id")
      .bind(o.id)
      .all<{ sku: string; name: string; finish_label: string | null; qty: number; unit_cents: number }>();
    const lines = items.results.map((i) => ({
      description: `${i.name} ${i.sku}${i.finish_label ? `, ${i.finish_label}` : ""}`,
      qty: i.qty,
      unitCents: i.unit_cents,
      taxable: true,
    }));
    if (o.install_cents) lines.push({ description: "Installation", qty: 1, unitCents: o.install_cents, taxable: false });
    if (o.haul_cents) lines.push({ description: "Old cabinet removal", qty: 1, unitCents: o.haul_cents, taxable: false });
    if (o.delivery_cents) lines.push({ description: "Delivery", qty: 1, unitCents: o.delivery_cents, taxable: false });
    const address = [o.address_line1, o.address_line2, [o.city, o.state, o.zip].filter(Boolean).join(" ")].filter(Boolean).join("\n");
    return { orderId: o.id, customerName: o.customer_name, email: o.email, phone: o.phone, address, items: lines, alreadyPaidCents: o.amount_paid_cents };
  });

export const saveInvoice = createServerFn({ method: "POST" })
  .validator(invoiceSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    const DB = db();
    const t = invoiceTotals(data.items, data.discountCents, data.taxRateBps);
    const now = nowIso();
    let id = data.id;

    if (id) {
      const existing = await DB.prepare("SELECT status FROM invoices WHERE id = ?").bind(id).first<{ status: string }>();
      if (!existing) throw new Error("Invoice not found.");
      if (existing.status === "paid" || existing.status === "void") throw new Error("Paid or void invoices cannot be edited.");
      await DB.batch([
        DB.prepare(
          `UPDATE invoices SET customer_name = ?, email = ?, phone = ?, address = ?, issue_date = ?, due_date = ?, notes = ?,
             subtotal_cents = ?, discount_cents = ?, tax_rate_bps = ?, tax_cents = ?, total_cents = ?,
             payment_link_url = NULL, provider_order_id = NULL, updated_at = ? WHERE id = ?`,
        ).bind(
          data.customerName, data.email, data.phone, data.address, data.issueDate, data.dueDate, data.notes,
          t.subtotal, data.discountCents, data.taxRateBps, t.tax, t.total, now, id,
        ),
        DB.prepare("DELETE FROM invoice_items WHERE invoice_id = ?").bind(id),
        ...t.lines.map((l, i) =>
          DB.prepare("INSERT INTO invoice_items (invoice_id, position, description, qty, unit_cents, total_cents, taxable) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .bind(id!, i, l.description, l.qty, l.unitCents, l.totalCents, l.taxable ? 1 : 0),
        ),
      ]);
      return { id };
    }

    id = newId();
    const year = data.issueDate.slice(0, 4);
    const last = await DB.prepare("SELECT COALESCE(MAX(seq), 0) AS s FROM invoices").first<{ s: number }>();
    const seq = (last?.s ?? 0) + 1;
    const number = `INV-${year}-${String(seq).padStart(4, "0")}`;
    await DB.batch([
      DB.prepare(
        `INSERT INTO invoices (id, number, seq, public_token, order_id, status, customer_name, email, phone, address,
           issue_date, due_date, notes, subtotal_cents, discount_cents, tax_rate_bps, tax_cents, total_cents, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id, number, seq, randomToken(), data.orderId ?? null, data.customerName, data.email, data.phone, data.address,
        data.issueDate, data.dueDate, data.notes, t.subtotal, data.discountCents, data.taxRateBps, t.tax, t.total, now, now,
      ),
      ...t.lines.map((l, i) =>
        DB.prepare("INSERT INTO invoice_items (invoice_id, position, description, qty, unit_cents, total_cents, taxable) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(id!, i, l.description, l.qty, l.unitCents, l.totalCents, l.taxable ? 1 : 0),
      ),
    ]);
    return { id };
  });

export const invoiceAction = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().max(60), action: z.enum(["send", "void", "reopen", "payment_link"]) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const DB = db();
    const inv = await DB.prepare(
      "SELECT id, number, status, email, public_token, total_cents, amount_paid_cents FROM invoices WHERE id = ?",
    ).bind(data.id).first<{ id: string; number: string; status: string; email: string | null; public_token: string; total_cents: number; amount_paid_cents: number }>();
    if (!inv) throw new Error("Invoice not found.");
    const now = nowIso();

    if (data.action === "send") {
      if (inv.status !== "draft") return { ok: true };
      await DB.prepare("UPDATE invoices SET status = 'sent', updated_at = ? WHERE id = ?").bind(now, inv.id).run();
    } else if (data.action === "void") {
      if (inv.amount_paid_cents > 0) throw new Error("This invoice has payments recorded. Refund them first, then void.");
      await DB.prepare("UPDATE invoices SET status = 'void', updated_at = ? WHERE id = ?").bind(now, inv.id).run();
    } else if (data.action === "reopen") {
      if (inv.status !== "void") return { ok: true };
      await DB.prepare("UPDATE invoices SET status = 'draft', updated_at = ? WHERE id = ?").bind(now, inv.id).run();
    } else {
      const adapter = paymentAdapter();
      if (!adapter) throw new Error("Connect Square (or Toast) in the website settings to create card payment links.");
      const balance = inv.total_cents - inv.amount_paid_cents;
      if (balance <= 0) throw new Error("Nothing left to pay on this invoice.");
      const session = await adapter.createCheckout({
        idempotencyKey: `${inv.id}-${balance}`,
        reference: inv.number,
        lines: [{ name: `Invoice ${inv.number}`, qty: 1, unitCents: balance }],
        email: inv.email,
        redirectUrl: `${requestOrigin()}/invoice/${inv.public_token}?paid=1`,
      });
      await DB.prepare(
        "UPDATE invoices SET payment_provider = ?, provider_order_id = ?, payment_link_url = ?, status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END, updated_at = ? WHERE id = ?",
      ).bind(adapter.mode, session.providerOrderId, session.url, now, inv.id).run();
    }
    return { ok: true };
  });

export const recordInvoicePayment = createServerFn({ method: "POST" })
  .validator(paymentSchema.extend({ id: z.string().max(60) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await recordPayment("invoice", data.id, data.amountCents, data.method, data.reference || null);
    return { ok: true };
  });

/* ---------- consultations ---------- */

export const listConsultations = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const rows = await db()
    .prepare("SELECT id, name, email, phone, zip, room, message, status, created_at FROM consultations ORDER BY created_at DESC LIMIT 300")
    .all<{ id: string; name: string; email: string; phone: string | null; zip: string | null; room: string | null; message: string | null; status: string; created_at: string }>();
  return rows.results;
});

export const updateConsultation = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().max(60), status: z.enum(["new", "contacted", "booked", "closed"]) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    await db().prepare("UPDATE consultations SET status = ? WHERE id = ?").bind(data.status, data.id).run();
    return { ok: true };
  });
