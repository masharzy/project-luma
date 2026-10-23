import { NextRequest } from "next/server";
import { readSession } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/policy";
import { requireSameOrigin, AuthHttpError } from "@/lib/auth/http";
import { normalizeDocument, kinds, modules, type ExamKind, type Module } from "@/lib/exam/document";
import { examParent, loadExam, saveExam } from "@/lib/exam/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ kind: string; id: string; module: string }> };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
async function context(c: Context) {
  const p = await c.params;
  if (!kinds.includes(p.kind as ExamKind) || !modules.includes(p.module as Module)) return null;
  const parent = await examParent(p.kind as ExamKind, p.id);
  return parent && parent.modules.includes(p.module) ? { ...p, kind: p.kind as ExamKind, module: p.module as Module } : null;
}
export async function GET(_: NextRequest, c: Context) {
  const session = await readSession();
  if (!session || !hasAdminRole(session.user)) return reply({ error: "Forbidden" }, 403);
  const p = await context(c); if (!p) return reply({ error: "Module not found" }, 404);
  return reply(await loadExam(p.kind, p.id, p.module));
}
export async function PUT(request: NextRequest, c: Context) {
  try {
    const session = await readSession();
    if (!session || !hasAdminRole(session.user)) return reply({ error: "Forbidden" }, 403);
    requireSameOrigin(request);
    const p = await context(c); if (!p) return reply({ error: "Module not found" }, 404);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Use JSON" }, 415);
    const reader = request.body?.getReader(); if (!reader) return reply({ error: "Missing document" }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 3 * 1024 * 1024) { await reader.cancel(); return reply({ error: "Module exceeds 3 MB. Use smaller images." }, 413); } chunks.push(value); }
    let body; try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return reply({ error: "Invalid JSON" }, 400); }
    if (!Number.isSafeInteger(body?.revision) || body.revision < 0) return reply({ error: "Invalid revision" }, 400);
    let document;
    try { document = normalizeDocument(body.document, p.module); }
    catch (e) { return reply({ error: e instanceof Error ? e.message : "Invalid module document" }, 400); }
    const saved = await saveExam(p.kind, p.id, p.module, document, body.revision, session.user.id);
    return saved ? reply(saved) : reply({ error: "Another tab saved this module. Reload before saving your changes." }, 409);
  } catch (e) { if (e instanceof AuthHttpError) return reply({ error: e.message }, e.status); return reply({ error: "Unable to save the module." }, 503); }
}
