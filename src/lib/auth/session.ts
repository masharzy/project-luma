import "server-only";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { digest, randomToken, validToken } from "./crypto";
import { sessionCookieName, secureCookies } from "./config";
import type { AuthSession, AuthUser } from "./types";
export function mapUser(row: Record<string, unknown>): AuthUser {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    emailVerified: row.email_verified === true,
    role: row.role === "admin" ? "admin" : "user",
  };
}
export async function readAccountSession(raw?: string): Promise<AuthSession | null> {
  const token = raw ?? (await cookies()).get(sessionCookieName())?.value;
  if (!validToken(token)) return null;
  const rows = await db().query(
    `UPDATE app_auth.sessions s SET last_seen_at=now() FROM app_auth.users u WHERE s.token_hash=$1 AND s.user_id=u.id AND s.session_version=u.session_version AND s.expires_at>now() AND s.last_seen_at>now()-interval '24 hours' AND u.banned=false RETURNING u.id,u.name,u.email,u.email_verified,u.role`,
    [digest(token)],
  );
  return rows[0] ? { user: mapUser(rows[0]) } : null;
}
// Pending sessions prove password possession but grant no protected app access.
export async function readSession(raw?: string): Promise<AuthSession | null> {
  const session = await readAccountSession(raw);
  return session?.user.emailVerified ? session : null;
}
async function issueSession(userId: string, pending: boolean) {
  const token = randomToken();
  const rows = await db().query(
    `INSERT INTO app_auth.sessions(token_hash,user_id,session_version,expires_at) SELECT $1,id,session_version,now()+($3::integer * interval '1 second') FROM app_auth.users WHERE id=$2 AND (email_verified=true OR $4::boolean) AND banned=false RETURNING user_id`,
    [digest(token), userId, pending ? 86400 : 604800, pending],
  );
  if (!rows[0]) throw new Error("Cannot establish session.");
  if (!pending) await recordDevice(userId, digest(token));
  return token;
}
// Best effort: a failure here must never block sign-in.
async function recordDevice(userId: string, tokenHash: string) {
  try {
    const agent = (await headers()).get("user-agent")?.slice(0, 300) || null;
    await db().query(
      `WITH me AS (UPDATE app_auth.sessions SET user_agent=$3 WHERE token_hash=$1 RETURNING user_id),
       cap AS (SELECT coalesce(u.device_limit,p.default_device_limit) AS n FROM app_auth.users u LEFT JOIN public.evaluation_policy p ON p.id=true WHERE u.id=$2)
       DELETE FROM app_auth.sessions s WHERE s.user_id=$2 AND s.expires_at>now() AND s.token_hash IN (
         SELECT token_hash FROM app_auth.sessions WHERE user_id=$2 AND expires_at>now() AND (SELECT n FROM cap) IS NOT NULL
         ORDER BY last_seen_at DESC, created_at DESC OFFSET (SELECT n FROM cap))`,
      [tokenHash, userId, agent],
    );
  } catch {}
}
export const createSession = (userId: string) => issueSession(userId, false);
export const createPendingSession = (userId: string) => issueSession(userId, true);
export const sessionCookieOptions = () => ({
  httpOnly: true,
  secure: secureCookies(),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
});
export async function revokeSession(token: string | undefined) {
  if (validToken(token))
    await db().query("DELETE FROM app_auth.sessions WHERE token_hash=$1", [
      digest(token),
    ]);
}
