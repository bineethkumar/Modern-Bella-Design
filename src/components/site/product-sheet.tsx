import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { dimText, finishLabel, itemImage, money, unitCents, type Finish, type Item } from "@/lib/catalog";
import { AddButton } from "./product-card";

/** Product detail in a native <dialog>: focus trapping and Escape for free. */
export function ProductSheet({ item, finish, onClose }: { item: Item | null; finish: Finish; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (item && !dlg.open) {
      setQty(1);
      dlg.showModal();
    }
    if (!item && dlg.open) dlg.close();
  }, [item]);

  const img = item ? itemImage(item, finish) : null;

  return (
    <dialog
      ref={ref}
      className="mb-sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={item ? `${item.name} ${item.sku}` : "Product"}
    >
      {item ? (
        <div className="mb-sheet__grid" style={{ position: "relative" }}>
          <button type="button" className="mb-sheet__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
          <div className="mb-sheet__img">
            {img?.src ? <img src={img.src} alt={`${item.name} ${item.sku}`} /> : null}
          </div>
          <div className="mb-sheet__body">
            <p className="mb-eyebrow" style={{ margin: 0 }}>{item.sku}</p>
            <h2 className="mb-h3" style={{ fontSize: "2rem" }}>{item.group === "mods" ? item.name : item.cat}</h2>
            <p className="mb-muted" style={{ margin: 0 }}>{item.desc ?? dimText(item)}</p>
            {item.note ? <p className="mb-note" style={{ margin: 0 }}>{item.note}</p> : null}
            {item.finished ? (
              <p className="mb-note" style={{ margin: 0 }}>
                Shown in {finishLabel(finish)}. {finish.material}. {finish.blurb}
              </p>
            ) : (
              <p className="mb-note" style={{ margin: 0 }}>Same price in either door series.</p>
            )}
            <div className="mb-card__price mb-num" style={{ fontSize: "2rem" }}>{money(unitCents(item, finish))}</div>
            <div style={{ display: "flex", gap: "0.8rem", alignItems: "stretch" }}>
              <div className="mb-qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
                <input
                  aria-label="Quantity"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(99, Number(e.target.value.replace(/\D/g, "")) || 1)))}
                />
                <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="Increase quantity">+</button>
              </div>
              <AddButton item={item} finish={finish} qty={qty} label="Add to cart" />
            </div>
            {img?.preview && item.img ? (
              <details className="mb-diagram">
                <summary>Dimensions and configuration diagram</summary>
                <img src={item.img} alt={`${item.sku} configuration diagram`} loading="lazy" />
                <p className="mb-note">The finish preview is representative; this supplier diagram is the reference for exact configuration.</p>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
