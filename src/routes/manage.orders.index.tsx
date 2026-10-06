import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { OrderStatusPill, PaymentPill, shortDate } from "@/components/site/portal-bits";
import { listOrders } from "@/lib/api/admin.functions";
import { money } from "@/lib/catalog";
import { CANCELLED, ORDER_STATUSES } from "@/lib/statuses";

type S = { status?: string; q?: string };

export const Route = createFileRoute("/manage/orders/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    status: typeof s.status === "string" ? s.status : undefined,
    q: typeof s.q === "string" && s.q ? s.q : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listOrders({ data: { status: deps.status ?? "open", q: deps.q } }),
  component: Orders,
});

const FILTERS = [
  { id: "open", label: "Open" },
  ...ORDER_STATUSES.map((s) => ({ id: s.id as string, label: s.label })),
  { id: CANCELLED.id, label: CANCELLED.label },
  { id: "all", label: "All" },
];

function Orders() {
  const rows = Route.useLoaderData();
  const { status = "open", q } = Route.useSearch();
  const navigate = useNavigate({ from: "/manage/orders/" });
  const [query, setQuery] = useState(q ?? "");

  return (
    <>
      <div className="mb-main__head">
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.3rem" }}>Orders &amp; tracking</p>
          <h1 className="mb-h2">Orders</h1>
        </div>
      </div>
      <div className="mb-toolbar">
        <form
          style={{ display: "contents" }}
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ search: (s) => ({ ...s, q: query.trim() || undefined }) });
          }}
        >
          <input className="mb-input" placeholder="Search order number, name, email or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
        </form>
      </div>
      <div className="mb-chips" style={{ marginBottom: "1.2rem" }}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={status === f.id} onClick={() => navigate({ search: (s) => ({ ...s, status: f.id }) })}>
            {f.label}
          </button>
        ))}
      </div>
      <section className="mb-panel">
        {rows.length ? (
          <table className="mb-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Fulfilment</th><th>Status</th><th>Payment</th><th className="mb-r">Total</th><th className="mb-r">Balance</th></tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.number}>
                  <td><Link to="/manage/orders/$number" params={{ number: o.number }}>{o.number}</Link><div className="mb-note">{shortDate(o.created_at)}</div></td>
                  <td>{o.customer_name}<div className="mb-note">{o.email}</div></td>
                  <td>{o.fulfilment === "pickup" ? "Pickup" : "Delivery"}{o.install ? " + install" : ""}</td>
                  <td><OrderStatusPill status={o.status} /></td>
                  <td><PaymentPill status={o.payment_status} /></td>
                  <td className="mb-r mb-num">{money(o.total_cents, { cents: true })}</td>
                  <td className="mb-r mb-num">{money(Math.max(0, o.total_cents - o.amount_paid_cents), { cents: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mb-muted">No orders match.</p>
        )}
      </section>
    </>
  );
}
