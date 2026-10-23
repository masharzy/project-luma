import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { appOrigin } from "./config";
import { digest } from "./crypto";
import { db } from "./db";
export class AuthHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "AUTH_ERROR",
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", Pragma: "no-cache" },
  });
}
export function requireSameOrigin(request: NextRequest) {
  if (
    request.headers.get("origin") !== appOrigin() ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new AuthHttpError(
      403,
      "This request is not allowed.",
      "INVALID_ORIGIN",
    );
}
export async function readBody(request: NextRequest) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new AuthHttpError(415, "Use a JSON request.");
  if (Number(request.headers.get("content-length") || 0) > 8192)
    throw new AuthHttpError(413, "Request too large.");
  if (!request.body) throw new AuthHttpError(400, "Missing request body.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 8192) {
      await reader.cancel();
      throw new AuthHttpError(413, "Request too large.");
    }
    chunks.push(value);
  }
  let parsed;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AuthHttpError(400, "Invalid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new AuthHttpError(400, "Invalid request.");
  return parsed as Record<string, unknown>;
}
export function parseEmail(value: unknown) {
  if (typeof value !== "string" || value.length > 254)
    throw new AuthHttpError(400, "Enter a valid email address.");
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AuthHttpError(400, "Enter a valid email address.");
  return email;
}
export function parseName(value: unknown) {
  if (
    typeof value !== "string" ||
    value.trim().length < 2 ||
    value.trim().length > 80
  )
    throw new AuthHttpError(400, "Use a name between 2 and 80 characters.");
  return value.trim();
}
export function networkKey(request: NextRequest) {
  return process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
    : "local";
}
export async function limitMany(
  entries: { key: string; max: number; seconds?: number }[],
) {
  const now = Math.floor(Date.now() / 1000);
  const input = entries.map((e) => ({
    key_hash: digest(e.key),
    max_count: e.max,
    window_seconds: e.seconds || 900,
    window_start: Math.floor(now / (e.seconds || 900)) * (e.seconds || 900),
  }));
  const rows = await db().query(
    `WITH input AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(key_hash text,max_count integer,window_seconds integer,window_start bigint)), counts AS (INSERT INTO app_auth.rate_limits(key_hash,window_start,count,expires_at) SELECT key_hash,window_start,1,to_timestamp(window_start+window_seconds) FROM input WHERE true ON CONFLICT(key_hash,window_start) DO UPDATE SET count=app_auth.rate_limits.count+1 RETURNING key_hash,window_start,count) SELECT bool_and(counts.count<=input.max_count) AS allowed FROM counts JOIN input USING(key_hash,window_start)`,
    [JSON.stringify(input)],
  );
  if (rows[0]?.allowed !== true)
    throw new AuthHttpError(
      429,
      "Too many attempts. Please wait and try again.",
      "RATE_LIMITED",
    );
}
export async function limit(key: string, max: number, windowSeconds = 900) {
  await limitMany([{ key, max, seconds: windowSeconds }]);
}
export async function audit(userId: string, action: string) {
  await db().query(
    "INSERT INTO app_auth.audit_events(user_id,action) VALUES($1,$2)",
    [userId, action],
  );
}
