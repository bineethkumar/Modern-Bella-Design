/**
 * The Modern Bella catalogue: 202 cabinets, 28 organisers, 9 finishes and
 * 14 shop modifications, extracted from the supplier specification book.
 * Shared by the browser (display) and the server (authoritative pricing).
 */
import raw from "@/data/catalog.json";

export type Tier = "emerald" | "trillion";
export type GroupId = "base" | "wall" | "tall" | "vanity" | "storage" | "trim" | "mods";

export interface Finish {
  id: string;
  series: string;
  name: string;
  tier: Tier;
  material: string;
  blurb: string;
}

export interface Item {
  sku: string;
  name: string;
  cat: string;
  group: GroupId;
  w: number | null;
  h: number | null;
  d: number | null;
  prices: Record<Tier, number>;
  img: string | null;
  note: string | null;
  /** Cabinets wear a door finish; organisers and modifications do not. */
  finished: boolean;
  desc: string | null;
}

interface RawCabinet {
  sku: string;
  name: string;
  cat: string;
  group: string;
  w?: number | null;
  h?: number | null;
  d?: number | null;
  p: Record<Tier, number>;
  img: string | null;
  note: string | null;
}
interface RawMod {
  sku: string;
  name: string;
  price: number;
  desc: string;
}
interface RawCatalog {
  finishes: Finish[];
  groups: { id: string; label: string; room: string }[];
  cabinets: RawCabinet[];
  organizers: RawCabinet[];
  mods: RawMod[];
}

const data = raw as unknown as RawCatalog;

export const FINISHES: Finish[] = data.finishes;
export const FINISH_BY_ID: Record<string, Finish> = Object.fromEntries(
  FINISHES.map((f) => [f.id, f]),
);
export const DEFAULT_FINISH = FINISHES[0];

export const GROUPS: { id: GroupId; label: string; blurb: string }[] = [
  { id: "base", label: "Base cabinets", blurb: "Sink, drawer and corner bases that carry the counter." },
  { id: "wall", label: "Wall cabinets", blurb: "Uppers, corners and appliance garages." },
  { id: "tall", label: "Tall & pantry", blurb: "Floor to ceiling pantries and oven towers." },
  { id: "vanity", label: "Vanity", blurb: "Sink bases, drawer stacks and towers for the bath." },
  { id: "storage", label: "Inside storage", blurb: "Roll-outs, wine storage and organisers." },
  { id: "trim", label: "Trim & panels", blurb: "Moulding, fillers, panels and glass doors." },
  { id: "mods", label: "Modifications", blurb: "Shop work: depth cuts, glass prep and more." },
];

const num = (v: number | null | undefined) => (typeof v === "number" ? v : null);

function fromCabinet(c: RawCabinet, finished: boolean): Item {
  return {
    sku: c.sku,
    name: c.name,
    cat: c.cat,
    group: c.group as GroupId,
    w: num(c.w),
    h: num(c.h),
    d: num(c.d),
    prices: c.p,
    img: c.img,
    note: c.note ? c.note.replace(/\s{2,}/g, " · ").trim() : null,
    finished,
    desc: null,
  };
}

export const ITEMS: Item[] = [
  ...data.cabinets.map((c) => fromCabinet(c, true)),
  ...data.organizers.map((c) => fromCabinet(c, false)),
  ...data.mods.map<Item>((m) => ({
    sku: m.sku,
    name: m.name,
    cat: "Modification",
    group: "mods",
    w: null,
    h: null,
    d: null,
    prices: { emerald: m.price, trillion: m.price },
    img: null,
    note: null,
    finished: false,
    desc: m.desc,
  })),
];

export const ITEM_BY_SKU: Record<string, Item> = Object.fromEntries(ITEMS.map((i) => [i.sku, i]));

/** Unit price in cents. Finish-less items cost the same in either series. */
export function unitCents(item: Item, finish: Finish | null): number {
  const tier: Tier = item.finished && finish ? finish.tier : "emerald";
  return Math.round(item.prices[tier] * 100);
}

/** Rendered previews exist for the common cabinet shapes in every finish. */
export function productShape(item: Item): string | null {
  if (!item.finished || item.w == null) return null;
  switch (item.cat) {
    case "Base Cabinets":
      return item.sku === "B09FD" ? null : item.w < 24 ? "base-single" : "base-double";
    case "Drawer Base":
    case "Vanity Drawer Base":
      return "drawer";
    case "Wall Cabinet":
      return item.w < 24 ? "wall-single" : "wall-double";
    case "Tall Pantry":
      return "pantry";
    case "Sink Base":
    case "Vanity Sink Base":
      return "vanity";
    default:
      return null;
  }
}

export const doorImg = (f: Finish) => `/catalog/door-${f.id}.webp`;
export const kitchenImg = (f: Finish) => `/catalog/kitchen-${f.id}.webp`;
export const kitchenSmall = (f: Finish) => `/catalog/kitchen-${f.id}@sm.webp`;

/** The picture to show for an item in a finish, plus whether it is a finish preview. */
export function itemImage(item: Item, finish: Finish): { src: string | null; preview: boolean } {
  const shape = productShape(item);
  if (shape) return { src: `/catalog/products/${finish.id}-${shape}.webp`, preview: true };
  return { src: item.img, preview: false };
}

const fraction = (n: number) =>
  n % 1 === 0 ? String(n) : n.toFixed(1).replace(".5", "½").replace(".0", "");

export function dimText(item: Item): string {
  if (item.w == null) return item.group === "mods" ? "Per unit" : "One size";
  const bits = [`${fraction(item.w)}″ w`];
  if (item.h != null) bits.push(`${fraction(item.h)}″ h`);
  if (item.d != null) bits.push(`${fraction(item.d)}″ d`);
  return bits.join(" · ");
}

export const finishLabel = (f: Finish) => `${f.series} ${f.name}`;

export function money(cents: number, opts: { cents?: boolean } = {}): string {
  const showCents = opts.cents ?? cents % 100 !== 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
}
