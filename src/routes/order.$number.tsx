import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getPublicOrder } from "@/lib/api/store.functions";
import { money } from "@/lib/catalog";
import { CANCELLED, ORDER_STATUSES, PAYMENT_STATUS_LABEL, orderStatusIndex, orderStatusLabel } from "@/lib/statuses";

type OrderSearch = { t?: string; placed?: number; paid?: number };

export const Route = createFileRoute("/order/$number")({
  validateSearch: (s: Record<string, unknown>): OrderSearch => ({
    t: typeof s.t === "string" ? s.t : undefined,
    placed: s.placed ? 1 : undefined,
    paid: s.paid ? 1 : undefined,
  }),
  loaderDeps: ({ search }) => ({ t: search.t }),
  loader: ({ params, deps }) => getPublicOrder({ data: { number: params.number, token: deps.t ?? "" } }),
  head: () => ({ meta: [{ title: "Your order | Modern Bella Design" }, { name: "robots", content: "noindex" }] }),
  component: OrderPage,
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

function OrderPage() {
  const order = Route.useLoaderData();
  const { placed, paid } = Route.useSearch();

  if (!order) {
    return (
      <>
        <SiteHeader />
        <main className="mb-wrap mb-404">
          <div>
            <h1 className="mb-h2">We could not find that order.</h1>
            <p className="mb-lede" style={{ marginInline: "auto" }}>Check the link in your confirmation, or look it up with your order number and email.</p>
            <p style={{ marginTop: "1.5rem" }}><Link to="/track" className="cta-hairline">Track an order</Link></p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const cancelled = order.status === CANCELLED.id;
  const idx = orderStatusIndex(order.status);
  const balance = order.total_cents - order.amount_paid_cents;

  return (
    <>
      <SiteHeader />
      <main>
        <section className="mb-pagehead">
          <div className="mb-wrap">
            <p className="mb-eyebrow">Order {order.number}</p>
            <h1 className="mb-display">
              {placed || paid ? <>Thank you, <em>{order.customer_name.split(" ")[0]}</em>.</> : <>{orderStatusLabel(order.status)}</>}
            </h1>
            <p className="mb-lede" style={{ marginTop: "1rem" }}>
              {paid
                ? "Your payment is being confirmed. This page updates as your order moves through the studio."
                : placed
                  ? "Your order is in. Bookmark this page: it updates as your order moves through the studio."
                  : `Placed ${fmtDate(order.created_at)}.`}
            </p>
          </div>
        </section>

        <div className="mb-wrap mb-track">
          <div>
            <h2 className="mb-h3">Progress</h2>
            {cancelled ? (
              <p className="mb-banner" style={{ marginTop: "1.5rem" }}>{CANCELLED.hint}</p>
            ) : (
              <ol className="mb-pipeline">
                {ORDER_STATUSES.map((s, i) => {
                  const state = i < idx ? "done" : i === idx ? "current" : "todo";
                  return (
                    <li key={s.id} data-state={state}>
                      <span className="mb-pipeline__dot">{state === "done" ? <Check size={14} /> : i + 1}</span>
                      <div>
                        <strong>{s.label}</strong>
                        {state !== "todo" ? <small>{s.hint}</small> : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {order.events.length ? (
              <>
                <h2 className="mb-h3" style={{ margin: "2.5rem 0 1.2rem" }}>Updates from the studio</h2>
                <ul className="mb-timeline">
                  {order.events.map((e, i) => (
                    <li key={i}>
                      <time>{fmtDate(e.created_at)}</time>
                      <div>{e.status ? <strong>{orderStatusLabel(e.status)}. </strong> : null}{e.note}</div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <aside className="mb-card-panel">
            <h2 className="mb-h3">Your order</h2>
            <table className="mb-table">
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      {it.qty} × {it.sku}
                      <div className="mb-note">{it.finish_label ?? it.name}</div>
                    </td>
                    <td className="mb-r mb-num">{money(it.total_cents, { cents: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {order.install_cents ? <div className="mb-sumrow"><span>Installation</span><span className="mb-num">{money(order.install_cents, { cents: true })}</span></div> : null}
            {order.haul_cents ? <div className="mb-sumrow"><span>Removal</span><span className="mb-num">{money(order.haul_cents, { cents: true })}</span></div> : null}
            <div className="mb-sumrow"><span>{order.fulfilment === "pickup" ? "Pickup" : "Delivery"}</span><span className="mb-num">{order.delivery_cents ? money(order.delivery_cents, { cents: true }) : "Free"}</span></div>
            <div className="mb-sumrow"><span>Tax</span><span className="mb-num">{money(order.tax_cents, { cents: true })}</span></div>
            <div className="mb-sumrow mb-sumrow--total"><span>Total</span><span className="mb-num">{money(order.total_cents, { cents: true })}</span></div>
            <div className="mb-sumrow">
              <span>Payment</span>
              <span className="mb-pill" data-tone={order.payment_status === "paid" ? "ok" : "warn"}>
                {PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status}
              </span>
            </div>
            {balance > 0 && order.payment_link_url && order.payment_status !== "paid" ? (
              <a href={order.payment_link_url} className="cta-place" style={{ textAlign: "center", textDecoration: "none", boxSizing: "border-box", display: "block" }}>
                Pay {money(balance, { cents: true })} securely
              </a>
            ) : null}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
