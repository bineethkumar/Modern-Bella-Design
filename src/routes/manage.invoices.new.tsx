import { createFileRoute, Link } from "@tanstack/react-router";

import { InvoiceEditor, centsToInput, emptyInvoice, type EditorInitial } from "@/components/site/invoice-editor";
import { draftFromOrder } from "@/lib/api/admin.functions";
import { defaultInvoiceDates } from "@/lib/statuses";
import { INVOICE_TERMS_DAYS, TAX_RATE } from "@/lib/store-config";

export const Route = createFileRoute("/manage/invoices/new")({
  validateSearch: (s: Record<string, unknown>): { order?: string } => ({
    order: typeof s.order === "string" ? s.order : undefined,
  }),
  loaderDeps: ({ search }) => ({ order: search.order }),
  loader: ({ deps }) => (deps.order ? draftFromOrder({ data: { number: deps.order } }) : Promise.resolve(null)),
  component: NewInvoice,
});

function NewInvoice() {
  const draft = Route.useLoaderData();
  const { order } = Route.useSearch();
  const dates = defaultInvoiceDates(INVOICE_TERMS_DAYS);

  const initial: EditorInitial = draft
    ? {
        orderId: draft.orderId,
        customerName: draft.customerName,
        email: draft.email,
        phone: draft.phone,
        address: draft.address,
        notes: draft.alreadyPaidCents
          ? `Order ${order}. A payment of $${(draft.alreadyPaidCents / 100).toFixed(2)} has already been received on the order.`
          : `Order ${order}. Thank you for choosing Modern Bella Design.`,
        discount: "",
        taxRate: String(TAX_RATE * 100),
        lines: draft.items.map((i) => ({ description: i.description, qty: String(i.qty), unit: centsToInput(i.unitCents), taxable: i.taxable })),
        ...dates,
      }
    : emptyInvoice(dates);

  return (
    <>
      <div className="mb-main__head">
        <div>
          <p className="mb-eyebrow" style={{ marginBottom: "0.3rem" }}><Link to="/manage/invoices">Invoices</Link> / New</p>
          <h1 className="mb-h2">{draft ? `Invoice for ${order}` : "New invoice"}</h1>
        </div>
      </div>
      <InvoiceEditor initial={initial} />
    </>
  );
}
