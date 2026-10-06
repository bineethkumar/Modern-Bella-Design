import { Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cart } from "@/lib/cart";
import {
  dimText,
  finishLabel,
  itemImage,
  money,
  unitCents,
  type Finish,
  type Item,
} from "@/lib/catalog";

export function AddButton({ item, finish, qty = 1, label = "Add" }: { item: Item; finish: Finish; qty?: number; label?: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <button
      type="button"
      className="cta-add"
      data-done={done ? "true" : "false"}
      onClick={() => {
        cart.add(item.sku, item.finished ? finish.id : null, qty);
        setDone(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setDone(false), 1400);
      }}
      aria-label={`Add ${item.name} ${item.sku} to cart`}
    >
      {done ? <Check size={14} /> : <Plus size={14} />}
      {done ? "Added" : label}
    </button>
  );
}

export function ProductCard({ item, finish, onOpen }: { item: Item; finish: Finish; onOpen: (item: Item) => void }) {
  const img = itemImage(item, finish);
  return (
    <article className="mb-card">
      <button type="button" className="mb-card__img" onClick={() => onOpen(item)} aria-label={`View ${item.name} ${item.sku}`}>
        {img.src ? (
          <img src={img.src} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="mb-serif" style={{ fontSize: "1.1rem", color: "var(--mb-stone)", padding: "1rem", textAlign: "center" }}>
            {item.name}
          </span>
        )}
        {item.finished ? <span className="mb-card__badge">{finishLabel(finish)}</span> : null}
      </button>
      <div className="mb-card__body">
        <span className="mb-card__sku">{item.sku}</span>
        <span className="mb-card__name">{item.group === "mods" ? item.name : item.cat}</span>
        <span className="mb-card__dims">{dimText(item)}</span>
      </div>
      <div className="mb-card__foot">
        <span className="mb-card__price mb-num">{money(unitCents(item, finish))}</span>
        <AddButton item={item} finish={finish} />
      </div>
    </article>
  );
}
