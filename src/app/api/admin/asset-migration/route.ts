import { NextRequest } from "next/server";
import { readSession } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/policy";
import { requireSameOrigin, AuthHttpError, json, limit, readBody } from "@/lib/auth/http";
import { appOrigin } from "@/lib/auth/config";
import { scanAssets, migrateAsset, MigrationError } from "@/lib/admin/asset-migration";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
async function admin() { const s = await readSession(); if (!s?.user || !hasAdminRole(s.user)) throw new AuthHttpError(403, "Forbidden"); return s.user; }
export async function GET() {
  try { await admin(); return json(await scanAssets(appOrigin())); }
  catch (e) { return e instanceof AuthHttpError ? json({ error: e.message }, e.status) : json({ error: "Unable to scan test assets." }, 503); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await admin(); requireSameOrigin(req); await limit("asset-migration:" + user.id, 3000, 3600);
    const body = await readBody(req, 1_700_000);
    return json(await migrateAsset(String((body as any)?.url || ""), user.id, appOrigin()));
  } catch (e) {
    if (e instanceof AuthHttpError) return json({ error: e.message }, e.status);
    if (e instanceof MigrationError) return json({ error: e.message }, 422);
    console.error("asset migration failed", e instanceof Error ? e.name + ": " + e.message.slice(0, 200) : "unknown");
    return json({ error: "Migration failed. Check R2 and try again." }, 503);
  }
}
