/**
 * The payment seam. Checkout and invoices only ever talk to this interface,
 * so switching between Square and Toast (or adding another processor) means
 * writing one adapter, not touching the store.
 */
export type PaymentMode = "square" | "toast" | "manual";

export interface CheckoutLine {
  name: string;
  qty: number;
  unitCents: number;
}

export interface CheckoutRequest {
  /** Stable per attempt so a retried request never charges twice. */
  idempotencyKey: string;
  /** Our order or invoice number, shown on the customer's receipt. */
  reference: string;
  lines: CheckoutLine[];
  email?: string | null;
  /** Where the processor sends the customer after paying. */
  redirectUrl: string;
}

export interface CheckoutSession {
  url: string;
  /** The processor's id for this order, used to match the payment webhook. */
  providerOrderId: string;
}

export interface PaymentAdapter {
  mode: Exclude<PaymentMode, "manual">;
  label: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
}
