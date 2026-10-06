/**
 * Recording money against an order or invoice. Used by the payment webhook
 * (card payments) and by the portal (cash, check, Zelle, terminal payments).
 */
import { db, newId, nowIso } from "./db.server";

export type PaymentTarget = "order" | "invoice";

export async function recordPayment(
  target: PaymentTarget,
  targetId: string,
  amountCents: number,
  method: string,
  reference: string | null,
): Promise<void> {
  const DB = db();
  const table = target === "order" ? "orders" : "invoices";
  const row = await DB.prepare(`SELECT total_cents, amount_paid_cents, status FROM ${table} WHERE id = ?`)
    .bind(targetId)
    .first<{ total_cents: number; amount_paid_cents: number; status: string }>();
  if (!row) throw new Error("Record not found.");

  const paid = row.amount_paid_cents + amountCents;
  const now = nowIso();
  const statements = [
    DB.prepare(
      "INSERT INTO payments (id, target_type, target_id, amount_cents, method, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(newId(), target, targetId, amountCents, method, reference, now),
  ];

  if (target === "order") {
    const paymentStatus = paid >= row.total_cents ? "paid" : paid > 0 ? "partially_paid" : "unpaid";
    statements.push(
      DB.prepare("UPDATE orders SET amount_paid_cents = ?, payment_status = ?, updated_at = ? WHERE id = ?")
        .bind(paid, paymentStatus, now, targetId),
      DB.prepare(
        "INSERT INTO order_events (order_id, status, note, visible, author, created_at) VALUES (?, NULL, ?, 1, 'system', ?)",
      ).bind(targetId, `Payment received: $${(amountCents / 100).toFixed(2)} (${method}).`, now),
    );
  } else {
    const status = row.status === "void" ? "void" : paid >= row.total_cents ? "paid" : paid > 0 ? "partially_paid" : row.status;
    statements.push(
      DB.prepare("UPDATE invoices SET amount_paid_cents = ?, status = ?, updated_at = ? WHERE id = ?")
        .bind(paid, status, now, targetId),
    );
  }
  await DB.batch(statements);
}
