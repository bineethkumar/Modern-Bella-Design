/**
 * Server-only configuration. Set these in Vercel (Project, Settings,
 * Environment Variables) and in a local `.env` file for development.
 * See `.env.example` for the full list.
 */
export interface AppEnv {
  /** Supabase Postgres connection string (Transaction pooler, port 6543). */
  DATABASE_URL?: string;
  // Management login.
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  // Payments: "stripe", "square", "toast" or "manual". Unset means the first
  // processor with keys (Stripe, then Square), otherwise manual invoicing.
  PAYMENT_PROVIDER?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SQUARE_ACCESS_TOKEN?: string;
  SQUARE_LOCATION_ID?: string;
  SQUARE_ENV?: string; // "sandbox" (default) or "production"
  SQUARE_WEBHOOK_SIGNATURE_KEY?: string;
  TOAST_CLIENT_ID?: string;
  TOAST_CLIENT_SECRET?: string;
  TOAST_RESTAURANT_GUID?: string;
}

export function env(): AppEnv {
  return process.env as AppEnv;
}
