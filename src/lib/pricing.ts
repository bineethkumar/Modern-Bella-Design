/**
 * One pricing function for the cart page AND the server. The server always
 * re-runs it from SKUs and quantities, so a tampered browser price never
 * reaches an order, an invoice or a payment provider.
 */
import { FINISH_BY_ID, ITEM_BY_SKU, finishLabel, unitCents } from "./catalog";
import { DELIVERY, HAUL_PER_CABINET, INSTALL, INSTALL_MINIMUM, TAX_RATE } from "./store-config";

export interface CartLine {
  sku: string;
  finishId: string | null;
  qty: number;
}

export interface QuoteOptions {
  install: boolean;
  haul: boolean;
  fulfilment: "delivery" | "pickup";
}

export interface QuoteLine {
  key: string;
  sku: string;
  name: string;
  finishId: string | null;
  finishLabel: string | null;
  qty: number;
  unitCents: number;
  totalCents: number;
}

export interface Quote {
  lines: QuoteLine[];
  units: number;
  subtotalCents: number;
  installCents: number;
  haulCents: number;
  deliveryCents: number;
  taxCents: number;
  totalCents: number;
  installAtMinimum: boolean;
  invalid: string[];
}

export const lineKey = (sku: string, finishId: string | null) =>
  finishId ? `${sku}|${finishId}` : sku;

export function quote(lines: CartLine[], opts: QuoteOptions): Quote {
  const out: QuoteLine[] = [];
  const invalid: string[] = [];
  let installSum = 0;
  let installUnits = 0;
  let units = 0;

  for (const line of lines) {
    const item = ITEM_BY_SKU[line.sku];
    const qty = Math.max(0, Math.min(99, Math.floor(line.qty)));
    if (!item || qty === 0) {
      invalid.push(line.sku);
      continue;
    }
    const finish = item.finished ? FINISH_BY_ID[line.finishId ?? ""] : null;
    if (item.finished && !finish) {
      invalid.push(line.sku);
      continue;
    }
    const unit = unitCents(item, finish);
    out.push({
      key: lineKey(item.sku, finish?.id ?? null),
      sku: item.sku,
      name: item.name,
      finishId: finish?.id ?? null,
      finishLabel: finish ? finishLabel(finish) : null,
      qty,
      unitCents: unit,
      totalCents: unit * qty,
    });
    units += qty;
    if (item.group !== "mods") {
      installSum += (INSTALL[item.group] ?? INSTALL.trim) * qty;
      installUnits += qty;
    }
  }

  const subtotalCents = out.reduce((a, l) => a + l.totalCents, 0);
  const installCents = opts.install && installUnits > 0
    ? Math.max(installSum, INSTALL_MINIMUM) * 100
    : 0;
  const haulCents = opts.install && opts.haul ? installUnits * HAUL_PER_CABINET * 100 : 0;
  const deliveryCents =
    opts.fulfilment === "delivery" && subtotalCents > 0 && subtotalCents < DELIVERY.freeOver * 100
      ? DELIVERY.flat * 100
      : 0;
  const taxCents = Math.round(subtotalCents * TAX_RATE);

  return {
    lines: out,
    units,
    subtotalCents,
    installCents,
    haulCents,
    deliveryCents,
    taxCents,
    totalCents: subtotalCents + installCents + haulCents + deliveryCents + taxCents,
    installAtMinimum: opts.install && installUnits > 0 && installSum < INSTALL_MINIMUM,
    invalid,
  };
}
