import { NextRequest } from 'next/server';
import { secureCookies } from '@/lib/auth/config';
import { cookies } from 'next/headers';
import { requireSameOrigin, readBody, json, AuthHttpError, limit, networkKey } from '@/lib/auth/http';
import { startAttempt, ownerCookie, newOwner } from '@/lib/exam/attempts';
import { readSession } from '@/lib/auth/session';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
    try {
        requireSameOrigin(req);
        const d = await readBody(req);
        await limit('exam-start:' + networkKey(req), 20);
        const owner = newOwner((await cookies()).get(ownerCookie)?.value);
        const session = await readSession();
        const id = await startAttempt(String(d.kind), String(d.parentId), String(d.selection), owner, session?.user.id ?? null);
        const response = json({ id }, 201);
        response.cookies.set(ownerCookie, owner, { httpOnly: true, secure: secureCookies(), sameSite: 'lax', path: '/', maxAge: 86400 });
        return response;
    }
    catch (e) {
        if (e instanceof AuthHttpError)
            return json({ error: e.message }, e.status);
        console.error('Attempt start failed', e);
        return json({ error: 'Unable to start this test' }, 503);
    }
}
