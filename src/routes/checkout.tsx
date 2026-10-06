import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { OrderSummary } from "@/components/site/order-summary";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getCheckoutInfo, placeOrder } from "@/lib/api/store.functions";
import { cart, useCart } from "@/lib/cart";
import { useCheckoutPrefs } from "@/lib/checkout-prefs";
import { quote } from "@/lib/pricing";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout | Modern Bella Design" }, { name: "robots", content: "noindex" }] }),
  loader: () => getCheckoutInfo(),
  component: Checkout,
});

function Checkout() {
  const info = Route.useLoaderData();
  const lines = useCart();
  const prefs = useCheckoutPrefs();
  const q = quote(lines, prefs);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const online = info.mode !== "manual";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "");
    setBusy(true);
    setError(null);
    try {
      const res = await placeOrder({
        data: {
          lines: lines.map((l) => ({ sku: l.sku, finishId: l.finishId, qty: l.qty })),
          install: prefs.install,
          haul: prefs.haul,
          fulfilment: prefs.fulfilment,
          customer: {
            name: v("name"),
            email: v("email"),
            phone: v("phone"),
            address1: v("address1"),
            address2: v("address2"),
            city: v("city"),
            state: v("state"),
            zip: v("zip"),
            notes: v("notes"),
          },
        },
      });
      cart.clear();
      if (res.payUrl) {
        window.location.assign(res.payUrl);
        return;
      }
      await navigate({ to: "/order/$number", params: { number: res.number }, search: { t: res.token, placed: 1 } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not place the order. Please try again.");
      setBusy(false);
    }
  }

  if (q.lines.length === 0) {
    return (
      <>
        <SiteHeader />
        <main className="mb-wrap mb-404">
          <div>
            <h1 className="mb-h2">Your cart is empty.</h1>
            <p style={{ marginTop: "1.5rem" }}><Link to="/shop" className="cta-hairline">Back to the shop</Link></p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main>
        <section className="mb-pagehead">
          <div className="mb-wrap">
            <p className="mb-eyebrow">Checkout</p>
            <h1 className="mb-display">Almost <em>yours</em>.</h1>
          </div>
        </section>
        <form className="mb-wrap mb-checkout" onSubmit={onSubmit}>
          <div>
            <fieldset className="mb-fieldset">
              <legend>Contact</legend>
              <div className="mb-form">
                <label className="mb-field mb-span"><span>Full name</span><input name="name" required autoComplete="name" /></label>
                <label className="mb-field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
                <label className="mb-field"><span>Phone</span><input name="phone" type="tel" required autoComplete="tel" /></label>
              </div>
            </fieldset>
            <fieldset className="mb-fieldset">
              <legend>{prefs.fulfilment === "pickup" ? "Billing address" : "Delivery address"}</legend>
              <div className="mb-form">
                <label className="mb-field mb-span"><span>Street address</span><input name="address1" required={prefs.fulfilment === "delivery"} autoComplete="address-line1" /></label>
                <label className="mb-field mb-span"><span>Apartment, suite (optional)</span><input name="address2" autoComplete="address-line2" /></label>
                <label className="mb-field"><span>City</span><input name="city" required={prefs.fulfilment === "delivery"} autoComplete="address-level2" /></label>
                <div className="mb-form" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <label className="mb-field"><span>State</span><input name="state" defaultValue="MD" autoComplete="address-level1" /></label>
                  <label className="mb-field"><span>ZIP</span><input name="zip" required={prefs.fulfilment === "delivery"} inputMode="numeric" autoComplete="postal-code" /></label>
                </div>
              </div>
            </fieldset>
            <fieldset className="mb-fieldset">
              <legend>Notes for our team</legend>
              <label className="mb-field">
                <span>Access, timing, anything we should know</span>
                <textarea name="notes" />
              </label>
            </fieldset>
          </div>
          <OrderSummary q={q} fulfilment={prefs.fulfilment}>
            <p className="mb-note" style={{ margin: 0 }}>
              {online
                ? `You will pay securely with ${info.label} on the next screen.`
                : "No payment is taken now. We confirm measurements with you, then send an invoice you can pay online or in person."}
            </p>
            {error ? <p className="mb-error" role="alert">{error}</p> : null}
            <button type="submit" className="cta-place" disabled={busy} data-busy={busy ? "true" : "false"}>
              {busy ? "Placing your order" : online ? "Place order and pay" : "Place order"}
            </button>
          </OrderSummary>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}
