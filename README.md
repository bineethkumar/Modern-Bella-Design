# Modern Bella Design: storefront, order tracking and studio portal

React 19 + TanStack Start, server-rendered, deployed on Vercel with a Supabase (Postgres) database.

## Run it locally

Requires Node.js 22 or newer.

```bash
npm install                 # once
cp .env.example .env        # then fill in DATABASE_URL and ADMIN_* (see below)
npm run db:migrate          # once per database: creates the tables
npm run dev                 # http://localhost:3000
```

The home page, shop and cart work without a database. Checkout, order tracking, consultations and the management portal need `DATABASE_URL`.

Production build on your machine: `npm run build`, then `npm start`.

## Database (Supabase)

1. Create a project at supabase.com.
2. Project > **Connect** > copy the **Transaction pooler** connection string (port 6543) and put your database password in it. That is `DATABASE_URL`.
3. `npm run db:migrate` (or paste `db/schema.sql` into Supabase > SQL Editor > Run).

The schema turns on Row Level Security with no policies, so Supabase's public REST API cannot read any table. Only the site's server, connecting with `DATABASE_URL`, can.

## Deploy to Vercel and your domain

1. vercel.com > **Add New > Project** > import `bineethkumar/Modern-Bella-Design`. The defaults are right (Framework: Other or TanStack Start, build `npm run build`).
2. **Settings > Environment Variables**: add everything from `.env.example` (`VITE_SITE_URL`, `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, plus Square when ready). Redeploy after changing them.
3. **Settings > Domains** > add your domain, then create the DNS records Vercel shows at your registrar (an `A` record for the apex, a `CNAME` for `www`). HTTPS is automatic.

Every push to `master` deploys automatically.

## What is in it

| Area | Path | What it does |
|---|---|---|
| Home | `/` | Scroll-driven hero film, finish studio (9 doors), collections, process and install rates, services, consultation form |
| Shop | `/shop` | 244 catalogue pieces, category filter, SKU search, sort, detail sheet; prices follow the chosen finish |
| Cart / checkout | `/cart`, `/checkout` | Delivery or pickup, installation ($650 minimum), removal, free delivery over $6,000, 6% MD tax; prices recalculated on the server |
| Order tracking | `/track`, `/order/<number>` | Customers see a live progress timeline |
| Invoice view | `/invoice/<link>` | Print / save PDF, pay by card |
| Management login | `/staff-login` | Linked only from the footer, bottom right |
| Studio portal | `/manage` | Dashboard, orders and tracking updates, invoices and payments, consultation requests |

## Payments

**Square:** set `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENV` (`sandbox` or `production`), and create a webhook for `payment.updated` pointing to `https://<your-domain>/api/webhooks/square`; put its signature key in `SQUARE_WEBHOOK_SIGNATURE_KEY`. Checkout and invoices switch to Square's hosted payment page automatically. Card numbers never touch this site.

**Toast:** online card checkout for retail is granted per account by Toast. The adapter is ready in `src/lib/payments/toast.server.ts`. Until it's connected, take terminal payments and record them in the portal.

**No processor:** orders are placed unpaid; create an invoice from the order in one click and record cash, check, Zelle or terminal payments.

## Where to change things

| Change | File |
|---|---|
| Install rates, delivery, tax, invoice terms, services, service area | `src/lib/store-config.ts` |
| Products, prices, finishes | `src/data/catalog.json` |
| Order tracking stages | `src/lib/statuses.ts` |
| Colours, fonts, styling | `src/site.css` |
| Payment processors | `src/lib/payments/` |
| Database tables | `db/schema.sql` (additive changes only; it is live data) |
