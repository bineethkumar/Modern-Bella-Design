import { Link } from "@tanstack/react-router";
import { LockKeyhole } from "lucide-react";

import { GROUPS } from "@/lib/catalog";
import { BRAND } from "@/lib/store-config";

const proseList = (xs: string[]) =>
  xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mb-footer">
      <div className="mb-wrap">
        <div className="mb-footer__grid">
          <div>
            <img className="mb-footer__logo" src="/assets/brand/logo-light@sm.png" alt="Modern Bella Design" width={804} height={249} />
            <p className="mb-footer__area">
              {BRAND.city}. Serving {proseList(BRAND.serviceArea)}.
            </p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              {GROUPS.slice(0, 6).map((g) => (
                <li key={g.id}>
                  <Link to="/shop" search={{ group: g.id }}>{g.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Customers</h4>
            <ul>
              <li><Link to="/track">Track an order</Link></li>
              <li><Link to="/cart">Your cart</Link></li>
              <li><Link to="/" hash="consult">Book a consultation</Link></li>
              <li><Link to="/" hash="process">How it works</Link></li>
            </ul>
          </div>
          <div>
            <h4>Studio</h4>
            <ul>
              <li><Link to="/" hash="finishes">Finishes</Link></li>
              <li><Link to="/" hash="services">Services</Link></li>
              <li>{BRAND.city}</li>
            </ul>
          </div>
        </div>
        <div className="mb-footer__base">
          <span>© {year} {BRAND.legalName}. All rights reserved.</span>
          <Link to="/staff-login" className="mb-mgmt">
            <LockKeyhole size={13} aria-hidden="true" />
            Management login
          </Link>
        </div>
      </div>
    </footer>
  );
}
