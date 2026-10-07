/**
 * Management login. The owner's credentials are secrets (ADMIN_EMAIL and
 * ADMIN_PASSWORD) set as environment variables (.env locally, Vercel project
 * settings in production); nothing is stored in code.
 * Sessions are random tokens in an HttpOnly cookie, kept hashed in the database.
 */
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

import { clientIp, db, dbConfigured, randomToken, safeEqual, sha256Hex } from "./db.server";
import { env as bindings } from "./env.server";

const COOKIE = "mbd_mgmt";
const SESSION_MS = 12 * 60 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export interface Admin {
  email: string;
}

export function loginConfigured(): boolean {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = bindings();
  return Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);
}

export async function currentAdmin(): Promise<Admin | null> {
  const token = getCookie(COOKIE);
  if (!token || !dbConfigured()) return null;
  const row = await db()
    .prepare("SELECT email, expires_at FROM sessions WHERE token_hash = ?")
    .bind(await sha256Hex(token))
    .first<{ email: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  return { email: row.email };
}

export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) throw new Error("Your session has ended. Please sign in again.");
  return admin;
}

export async function signIn(email: string, password: string): Promise<Admin> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = bindings();
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Management login is not set up yet. Add ADMIN_EMAIL and ADMIN_PASSWORD to the environment variables, then redeploy.");
  }
  const ip = clientIp();
  const since = Date.now() - WINDOW_MS;
  const attempts = await db()
    .prepare("SELECT COUNT(*)::int AS n FROM login_attempts WHERE ip = ? AND at > ?")
    .bind(ip, since)
    .first<{ n: number }>();
  if ((attempts?.n ?? 0) >= MAX_ATTEMPTS) {
    throw new Error("Too many attempts. Please wait 15 minutes and try again.");
  }

  const emailOk = await safeEqual(email.trim().toLowerCase(), ADMIN_EMAIL.trim().toLowerCase());
  const passOk = await safeEqual(password, ADMIN_PASSWORD);
  if (!emailOk || !passOk) {
    await db().prepare("INSERT INTO login_attempts (ip, at) VALUES (?, ?)").bind(ip, Date.now()).run();
    throw new Error("That email and password do not match.");
  }

  const token = randomToken(32);
  const now = Date.now();
  await db().batch([
    db().prepare("DELETE FROM login_attempts WHERE ip = ? OR at < ?").bind(ip, since),
    db().prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    db()
      .prepare("INSERT INTO sessions (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)")
      .bind(await sha256Hex(token), ADMIN_EMAIL, now, now + SESSION_MS),
  ]);
  setCookie(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
  return { email: ADMIN_EMAIL };
}

export async function signOut(): Promise<void> {
  const token = getCookie(COOKIE);
  if (token && dbConfigured()) {
    await db().prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  }
  deleteCookie(COOKIE, { path: "/" });
}
