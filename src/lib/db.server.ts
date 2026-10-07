import { getRequestHeader } from "@tanstack/react-start/server";
import postgres from "postgres";

import { env } from "./env.server";

/**
 * Supabase Postgres behind a small prepared-statement API:
 *   db().prepare("SELECT ... WHERE id = ?").bind(id).first<Row>()
 *   db().batch([stmtA, stmtB])   // one transaction
 * `?` placeholders are rewritten to Postgres `$1, $2 ...`.
 */
let client: postgres.Sql | null = null;

function sql(): postgres.Sql {
  if (client) return client;
  const url = env().DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    throw new Error("Our system is temporarily unavailable. Please try again in a moment.");
  }
  if (/@db\.[a-z0-9]+\.supabase\.co/.test(url)) {
    // Supabase's direct host is IPv6-only and unreachable from Vercel.
    console.error("DATABASE_URL uses Supabase's direct connection. Use the Transaction pooler string (port 6543).");
  }
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  client = postgres(url, {
    // Supabase's transaction pooler does not support prepared statements.
    prepare: false,
    ssl: local ? false : "require",
    max: 3,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  return client;
}

type Param = string | number | boolean | null;

/**
 * Database failures are logged in full on the server, but visitors only ever
 * see a generic message (the raw error can reveal hostnames or SQL).
 */
async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    console.error("Database error:", error);
    throw new Error("Our system is temporarily unavailable. Please try again in a moment.");
  }
}

function toPg(text: string): string {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

export class Statement {
  constructor(
    readonly text: string,
    readonly params: Param[] = [],
  ) {}

  bind(...params: (Param | undefined)[]): Statement {
    return new Statement(this.text, params.map((p) => (p === undefined ? null : p)));
  }

  async all<T>(): Promise<{ results: T[] }> {
    const rows = await guarded(() => sql().unsafe(toPg(this.text), this.params));
    return { results: rows as unknown as T[] };
  }

  async first<T>(): Promise<T | null> {
    const { results } = await this.all<T>();
    return results[0] ?? null;
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const res = await guarded(() => sql().unsafe(toPg(this.text), this.params));
    return { meta: { changes: res.count } };
  }
}

export interface Database {
  prepare(text: string): Statement;
  batch(statements: Statement[]): Promise<void>;
}

const database: Database = {
  prepare: (text) => new Statement(text),
  async batch(statements) {
    await guarded(() =>
      sql().begin(async (tx) => {
        for (const s of statements) await tx.unsafe(toPg(s.text), s.params);
      }),
    );
  },
};

export function db(): Database {
  return database;
}

export const dbConfigured = () => Boolean(env().DATABASE_URL);

export const nowIso = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

/** URL-safe random token (default 24 bytes = 32 chars). */
export function randomToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison via fixed-length digests. */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

/** The public origin of this request, for payment redirect URLs. */
export function requestOrigin(): string {
  const host = getRequestHeader("x-forwarded-host") ?? getRequestHeader("host") ?? "";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

export function clientIp(): string {
  return getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for") ?? "unknown";
}

/** Order numbers read well on the phone: MB-260614-4831. */
export function orderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return `MB-${ymd}-${String(n[0] % 10000).padStart(4, "0")}`;
}
