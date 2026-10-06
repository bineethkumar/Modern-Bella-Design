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
  // Payments: "square", "toast" or "manual". Unset means Square when its keys
  // are present, otherwise manual (orders are placed and invoiced later).
  PAYMENT_PROVIDER?: string;
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
