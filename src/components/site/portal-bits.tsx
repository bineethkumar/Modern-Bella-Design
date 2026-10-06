import { PAYMENT_STATUS_LABEL, orderStatusLabel } from "@/lib/statuses";

export const shortDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function OrderStatusPill({ status }: { status: string }) {
  const tone = status === "completed" ? "ok" : status === "cancelled" ? "bad" : status === "received" ? "gold" : "warn";
  return <span className="mb-pill" data-tone={tone}>{orderStatusLabel(status)}</span>;
}

export function PaymentPill({ status }: { status: string }) {
  const tone = status === "paid" ? "ok" : status === "partially_paid" ? "warn" : status === "refunded" ? undefined : "bad";
  return <span className="mb-pill" data-tone={tone}>{PAYMENT_STATUS_LABEL[status] ?? status}</span>;
}

/** "$1,234.56" or "1234.56" to integer cents; null when unreadable. */
export function parseMoney(input: string): number | null {
  const n = Number(input.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export const PAYMENT_METHODS = ["Card (terminal)", "Cash", "Check", "Zelle", "Bank transfer", "Financing"];
