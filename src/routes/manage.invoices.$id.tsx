import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Copy, ExternalLink, Printer } from "lucide-react";
import { useState, type FormEvent } from "react";

import { InvoiceDocument } from "@/components/site/invoice-document";
import { InvoiceEditor, centsToInput } from "@/components/site/invoice-editor";
import { PAYMENT_METHODS, parseMoney, shortDate } from "@/components/site/portal-bits";
import { getInvoiceAdmin, invoiceAction, recordInvoicePayment } from "@/lib/api/admin.functions";
import { money } from "@/lib/catalog";

export const Route = createFileRoute("/manage/invoices/$id")({
  loader: ({ params }) => getInvoiceAdmin({ data: { id: params.id } }),
  component: InvoiceAdmin,
});

function InvoiceAdmin() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!data) return <p className="mb-muted">Invoice not found. <Link to="/manage/invoices">Back to invoices</Link></p>;
  const { invoice: inv, items, payments, orderNumber, origin } = data;
  const balance = inv.total_cents - inv.amount_paid_cents;
  const publicUrl = `${origin}/invoice/${inv.public_token}`;
  const locked = inv.status === "paid" || inv.status === "void";

  async function act(action: "send" | "void" | "reopen" | "payment_link", ok: string) {
    setBusy(true);
    setMsg(null);
    try {
      await invoiceAction({ data: { id: inv.id, action } });
      await router.invalidate();
      setMsg({ ok: true, text: ok });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "That did not work." });
    } finally {
      setBusy(false);
    }
  }

  async function onPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const cents = parseMoney(String(f.get("amount") ?? ""));
    if (!cents) {
      setMsg({ ok: false, text: "Enter an amount, like 1250 or 1,250.00." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await recordInvoicePayment({ data: { id: inv.id, amountCents: cents, method: String(f.get("method")), reference: String(f.get("reference") ?? "") } });
      form.reset();
      await router.invalidate();
      setMsg({ ok: true, text: "Payment recorded." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "That did not save." });
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <>
        <div className="mb-main__head">
          <div>
            <p className="mb-eyebrow" style={{ marginBottom: "0.3rem" }}><Link to="/manage/invoices">Invoices</Link> / {inv.number}</p>
            <h1 className="mb-h2">Edit {inv.number}</h1>
          </div>
          <button type="button" className="cta-quiet" onClick={() => setEditing(false)}>Cancel</button>
        </div>
        <InvoiceEditor
          initial={{
            id: inv.id,
            orderId: inv.order_id,
            customerName: inv.customer_name,
            email: inv.email ?? "",
            phone: inv.phone ?? "",
            address: inv.address ?? "",
            issueDate: inv.issue_date,
            dueDate: inv.due_date,
            notes: inv.notes ?? "",
            discount: inv.discount_cents ? centsToInput(inv.discount_cents) : "",
            taxRate: String(inv.tax_rate_bps / 100),
            lines: items.map((i) => ({ description: i.description, qty: String(i.qty), unit: centsToInput(i.unit_cents), taxable: i.taxable !== 0 })),
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-main__head mb-noprint">
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.3rem" }}>
            <Link to="/manage/invoices">Invoices</Link> / {inv.number}
            {orderNumber ? <> · <Link to="/manage/orders/$number" params={{ number: orderNumber }}>Order {orderNumber}</Link></> : null}
          </p>
          <h1 className="mb-h2">{inv.customer_name}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {!locked ? <button type="button" className="cta-quiet" onClick={() => setEditing(true)}>Edit</button> : null}
          {inv.status === "draft" ? (
            <button type="button" className="cta-quiet" data-variant="ink" disabled={busy} onClick={() => act("send", "Marked as sent. Share the customer link below.")}>Mark as sent</button>
          ) : null}
          <button type="button" className="cta-quiet" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button>
          {inv.status === "void" ? (
            <button type="button" className="cta-quiet" disabled={busy} onClick={() => act("reopen", "Reopened as a draft.")}>Reopen</button>
          ) : inv.status !== "paid" ? (
            <button type="button" className="cta-quiet" data-variant="danger" disabled={busy} onClick={() => act("void", "Invoice voided.")}>Void</button>
          ) : null}
        </div>
      </div>

      {msg ? <p className={`${msg.ok ? "mb-success" : "mb-error"} mb-noprint`} role="status" style={{ marginBottom: "1rem" }}>{msg.text}</p> : null}

      <div className="mb-two">
        <InvoiceDocument inv={{ ...inv, items }} />
        <div className="mb-noprint">
          {inv.status !== "draft" ? (
            <section className="mb-panel">
              <h3>Customer link</h3>
              <p className="mb-note" style={{ marginTop: 0 }}>Send this link by email or text. The customer can view, print and pay the invoice by card there; each visit opens a fresh secure checkout.</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input className="mb-input" readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} style={{ fontSize: "0.82rem" }} />
                <button type="button" className="cta-quiet" aria-label="Copy link" onClick={() => navigator.clipboard?.writeText(publicUrl).then(() => setMsg({ ok: true, text: "Link copied." }))}>
                  <Copy size={14} />
                </button>
              </div>
              <p style={{ marginBottom: 0 }}><a href={publicUrl} target="_blank" rel="noreferrer" className="cta-quiet"><ExternalLink size={14} /> Open customer view</a></p>

            </section>
          ) : (
            <section className="mb-panel">
              <h3>Draft</h3>
              <p className="mb-note" style={{ margin: 0 }}>Customers cannot see drafts. Mark it as sent to get a shareable link.</p>
            </section>
          )}

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
            {inv.status !== "void" && balance > 0 ? (
              <form className="mb-form" onSubmit={onPayment} style={{ marginTop: "1rem" }}>
                <label className="mb-field"><span>Amount</span><input name="amount" inputMode="decimal" placeholder={centsToInput(balance)} /></label>
                <label className="mb-field"><span>Method</span><select name="method">{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
                <label className="mb-field mb-span"><span>Reference</span><input name="reference" /></label>
                <div className="mb-span"><button type="submit" className="cta-quiet" data-variant="ink" disabled={busy}>Record payment</button></div>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
