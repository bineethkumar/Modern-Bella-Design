import { createFileRoute, Link } from "@tanstack/react-router";

import { OrderStatusPill, PaymentPill, shortDate } from "@/components/site/portal-bits";
import { getDashboard } from "@/lib/api/admin.functions";
import { money } from "@/lib/catalog";

export const Route = createFileRoute("/manage/")({
  loader: () => getDashboard(),
  component: Dashboard,
});

function Dashboard() {
  const d = Route.useLoaderData();
  return (
    <>
      <div className="mb-main__head">
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.3rem" }}>Studio portal</p>
          <h1 className="mb-h2">Good to see you.</h1>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <Link to="/manage/invoices/new" className="cta-quiet" data-variant="ink">New invoice</Link>
          <Link to="/manage/orders" className="cta-quiet">All orders</Link>
        </div>
      </div>

      {d.paymentMode === "manual" ? (
        <div className="mb-banner">
          Online card payment is off, so orders are placed without payment and you invoice afterwards. Add your Square keys in the website settings to switch on card checkout.
        </div>
      ) : null}

      <div className="mb-kpis">
        <div className="mb-kpi"><span>Open orders</span><b className="mb-num">{d.openOrders}</b></div>
        <div className="mb-kpi"><span>Collected this month</span><b className="mb-num">{money(d.collectedThisMonth)}</b></div>
        <div className="mb-kpi"><span>Outstanding invoices</span><b className="mb-num">{money(d.outstanding)}</b></div>
        <div className="mb-kpi"><span>Overdue invoices</span><b className="mb-num">{d.overdueCount}</b></div>
        <div className="mb-kpi"><span>New consultations</span><b className="mb-num">{d.newLeads}</b></div>
      </div>

      <div className="mb-two">
        <section className="mb-panel">
          <h3>Latest orders</h3>
          {d.recent.length ? (
            <table className="mb-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Payment</th><th className="mb-r">Total</th></tr></thead>
              <tbody>
                {d.recent.map((o) => (
                  <tr key={o.number}>
                    <td><Link to="/manage/orders/$number" params={{ number: o.number }}>{o.number}</Link><div className="mb-note">{shortDate(o.created_at)}</div></td>
                    <td>{o.customer_name}</td>
                    <td><OrderStatusPill status={o.status} /></td>
                    <td><PaymentPill status={o.payment_status} /></td>
                    <td className="mb-r mb-num">{money(o.total_cents, { cents: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mb-muted">No orders yet. They appear here the moment a customer checks out.</p>
          )}
        </section>
        <section className="mb-panel">
          <h3>Overdue invoices</h3>
          {d.overdue.length ? (
            <table className="mb-table">
              <tbody>
                {d.overdue.map((i) => (
                  <tr key={i.id}>
                    <td><Link to="/manage/invoices/$id" params={{ id: i.id }}>{i.number}</Link><div className="mb-note">{i.customer_name}, due {shortDate(i.due_date)}</div></td>
                    <td className="mb-r mb-num">{money(i.balance_cents, { cents: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mb-muted">Nothing overdue.</p>
          )}
        </section>
      </div>
    </>
  );
}
