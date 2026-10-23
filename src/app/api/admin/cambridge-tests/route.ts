import { NextRequest } from "next/server";
import { requireSameOrigin, readBody, AuthHttpError } from "@/lib/auth/http";
import { defaultDurations, validDurations } from "@/lib/cambridge-settings";
import { readSession } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/policy";
import { db } from "@/lib/auth/db";
import { listCambridgeTests } from "@/lib/cambridge";
async function allowed() { const s = await readSession(); return !!s?.user && hasAdminRole(s.user); }
export async function GET() { if (!(await allowed()))
    return Response.json({ error: "Forbidden" }, { status: 403 }); return Response.json({ tests: await listCambridgeTests(false) }, { headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: NextRequest) {
    if (!(await allowed()))
        return Response.json({ error: "Forbidden" }, { status: 403 });
    let d: Record<string, unknown>;
    try {
        requireSameOrigin(request);
        d = await readBody(request);
    }
    catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: e instanceof AuthHttpError ? e.status : 400 });
    }
    const { bookNumber, testNumber, title, access, status, sections, durations } = d;
    if ((durations !== undefined && !validDurations(durations)) || !Number.isSafeInteger(bookNumber) || Number(bookNumber) < 1 || Number(bookNumber) > 1000 ||
        !Number.isSafeInteger(testNumber) || Number(testNumber) < 1 || Number(testNumber) > 1000 ||
        typeof title !== "string" || title.length > 180 ||
        !["free", "premium"].includes(String(access)) || !["draft", "published", "archived"].includes(String(status)) ||
        !Array.isArray(sections) || !sections.length || sections.length > 3 || !sections.every(s => ["listening", "reading", "writing"].includes(s)) || new Set(sections).size !== sections.length)
        return Response.json({ error: "Invalid fields" }, { status: 400 });
    if (!(await db().query("SELECT 1 FROM public.cambridge_books WHERE book_number=$1", [bookNumber])).length)
        return Response.json({ error: "Create the book first" }, { status: 400 });
    try {
        const rows = await db().query(`INSERT INTO public.cambridge_tests(book_number,test_number,title,access,status,sections,durations) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) RETURNING id`, [bookNumber, testNumber, title || "Test " + testNumber, access, status, JSON.stringify(sections), JSON.stringify(durations ?? defaultDurations)]);
        return Response.json({ id: String(rows[0].id) }, { status: 201 });
    }
    catch (e) {
        if (typeof e === "object" && e && "code" in e && e.code === "23505")
            return Response.json({ error: "Test serial already exists in this book" }, { status: 409 });
        throw e;
    }
}
