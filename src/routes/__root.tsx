import {
  Outlet,
  Link,
  createRootRoute,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import appCss from "../site.css?url";
import { THEME_COLOR } from "../lib/store-config";

const TITLE = "Modern Bella Design";
const DESCRIPTION =
  "Kitchen and bath cabinetry from Beltsville, MD. Nine door finishes, 230+ cabinets priced online, delivery and professional installation.";
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@400;500&display=swap";

// Social cards need an absolute image URL. Set VITE_SITE_URL to your domain
// (for example https://modernbelladesign.com) in Vercel and in .env.
const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "").replace(/\/$/, "");
const OG_IMAGE = `${SITE_URL}/assets/brand/og.jpg`;

function NotFoundComponent() {
  return (
    <div className="mb-404">
      <div>
        <p className="mb-eyebrow">Error 404</p>
        <h1 className="mb-display">This room is <em>empty</em>.</h1>
        <p className="mb-lede" style={{ marginInline: "auto" }}>
          The page you were looking for has moved or never existed.
        </p>
        <p style={{ marginTop: "2rem" }}>
          <Link to="/" className="cta-hairline">Back to the showroom</Link>
        </p>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="mb-404">
      <div>
        <p className="mb-eyebrow">Something went wrong</p>
        <h1 className="mb-h2">This page did not load.</h1>
        <p className="mb-lede" style={{ marginInline: "auto" }}>Please try again, or head back to the showroom.</p>
        <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "2rem" }}>
          <button
            type="button"
            className="cta-quiet"
            data-variant="ink"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Try again
          </button>
          <a href="/" className="cta-hairline">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "theme-color", content: THEME_COLOR },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: TITLE },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
      { rel: "stylesheet", href: FONTS_HREF },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: Outlet,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <head>
        <HeadContent />
      </head>
      <body className="mb">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
