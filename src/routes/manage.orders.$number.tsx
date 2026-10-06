import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useState, type FormEvent } from "react";

import { OrderStatusPill, PAYMENT_METHODS, PaymentPill, parseMoney, shortDate } from "@/components/site/portal-bits";
import { getOrderAdmin, recordOrderPayment, updateOrder } from "@/lib/api/admin.functions";
import { money } from "@/lib/catalog";
import { ALL_ORDER_STATUS_IDS, INVOICE_STATUS_LABEL, orderStatusLabel } from "@/lib/statuses";

export const Route = createFileRoute("/manage/orders/$number")({
  loader: ({ params }) => getOrderAdmin({ data: { number: params.number } }),
  component: OrderAdmin,
});

function OrderAdmin() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!data) return <p className="mb-muted">Order not found. <Link to="/manage/orders">Back to orders</Link></p>;
  const { order: o, items, events, payments, invoices } = data;
  const balance = o.total_cents - o.amount_paid_cents;
  const trackUrl = `/order/${o.number}?t=${o.public_token}`;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      await router.invalidate();
      setMsg({ ok: true, text: ok });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "That did not save." });
    } finally {
      setBusy(false);
    }
  }

  function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    void run(
      () =>
        updateOrder({
          data: {
            number: o.number,
            status: String(f.get("status")),
            note: String(f.get("note") ?? ""),
            visible: f.get("visible") === "on",
          },
        }).then(() => form.reset()),
      "Order updated. The customer's tracking page shows it now.",
    );
  }

  function onPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const cents = parseMoney(String(f.get("amount") ?? ""));
    if (!cents) {
      setMsg({ ok: false, text: "Enter an amount, like 1250 or 1,250.00." });
      return;
    }
    void run(
      () =>
        recordOrderPayment({
          data: { number: o.number, amountCents: cents, method: String(f.get("method")), reference: String(f.get("reference") ?? "") },
        }).then(() => form.reset()),
      "Payment recorded.",
    );
  }

  return (
    <>
      <div className="mb-main__head">
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.3rem" }}><Link to="/manage/orders">Orders</Link> / {o.number}</p>
          <h1 className="mb-h2">{o.customer_name}</h1>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.7rem", flexWrap: "wrap" }}>
            <OrderStatusPill status={o.status} />
            <PaymentPill status={o.payment_status} />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <a href={trackUrl} target="_blank" rel="noreferrer" className="cta-quiet"><ExternalLink size={14} /> Customer tracking page</a>
          <Link to="/manage/invoices/new" search={{ order: o.number }} className="cta-quiet" data-variant="ink">Create invoice</Link>
        </div>
      </div>

      {msg ? <p className={msg.ok ? "mb-success" : "mb-error"} role="status" style={{ marginBottom: "1rem" }}>{msg.text}</p> : null}

      <div className="mb-two">
        <div>
          <section className="mb-panel">
            <h3>Items</h3>
            <table className="mb-table">
              <thead><tr><th>SKU</th><th>Item</th><th className="mb-r">Qty</th><th className="mb-r">Unit</th><th className="mb-r">Total</th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.sku}</td>
                    <td>{it.name}<div className="mb-note">{it.finish_label ?? "No finish"}</div></td>
                    <td className="mb-r">{it.qty}</td>
                    <td className="mb-r mb-num">{money(it.unit_cents, { cents: true })}</td>
                    <td className="mb-r mb-num">{money(it.total_cents, { cents: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mb-doc__totals">
              <div className="mb-sumrow"><span>Merchandise</span><span className="mb-num">{money(o.subtotal_cents, { cents: true })}</span></div>
              {o.install_cents ? <div className="mb-sumrow"><span>Installation</span><span className="mb-num">{money(o.install_cents, { cents: true })}</span></div> : null}
              {o.haul_cents ? <div className="mb-sumrow"><span>Removal</span><span className="mb-num">{money(o.haul_cents, { cents: true })}</span></div> : null}
              <div className="mb-sumrow"><span>Delivery</span><span className="mb-num">{money(o.delivery_cents, { cents: true })}</span></div>
              <div className="mb-sumrow"><span>Tax</span><span className="mb-num">{money(o.tax_cents, { cents: true })}</span></div>
              <div className="mb-sumrow mb-sumrow--total"><span>Total</span><span className="mb-num">{money(o.total_cents, { cents: true })}</span></div>
              <div className="mb-sumrow"><span>Paid</span><span className="mb-num">{money(o.amount_paid_cents, { cents: true })}</span></div>
              <div className="mb-sumrow" style={{ fontWeight: 500 }}><span>Balance</span><span className="mb-num">{money(Math.max(0, balance), { cents: true })}</span></div>
            </div>
          </section>

          <section className="mb-panel">
            <h3>Update tracking</h3>
            <form className="mb-form" onSubmit={onUpdate}>
              <label className="mb-field">
                <span>Status</span>
                <select name="status" defaultValue={o.status} key={o.status}>
                  {ALL_ORDER_STATUS_IDS.map((s) => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}
                </select>
              </label>
              <label className="mb-check" style={{ alignSelf: "end", paddingBottom: "0.8rem" }}>
                <input type="checkbox" name="visible" defaultChecked />
                <span>Show this update to the customer</span>
              </label>
              <label className="mb-field mb-span">
                <span>Note (optional)</span>
                <textarea name="note" placeholder="e.g. Delivery booked for Tuesday between 8 and 10am." />
              </label>
              <div className="mb-span"><button type="submit" className="cta-quiet" data-variant="ink" disabled={busy}>Save update</button></div>
            </form>
          </section>

          <section className="mb-panel">
            <h3>History</h3>
            <ul className="mb-timeline">
              {events.map((e) => (
                <li key={e.id}>
                  <time>{new Date(e.created_at).toLocaleString("en-US")} · {e.author ?? "system"}{e.visible ? "" : " · internal"}</time>
                  <div>{e.status ? <strong>{orderStatusLabel(e.status)}. </strong> : null}{e.note}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div>
          <section className="mb-panel">
            <h3>Customer</h3>
            <dl className="mb-dl">
              <dt>Email</dt><dd><a href={`mailto:${o.email}`}>{o.email}</a></dd>
              <dt>Phone</dt><dd><a href={`tel:${o.phone}`}>{o.phone}</a></dd>
              <dt>{o.fulfilment === "pickup" ? "Billing" : "Deliver to"}</dt>
              <dd>{[o.address_line1, o.address_line2, [o.city, o.state, o.zip].filter(Boolean).join(" ")].filter(Boolean).join("\n") || "None given"}</dd>
              <dt>Service</dt><dd>{o.fulfilment === "pickup" ? "Pickup" : "Delivery"}{o.install ? ", installation" : ""}{o.haul ? ", removal" : ""}</dd>
              <dt>Placed</dt><dd>{shortDate(o.created_at)}</dd>
              {o.notes ? (<><dt>Notes</dt><dd>{o.notes}</dd></>) : null}
            </dl>
          </section>

          <section className="mb-panel">
            <h3>Payments</h3>
            {payments.length ? (
              <table className="mb-table">
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i}>
                      <td>{p.method}<div className="mb-note">{shortDate(p.created_at)}{p.reference ? ` · ${p.reference}` : ""}</div></td>
                      <td className="mb-r mb-num">{money(p.amount_cents, { cents: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mb-muted" style={{ marginTop: 0 }}>No payments yet.</p>
            )}
            <form className="mb-form" onSubmit={onPayment} style={{ marginTop: "1rem" }}>
              <label className="mb-field"><span>Amount</span><input name="amount" inputMode="decimal" placeholder={(Math.max(0, balance) / 100).toFixed(2)} /></label>
              <label className="mb-field">
                <span>Method</span>
                <select name="method">{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
              </label>
              <label className="mb-field mb-span"><span>Reference (check number, receipt)</span><input name="reference" /></label>
              <div className="mb-span"><button type="submit" className="cta-quiet" disabled={busy}>Record payment</button></div>
            </form>
          </section>

          <section className="mb-panel">
            <h3>Invoices</h3>
            {invoices.length ? (
              <table className="mb-table">
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td><Link to="/manage/invoices/$id" params={{ id: inv.id }}>{inv.number}</Link></td>
                      <td>{INVOICE_STATUS_LABEL[inv.status] ?? inv.status}</td>
                      <td className="mb-r mb-num">{money(inv.total_cents, { cents: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mb-muted" style={{ marginTop: 0 }}>None yet.</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
