import { money } from "@/lib/catalog";
import { INVOICE_STATUS_LABEL, invoiceDisplayStatus } from "@/lib/statuses";
import { BRAND } from "@/lib/store-config";

export interface InvoiceDoc {
  number: string;
  status: string;
  customer_name: string;
  email: string | null;
  phone?: string | null;
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
  items: { description: string; qty: number; unit_cents: number; total_cents: number }[];
}

const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export function statusTone(status: string): "ok" | "warn" | "bad" | "gold" | undefined {
  if (status === "paid") return "ok";
  if (status === "overdue") return "bad";
  if (status === "sent" || status === "partially_paid") return "warn";
  if (status === "void") return undefined;
  return "gold";
}

/** The printable invoice, shared by the customer page and the portal. */
export function InvoiceDocument({ inv }: { inv: InvoiceDoc }) {
  const display = invoiceDisplayStatus(inv.status, inv.due_date);
  const balance = inv.total_cents - inv.amount_paid_cents;
  return (
    <article className="mb-doc">
      <header className="mb-doc__head">
        <img src="/assets/brand/logo-ink@sm.png" alt="Modern Bella Design" width={800} height={247} />
        <div className="mb-doc__meta">
          <strong>Invoice</strong>
          <span className="mb-num">{inv.number}</span>
          <span>Issued {fmt(inv.issue_date)}</span>
          <span>Due {fmt(inv.due_date)}</span>
          <span><span className="mb-pill" data-tone={statusTone(display)}>{INVOICE_STATUS_LABEL[display] ?? display}</span></span>
        </div>
      </header>
      <div className="mb-doc__parties">
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.5rem" }}>From</p>
          <strong>{BRAND.legalName}</strong>
          {"\n"}{BRAND.city}
        </div>
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.5rem" }}>Bill to</p>
          <strong>{inv.customer_name}</strong>
          {inv.address ? `\n${inv.address}` : ""}
          {inv.email ? `\n${inv.email}` : ""}
          {inv.phone ? `\n${inv.phone}` : ""}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th className="mb-r">Qty</th>
              <th className="mb-r">Unit</th>
              <th className="mb-r">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i}>
                <td>{it.description}</td>
                <td className="mb-r mb-num">{it.qty}</td>
                <td className="mb-r mb-num">{money(it.unit_cents, { cents: true })}</td>
                <td className="mb-r mb-num">{money(it.total_cents, { cents: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-doc__totals">
        <div className="mb-sumrow"><span>Subtotal</span><span className="mb-num">{money(inv.subtotal_cents, { cents: true })}</span></div>
        {inv.discount_cents ? <div className="mb-sumrow"><span>Discount</span><span className="mb-num">−{money(inv.discount_cents, { cents: true })}</span></div> : null}
        <div className="mb-sumrow"><span>Tax ({(inv.tax_rate_bps / 100).toFixed(2)}%)</span><span className="mb-num">{money(inv.tax_cents, { cents: true })}</span></div>
        <div className="mb-sumrow mb-sumrow--total"><span>Total</span><span className="mb-num">{money(inv.total_cents, { cents: true })}</span></div>
        {inv.amount_paid_cents ? <div className="mb-sumrow"><span>Paid</span><span className="mb-num">−{money(inv.amount_paid_cents, { cents: true })}</span></div> : null}
        <div className="mb-sumrow" style={{ fontWeight: 500 }}><span>Balance due</span><span className="mb-num">{money(Math.max(0, balance), { cents: true })}</span></div>
      </div>
      {inv.notes ? <p className="mb-note" style={{ marginTop: "2rem", whiteSpace: "pre-line" }}>{inv.notes}</p> : null}
    </article>
  );
}
