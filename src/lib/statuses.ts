/** Order and invoice states, shared by the customer tracker and the portal. */

export const ORDER_STATUSES = [
  { id: "received", label: "Order received", hint: "We have your order and are reviewing it." },
  { id: "confirmed", label: "Confirmed", hint: "Measurements and finish confirmed with you." },
  { id: "in_production", label: "In production", hint: "Your cabinets are being built and finished." },
  { id: "ready", label: "Ready", hint: "Packed and staged for delivery or pickup." },
  { id: "out_for_delivery", label: "Out for delivery", hint: "On the truck and headed your way." },
  { id: "delivered", label: "Delivered", hint: "Delivered and inspected." },
  { id: "installing", label: "Installation", hint: "Our crew is scheduled or on site." },
  { id: "completed", label: "Completed", hint: "Everything is in. Enjoy the room." },
] as const;

export const CANCELLED = { id: "cancelled", label: "Cancelled", hint: "This order was cancelled." } as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["id"] | "cancelled";

export const ALL_ORDER_STATUS_IDS: string[] = [...ORDER_STATUSES.map((s) => s.id), CANCELLED.id];

export function orderStatusLabel(id: string): string {
  if (id === CANCELLED.id) return CANCELLED.label;
  return ORDER_STATUSES.find((s) => s.id === id)?.label ?? id;
}

export function orderStatusIndex(id: string): number {
  return ORDER_STATUSES.findIndex((s) => s.id === id);
}

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
  refunded: "Refunded",
};

export const INVOICE_STATUSES = ["draft", "sent", "partially_paid", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially paid",
  paid: "Paid",
  void: "Void",
  overdue: "Overdue",
};

export function defaultInvoiceDates(termsDays: number) {
  const issue = new Date();
  const due = new Date(issue.getTime() + termsDays * 86400000);
  return { issueDate: issue.toISOString().slice(0, 10), dueDate: due.toISOString().slice(0, 10) };
}

/** Overdue is derived, never stored: sent or part-paid and past its due date. */
export function invoiceDisplayStatus(status: string, dueDate: string, today = new Date()): string {
  if ((status === "sent" || status === "partially_paid") && dueDate < today.toISOString().slice(0, 10)) {
    return "overdue";
  }
  return status;
}
