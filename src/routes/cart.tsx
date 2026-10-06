import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { OrderSummary } from "@/components/site/order-summary";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { cart, useCart } from "@/lib/cart";
import { FINISH_BY_ID, ITEM_BY_SKU, DEFAULT_FINISH, itemImage, money } from "@/lib/catalog";
import { setCheckoutPrefs, useCheckoutPrefs } from "@/lib/checkout-prefs";
import { quote } from "@/lib/pricing";
import { HAUL_PER_CABINET, INSTALL_MINIMUM } from "@/lib/store-config";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart | Modern Bella Design" }] }),
  component: CartPage,
});

function CartPage() {
  const lines = useCart();
  const prefs = useCheckoutPrefs();
  const q = quote(lines, prefs);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="mb-pagehead">
          <div className="mb-wrap">
            <p className="mb-eyebrow">Your cart</p>
            <h1 className="mb-display">{q.lines.length ? <>The <em>plan</em> so far</> : "Your cart is empty"}</h1>
          </div>
        </section>
        <div className="mb-wrap mb-cart">
          <div>
            {q.lines.length === 0 ? (
              <div className="mb-card-panel" style={{ justifyItems: "start" }}>
                <p className="mb-lede" style={{ margin: 0 }}>Start with a finish, then add the boxes for your room.</p>
                <Link to="/shop" className="cta-gild">Shop the collection <ArrowRight size={16} /></Link>
              </div>
            ) : (
              <ul className="mb-lines">
                {q.lines.map((l) => {
                  const item = ITEM_BY_SKU[l.sku];
                  const img = item ? itemImage(item, FINISH_BY_ID[l.finishId ?? ""] ?? DEFAULT_FINISH) : null;
                  return (
                    <li key={l.key} className="mb-line">
                      <div className="mb-line__img">{img?.src ? <img src={img.src} alt="" loading="lazy" /> : null}</div>
                      <div className="mb-line__meta">
                        <span className="mb-card__sku">{l.sku}</span>
                        <strong className="mb-serif" style={{ fontSize: "1.25rem" }}>{item?.group === "mods" ? l.name : item?.cat ?? l.name}</strong>
                        <span className="mb-note">{l.finishLabel ?? "Fits either series"} · {money(l.unitCents, { cents: true })} each</span>
                      </div>
                      <div className="mb-line__end">
                        <div className="mb-qty">
                          <button type="button" onClick={() => cart.setQty(l.key, l.qty - 1)} aria-label={`Decrease ${l.sku}`}>−</button>
                          <input
                            aria-label={`Quantity of ${l.sku}`}
                            inputMode="numeric"
                            value={l.qty}
                            onChange={(e) => cart.setQty(l.key, Number(e.target.value.replace(/\D/g, "")) || 0)}
                          />
                          <button type="button" onClick={() => cart.setQty(l.key, l.qty + 1)} aria-label={`Increase ${l.sku}`}>+</button>
                        </div>
                        <strong className="mb-num">{money(l.totalCents, { cents: true })}</strong>
                        <button type="button" className="mb-linkbtn" onClick={() => cart.setQty(l.key, 0)}>Remove</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {q.lines.length ? (
            <OrderSummary q={q} fulfilment={prefs.fulfilment}>
              <div className="mb-options">
                <div className="mb-segment" role="group" aria-label="Delivery or pickup">
                  <button type="button" aria-pressed={prefs.fulfilment === "delivery"} onClick={() => setCheckoutPrefs({ fulfilment: "delivery" })}>Delivery</button>
                  <button type="button" aria-pressed={prefs.fulfilment === "pickup"} onClick={() => setCheckoutPrefs({ fulfilment: "pickup", install: false })}>Pickup</button>
                </div>
                <label className="mb-check">
                  <input
                    type="checkbox"
                    checked={prefs.install}
                    disabled={prefs.fulfilment === "pickup"}
                    onChange={(e) => setCheckoutPrefs({ install: e.target.checked })}
                  />
                  <span>Professional installation <span className="mb-note">(${INSTALL_MINIMUM} minimum)</span></span>
                </label>
                <label className="mb-check">
                  <input
                    type="checkbox"
                    checked={prefs.install && prefs.haul}
                    disabled={!prefs.install}
                    onChange={(e) => setCheckoutPrefs({ haul: e.target.checked })}
                  />
                  <span>Remove my old cabinets <span className="mb-note">(${HAUL_PER_CABINET} each)</span></span>
                </label>
              </div>
              <Link to="/checkout" className="cta-place" style={{ textAlign: "center", textDecoration: "none", display: "block", boxSizing: "border-box" }}>
                Continue to checkout
              </Link>
            </OrderSummary>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
