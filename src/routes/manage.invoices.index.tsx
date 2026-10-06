import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { statusTone } from "@/components/site/invoice-document";
import { shortDate } from "@/components/site/portal-bits";
import { listInvoices } from "@/lib/api/admin.functions";
import { money } from "@/lib/catalog";
import { INVOICE_STATUS_LABEL, invoiceDisplayStatus } from "@/lib/statuses";

type S = { status?: string; q?: string };

export const Route = createFileRoute("/manage/invoices/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" && s.q ? s.q : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listInvoices({ data: { status: deps.status, q: deps.q } }),
  component: Invoices,
});

const FILTERS: [string | undefined, string][] = [
  [undefined, "All"], ["draft", "Drafts"], ["unpaid", "Unpaid"], ["overdue", "Overdue"], ["paid", "Paid"], ["void", "Void"],
];

function Invoices() {
  const rows = Route.useLoaderData();
  const { status, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/manage/invoices/" });
  const [query, setQuery] = useState(q ?? "");
  const outstanding = rows
    .filter((r) => r.status === "sent" || r.status === "partially_paid")
    .reduce((a, r) => a + r.total_cents - r.amount_paid_cents, 0);

  return (
    <>
      <div className="mb-main__head">
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.3rem" }}>Billing</p>
          <h1 className="mb-h2">Invoices</h1>
          <p className="mb-note" style={{ margin: "0.4rem 0 0" }}>Outstanding in this view: <strong className="mb-num">{money(outstanding, { cents: true })}</strong></p>
        </div>
        <Link to="/manage/invoices/new" className="cta-quiet" data-variant="ink">New invoice</Link>
      </div>
      <div className="mb-toolbar">
        <form style={{ display: "contents" }} onSubmit={(e) => { e.preventDefault(); navigate({ search: (s) => ({ ...s, q: query.trim() || undefined }) }); }}>
          <input className="mb-input" placeholder="Search invoice number, customer or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
      </div>
      <div className="mb-chips" style={{ marginBottom: "1.2rem" }}>
        {FILTERS.map(([id, label]) => (
          <button key={label} type="button" aria-pressed={status === id} onClick={() => navigate({ search: (s) => ({ ...s, status: id }) })}>{label}</button>
        ))}
      </div>
      <section className="mb-panel">
        {rows.length ? (
          <table className="mb-table">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Issued</th><th>Due</th><th>Status</th><th className="mb-r">Total</th><th className="mb-r">Balance</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const display = invoiceDisplayStatus(r.status, r.due_date);
                return (
                  <tr key={r.id}>
                    <td><Link to="/manage/invoices/$id" params={{ id: r.id }}>{r.number}</Link></td>
                    <td>{r.customer_name}</td>
                    <td>{shortDate(r.issue_date)}</td>
                    <td>{shortDate(r.due_date)}</td>
                    <td><span className="mb-pill" data-tone={statusTone(display)}>{INVOICE_STATUS_LABEL[display] ?? display}</span></td>
                    <td className="mb-r mb-num">{money(r.total_cents, { cents: true })}</td>
                    <td className="mb-r mb-num">{money(Math.max(0, r.total_cents - r.amount_paid_cents), { cents: true })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="mb-muted">No invoices here yet. Create one from scratch or from any order.</p>
        )}
      </section>
    </>
  );
}
