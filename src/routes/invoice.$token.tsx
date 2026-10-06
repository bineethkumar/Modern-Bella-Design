import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useState } from "react";

import { InvoiceDocument } from "@/components/site/invoice-document";
import { getPublicInvoice, payInvoice } from "@/lib/api/store.functions";
import { money } from "@/lib/catalog";

export const Route = createFileRoute("/invoice/$token")({
  validateSearch: (s: Record<string, unknown>): { paid?: number } => ({ paid: s.paid ? 1 : undefined }),
  loader: ({ params }) => getPublicInvoice({ data: { token: params.token } }),
  head: () => ({ meta: [{ title: "Invoice | Modern Bella Design" }, { name: "robots", content: "noindex" }] }),
  component: InvoicePage,
});

function InvoicePage() {
  const inv = Route.useLoaderData();
  const { token } = Route.useParams();
  const { paid } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!inv) {
    return (
      <main className="mb-404">
        <div>
          <h1 className="mb-h2">This invoice is not available.</h1>
          <p style={{ marginTop: "1.5rem" }}><Link to="/" className="cta-hairline">Modern Bella Design</Link></p>
        </div>
      </main>
    );
  }

  const balance = inv.total_cents - inv.amount_paid_cents;
  const payable = balance > 0 && inv.status !== "void";

  return (
    <main style={{ paddingBlock: "clamp(1.5rem, 5vw, 4rem)" }} className="mb-wrap">
      <div className="mb-noprint" style={{ maxWidth: "54rem", margin: "0 auto 1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        {paid ? <p className="mb-success" style={{ margin: 0 }}>Thank you. Your payment is being confirmed.</p> : <span />}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button type="button" className="cta-quiet" onClick={() => window.print()}><Printer size={15} /> Print or save PDF</button>
          {payable && inv.canPayOnline ? (
            <button
              type="button"
              className="cta-quiet"
              data-variant="ink"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const res = await payInvoice({ data: { token } });
                  window.location.assign(res.url);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Payment could not start.");
                  setBusy(false);
                }
              }}
            >
              {busy ? "Opening secure checkout" : `Pay ${money(balance, { cents: true })} by card`}
            </button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mb-error mb-noprint" style={{ maxWidth: "54rem", margin: "0 auto 1rem" }}>{error}</p> : null}
      <InvoiceDocument inv={inv} />
    </main>
  );
}
