import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { requireSameOrigin, readBody, json, AuthHttpError } from '@/lib/auth/http';
import { db } from '@/lib/auth/db';
import { listCambridgeBooks } from '@/lib/cambridge';
export async function GET() { const s = await readSession(); if (!s || !hasAdminRole(s.user))
    return json({ error: 'Forbidden' }, 403); return json({ books: await listCambridgeBooks(false) }); }
async function save(req: NextRequest, edit: boolean) {
    try {
        const s = await readSession();
        if (!s || !hasAdminRole(s.user))
            return json({ error: 'Forbidden' }, 403);
        requireSameOrigin(req);
        const d = await readBody(req);
        if (!Number.isInteger(d.bookNumber) || Number(d.bookNumber) < 1 || Number(d.bookNumber) > 1000 || typeof d.title !== 'string' || !d.title.trim() || d.title.length > 180 || !['free', 'premium'].includes(String(d.access)) || !['draft', 'published', 'archived'].includes(String(d.status)))
            return json({ error: 'Invalid book fields' }, 400);
        const rows = edit ? await db().query('UPDATE public.cambridge_books SET title=$2,access=$3,status=$4,updated_at=now() WHERE book_number=$1 RETURNING book_number', [d.bookNumber, d.title.trim(), d.access, d.status]) : await db().query('INSERT INTO public.cambridge_books(book_number,title,access,status) VALUES($1,$2,$3,$4) RETURNING book_number', [d.bookNumber, d.title.trim(), d.access, d.status]);
        return rows.length ? json({ ok: true }, edit ? 200 : 201) : json({ error: 'Book not found' }, 404);
    }
    catch (e) {
        if (e instanceof AuthHttpError)
            return json({ error: e.message }, e.status);
        if ((e as {
            code?: string;
        }).code === '23505')
            return json({ error: 'This book already exists' }, 409);
        return json({ error: 'Unable to save book' }, 503);
    }
}
export function POST(req: NextRequest) { return save(req, false); }
export function PATCH(req: NextRequest) { return save(req, true); }
