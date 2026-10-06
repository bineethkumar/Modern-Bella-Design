import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { saveInvoice } from "@/lib/api/admin.functions";
import { money } from "@/lib/catalog";
import { TAX_RATE } from "@/lib/store-config";
import { parseMoney } from "./portal-bits";

export interface EditorLine {
  description: string;
  qty: string;
  unit: string;
  taxable: boolean;
}

export interface EditorInitial {
  id?: string;
  orderId?: string | null;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  discount: string;
  taxRate: string;
  lines: EditorLine[];
}

const blankLine = (): EditorLine => ({ description: "", qty: "1", unit: "", taxable: true });

export const centsToInput = (c: number) => (c / 100).toFixed(2);

export function emptyInvoice(dates: { issueDate: string; dueDate: string }): EditorInitial {
  return {
    customerName: "", email: "", phone: "", address: "", notes: "Thank you for choosing Modern Bella Design.",
    discount: "", taxRate: String(TAX_RATE * 100), lines: [blankLine()], ...dates,
  };
}

export function InvoiceEditor({ initial }: { initial: EditorInitial }) {
  const navigate = useNavigate();
  const [lines, setLines] = useState<EditorLine[]>(initial.lines.length ? initial.lines : [blankLine()]);
  const [discount, setDiscount] = useState(initial.discount);
  const [taxRate, setTaxRate] = useState(initial.taxRate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computed = lines.map((l) => Math.round((Number(l.qty) || 0) * (parseMoney(l.unit) ?? 0)));
  const subtotal = computed.reduce((a, b) => a + b, 0);
  const disc = parseMoney(discount) ?? 0;
  const taxable = Math.max(0, lines.reduce((a, l, i) => a + (l.taxable ? computed[i] : 0), 0) - disc);
  const tax = Math.round(taxable * ((Number(taxRate) || 0) / 100));
  const total = Math.max(0, subtotal - disc + tax);

  const update = (i: number, patch: Partial<EditorLine>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const items = lines
      .filter((l) => l.description.trim())
      .map((l) => ({ description: l.description.trim(), qty: Number(l.qty) || 1, unitCents: parseMoney(l.unit) ?? 0, taxable: l.taxable }));
    if (!items.length) {
      setError("Add at least one line item.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await saveInvoice({
        data: {
          id: initial.id,
          orderId: initial.orderId ?? null,
          customerName: String(f.get("customerName") ?? ""),
          email: String(f.get("email") ?? ""),
          phone: String(f.get("phone") ?? ""),
          address: String(f.get("address") ?? ""),
          issueDate: String(f.get("issueDate") ?? ""),
          dueDate: String(f.get("dueDate") ?? ""),
          notes: String(f.get("notes") ?? ""),
          discountCents: disc,
          taxRateBps: Math.round((Number(taxRate) || 0) * 100),
          items,
        },
      });
      await navigate({ to: "/manage/invoices/$id", params: { id: res.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The invoice did not save.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <section className="mb-panel">
        <h3>Customer</h3>
        <div className="mb-form">
          <label className="mb-field"><span>Name</span><input name="customerName" required defaultValue={initial.customerName} /></label>
          <label className="mb-field"><span>Email</span><input name="email" type="email" defaultValue={initial.email} /></label>
          <label className="mb-field"><span>Phone</span><input name="phone" defaultValue={initial.phone} /></label>
          <div className="mb-form" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="mb-field"><span>Issue date</span><input name="issueDate" type="date" required defaultValue={initial.issueDate} /></label>
            <label className="mb-field"><span>Due date</span><input name="dueDate" type="date" required defaultValue={initial.dueDate} /></label>
          </div>
          <label className="mb-field mb-span"><span>Billing address</span><textarea name="address" defaultValue={initial.address} style={{ minHeight: "4.5rem" }} /></label>
        </div>
      </section>

      <section className="mb-panel">
        <h3>Line items</h3>
        <div className="mb-items-editor">
          <div className="mb-items-editor__row mb-note" aria-hidden="true">
            <span>Description</span><span>Qty</span><span>Unit price</span><span>Taxed</span><span className="mb-r">Amount</span><span />
          </div>
          {lines.map((l, i) => (
            <div key={i} className="mb-items-editor__row">
              <input className="mb-input" aria-label="Description" value={l.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="e.g. B24 base cabinet, Emerald White" />
              <input className="mb-input" aria-label="Quantity" inputMode="decimal" value={l.qty} onChange={(e) => update(i, { qty: e.target.value })} />
              <input className="mb-input" aria-label="Unit price" inputMode="decimal" value={l.unit} onChange={(e) => update(i, { unit: e.target.value })} placeholder="0.00" />
              <label className="mb-check" style={{ justifyContent: "center" }}>
                <input type="checkbox" aria-label="Taxable" checked={l.taxable} onChange={(e) => update(i, { taxable: e.target.checked })} />
              </label>
              <span className="mb-r mb-num">{money(computed[i], { cents: true })}</span>
              <button type="button" className="mb-linkbtn" aria-label="Remove line" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : [blankLine()]))}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div><button type="button" className="cta-quiet" onClick={() => setLines((ls) => [...ls, blankLine()])}><Plus size={14} /> Add line</button></div>
        </div>
        <div className="mb-doc__totals">
          <div className="mb-sumrow"><span>Subtotal</span><span className="mb-num">{money(subtotal, { cents: true })}</span></div>
          <div className="mb-sumrow" style={{ alignItems: "center" }}>
            <span>Discount</span>
            <input className="mb-input" style={{ width: "8rem", padding: "0.4rem 0.6rem" }} inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0.00" aria-label="Discount" />
          </div>
          <div className="mb-sumrow" style={{ alignItems: "center" }}>
            <span>Tax rate %</span>
            <input className="mb-input" style={{ width: "8rem", padding: "0.4rem 0.6rem" }} inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} aria-label="Tax rate" />
          </div>
          <div className="mb-sumrow"><span>Tax</span><span className="mb-num">{money(tax, { cents: true })}</span></div>
          <div className="mb-sumrow mb-sumrow--total"><span>Total</span><span className="mb-num">{money(total, { cents: true })}</span></div>
        </div>
      </section>

      <section className="mb-panel">
        <h3>Notes on the invoice</h3>
        <label className="mb-field"><span>Payment terms, thank-you note</span><textarea name="notes" defaultValue={initial.notes} /></label>
      </section>

      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "1.4rem", flexWrap: "wrap" }}>
        <button type="submit" className="cta-quiet" data-variant="ink" disabled={busy} style={{ padding: "0.8rem 1.4rem" }}>
          {busy ? "Saving" : initial.id ? "Save changes" : "Save draft"}
        </button>
        {error ? <p className="mb-error" role="alert">{error}</p> : null}
      </div>
    </form>
  );
}
