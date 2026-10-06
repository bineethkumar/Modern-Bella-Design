import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { money } from "@/lib/catalog";
import type { Quote } from "@/lib/pricing";
import { DELIVERY } from "@/lib/store-config";

export function OrderSummary({ q, fulfilment, children }: { q: Quote; fulfilment: "delivery" | "pickup"; children?: ReactNode }) {
  const toFree = DELIVERY.freeOver * 100 - q.subtotalCents;
  return (
    <aside className="mb-summary" aria-label="Order summary">
      <h2 className="mb-h3">Summary</h2>
      <div className="mb-sumrow"><span>Cabinetry ({q.units} pcs)</span><span className="mb-num">{money(q.subtotalCents, { cents: true })}</span></div>
      {q.installCents ? (
        <div className="mb-sumrow">
          <span>Installation{q.installAtMinimum ? " (minimum)" : ""}</span>
          <span className="mb-num">{money(q.installCents, { cents: true })}</span>
        </div>
      ) : null}
      {q.haulCents ? <div className="mb-sumrow"><span>Old cabinet removal</span><span className="mb-num">{money(q.haulCents, { cents: true })}</span></div> : null}
      <div className="mb-sumrow">
        <span>{fulfilment === "pickup" ? "Pickup, Beltsville" : "Delivery"}</span>
        <span className="mb-num">{q.deliveryCents ? money(q.deliveryCents, { cents: true }) : "Free"}</span>
      </div>
      <div className="mb-sumrow"><span>Maryland sales tax (6%)</span><span className="mb-num">{money(q.taxCents, { cents: true })}</span></div>
      <div className="mb-sumrow mb-sumrow--total"><span>Total</span><span className="mb-num">{money(q.totalCents, { cents: true })}</span></div>
      {fulfilment === "delivery" && q.subtotalCents > 0 && toFree > 0 ? (
        <p className="mb-note" style={{ margin: 0 }}>Add {money(toFree)} more for free delivery.</p>
      ) : null}
      {children}
      <div className="mb-paybadge">
        <ShieldCheck size={18} />
        <span>Card payments are processed on a secure hosted checkout. We never see or store your card number.</span>
      </div>
    </aside>
  );
}
