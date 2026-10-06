import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { lookupOrder } from "@/lib/api/store.functions";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [{ title: "Track your order | Modern Bella Design" }] }),
  component: Track,
});

function Track() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await lookupOrder({ data: { number: String(f.get("number") ?? ""), email: String(f.get("email") ?? "") } });
      window.location.assign(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main>
        <section className="mb-pagehead">
          <div className="mb-wrap" style={{ maxWidth: "52rem" }}>
            <p className="mb-eyebrow">Order tracking</p>
            <h1 className="mb-display">Where is my <em>kitchen</em>?</h1>
            <p className="mb-lede" style={{ marginTop: "1rem" }}>
              Enter the order number from your confirmation (it starts with MB) and the email you ordered with.
            </p>
          </div>
        </section>
        <div className="mb-wrap" style={{ maxWidth: "52rem", paddingBlock: "3rem 7rem" }}>
          <form className="mb-form" onSubmit={onSubmit}>
            <label className="mb-field"><span>Order number</span><input name="number" required placeholder="MB-260614-4831" autoComplete="off" /></label>
            <label className="mb-field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
            <div className="mb-span" style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button type="submit" className="cta-quiet" data-variant="ink" disabled={busy} style={{ padding: "0.95rem 1.6rem", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                {busy ? "Looking" : "Find my order"}
              </button>
              {error ? <p className="mb-error" role="alert">{error}</p> : null}
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
