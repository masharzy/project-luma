import { NextRequest } from "next/server";
import { requireSameOrigin, readBody, AuthHttpError } from "@/lib/auth/http";
import { defaultDurations, validDurations } from "@/lib/cambridge-settings";
import { readSession } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/policy";
import { db } from "@/lib/auth/db";
async function allowed() { const s = await readSession(); return !!s?.user && hasAdminRole(s.user); }
export async function DELETE(request: NextRequest, { params }: {
    params: Promise<{
        id: string;
    }>;
}) { if (!(await allowed()))
    return Response.json({ error: "Forbidden" }, { status: 403 }); const { id } = await params; if (!/^\d+$/.test(id))
    return Response.json({ error: "Invalid ID" }, { status: 400 }); try {
    requireSameOrigin(request);
}
catch {
    return Response.json({ error: "Forbidden" }, { status: 403 });
} await db().query("DELETE FROM public.cambridge_tests WHERE id=$1", [id]); return Response.json({ ok: true }); }
export async function PATCH(request: NextRequest, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    if (!(await allowed()))
        return Response.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    if (!/^\d+$/.test(id))
        return Response.json({ error: "Invalid ID" }, { status: 400 });
    let d: Record<string, unknown>;
    try {
        requireSameOrigin(request);
        d = await readBody(request);
    }
    catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: e instanceof AuthHttpError ? e.status : 400 });
    }
    const { bookNumber, testNumber, title, access, status, sections, durations } = d;
    if ((durations !== undefined && !validDurations(durations)) || (bookNumber !== undefined && (!Number.isSafeInteger(bookNumber) || Number(bookNumber) < 1 || Number(bookNumber) > 1000)) ||
        (testNumber !== undefined && (!Number.isSafeInteger(testNumber) || Number(testNumber) < 1 || Number(testNumber) > 1000)) ||
        (title !== undefined && (typeof title !== "string" || title.length > 180)) ||
        (access !== undefined && !["free", "premium"].includes(String(access))) ||
        (status !== undefined && !["draft", "published", "archived"].includes(String(status))) ||
        (sections !== undefined && (!Array.isArray(sections) || !sections.length || sections.length > 3 || !sections.every(s => ["listening", "reading", "writing"].includes(s)) || new Set(sections).size !== sections.length)))
        return Response.json({ error: "Invalid fields" }, { status: 400 });
    try {
        const rows = await db().query(`UPDATE public.cambridge_tests SET book_number=COALESCE($2,book_number),test_number=COALESCE($3,test_number),title=COALESCE($4,title),access=COALESCE($5,access),status=COALESCE($6,status),sections=COALESCE($7::jsonb,sections),durations=COALESCE($8::jsonb,durations),updated_at=now() WHERE id=$1 RETURNING id`, [id, bookNumber ?? null, testNumber ?? null, title ?? null, access ?? null, status ?? null, sections ? JSON.stringify(sections) : null, durations ? JSON.stringify(durations) : null]);
        return rows.length ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
    }
    catch (e) {
        if (typeof e === "object" && e && "code" in e && e.code === "23505")
            return Response.json({ error: "Test serial already exists in this book" }, { status: 409 });
        throw e;
    }
}
