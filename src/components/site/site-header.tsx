import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cartCount, useCart } from "@/lib/cart";

/**
 * Site navigation. Deliberately has no management link: staff sign in from
 * the footer. On the home page it floats over the film ("night") and turns
 * to paper once the visitor scrolls past the journey.
 */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const lines = useCart();
  const count = cartCount(lines);
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<"night" | "day">(overlay ? "night" : "day");

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => {
      const after = document.getElementById("after-journey");
      const limit = after ? after.getBoundingClientRect().top : 1;
      setTone(limit > 80 ? "night" : "day");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  return (
    <header className="mb-header" data-tone={tone} data-overlay={overlay ? "true" : undefined}>
      <div className="mb-wrap mb-header__bar">
        <Link to="/" className="mb-logo" aria-label="Modern Bella Design, home">
          <img className="mb-logo__ink" src="/assets/brand/logo-ink@sm.png" alt="Modern Bella Design" width={804} height={249} />
          <img className="mb-logo__light" src="/assets/brand/logo-light@sm.png" alt="" width={804} height={249} />
        </Link>
        <nav className="mb-nav" data-open={open ? "true" : "false"} aria-label="Main">
          <Link to="/shop" onClick={() => setOpen(false)}>Shop</Link>
          <Link to="/" hash="finishes" onClick={() => setOpen(false)}>Finishes</Link>
          <Link to="/" hash="services" onClick={() => setOpen(false)}>Services</Link>
          <Link to="/track" onClick={() => setOpen(false)}>Track order</Link>
          <Link to="/" hash="consult" onClick={() => setOpen(false)}>Consultation</Link>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <Link to="/cart" className="mb-bag" aria-label={`Cart, ${count} items`}>
            <span>Cart</span>
            <span className="mb-bag__count">{count}</span>
          </Link>
          <button
            type="button"
            className="mb-menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
