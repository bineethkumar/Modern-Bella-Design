import { getRequestHeader } from "@tanstack/react-start/server";
import postgres from "postgres";

import { env } from "./env.server";

/**
 * Supabase Postgres behind a small prepared-statement API:
 *   db().prepare("SELECT ... WHERE id = ?").bind(id).first<Row>()
 *   db().batch([stmtA, stmtB])   // one transaction
 * `?` placeholders are rewritten to Postgres `$1, $2 ...`.
 *
 * Serverless connection handling. Vercel freezes the function between
 * requests, and a socket left open across a freeze can be dead when the
 * function wakes; a query written to it never gets an answer. So:
 *  - a connection idle for more than a few seconds is replaced, not reused;
 *  - a connection that fails is retired, but only closed once every query
 *    still running on it has finished (other requests share it);
 *  - every query has a time limit, and read-only queries retry once on a
 *    fresh connection, so a stale socket costs a short delay, not an error.
 */
const UNAVAILABLE = "Our system is temporarily unavailable. Please try again in a moment.";
const STALE_AFTER_MS = 4_000;
const QUERY_TIMEOUT_MS = 8_000;

interface Conn {
  sql: postgres.Sql;
  inFlight: number;
  lastUsed: number;
  retired: boolean;
}

let current: Conn | null = null;

function makeClient(): postgres.Sql {
  const url = env().DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    throw new Error(UNAVAILABLE);
  }
  if (/@db\.[a-z0-9]+\.supabase\.co/.test(url)) {
    // Supabase's direct host is IPv6-only and unreachable from Vercel.
    console.error("DATABASE_URL uses Supabase's direct connection. Use the Transaction pooler string (port 6543).");
  }
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    // Supabase's transaction pooler does not support prepared statements.
    prepare: false,
    ssl: local ? false : "require",
    max: 3,
    idle_timeout: 10,
    max_lifetime: 300,
    connect_timeout: 8,
    // Skip the extra type-discovery round trip on every new connection.
    fetch_types: false,
  });
}

function closeIfIdle(conn: Conn) {
  if (conn.retired && conn.inFlight === 0) conn.sql.end({ timeout: 1 }).catch(() => {});
}

function retire(conn: Conn) {
  conn.retired = true;
  if (current === conn) current = null;
  closeIfIdle(conn);
}

function acquire(): Conn {
  const now = Date.now();
  if (current && current.inFlight === 0 && now - current.lastUsed > STALE_AFTER_MS) retire(current);
  if (!current) current = { sql: makeClient(), inFlight: 0, lastUsed: now, retired: false };
  current.inFlight++;
  current.lastUsed = now;
  return current;
}

function release(conn: Conn) {
  conn.inFlight--;
  conn.lastUsed = Date.now();
  closeIfIdle(conn);
}

async function attempt<T>(work: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const conn = acquire();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(conn.sql),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Query timed out after ${QUERY_TIMEOUT_MS}ms`)), QUERY_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    // Only retire on connection-level trouble; a SQL error leaves it healthy.
    const code = (error as { code?: string }).code ?? "";
    const sqlError = /^[0-9A-Z]{5}$/.test(code) && !code.startsWith("08");
    if (!sqlError) retire(conn);
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    release(conn);
  }
}

/**
 * Runs a database call with the time limit, a single retry for read-only
 * work, and full logging. Visitors only ever see a generic message.
 */
async function guarded<T>(work: (sql: postgres.Sql) => Promise<T>, readOnly: boolean): Promise<T> {
  try {
    return await attempt(work);
  } catch (first) {
    if (readOnly) {
      console.warn("Database retry after:", (first as Error).message);
      try {
        return await attempt(work);
      } catch (second) {
        console.error("Database error:", second);
        throw new Error(UNAVAILABLE);
      }
    }
    console.error("Database error:", first);
    throw new Error(UNAVAILABLE);
  }
}

type Param = string | number | boolean | null;

const isReadOnly = (text: string) => /^\s*(select|with)\b/i.test(text);

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
    const rows = await guarded((sql) => sql.unsafe(toPg(this.text), this.params), isReadOnly(this.text));
    return { results: rows as unknown as T[] };
  }

  async first<T>(): Promise<T | null> {
    const { results } = await this.all<T>();
    return results[0] ?? null;
  }

  async run(): Promise<{ meta: { changes: number } }> {
    const res = await guarded((sql) => sql.unsafe(toPg(this.text), this.params), isReadOnly(this.text));
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
    await guarded(
      (sql) =>
        sql.begin(async (tx) => {
          for (const s of statements) await tx.unsafe(toPg(s.text), s.params);
        }),
      false,
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
  const fwd = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
  return getRequestHeader("x-real-ip") ?? fwd ?? getRequestHeader("cf-connecting-ip") ?? "unknown";
}

/** Order numbers read well on the phone: MB-260614-4831. */
export function orderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return `MB-${ymd}-${String(n[0] % 10000).padStart(4, "0")}`;
}
