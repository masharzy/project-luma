import { NextRequest } from 'next/server';
import { requireSameOrigin, readBody, json, AuthHttpError } from '@/lib/auth/http';
import { readAttempt, publicAttempt, advanceAttempt } from '@/lib/exam/attempts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = {
    params: Promise<{
        id: string;
    }>;
};
function failure(e: unknown) { if (e instanceof AuthHttpError)
    return json({ error: e.message }, e.status); console.error('Attempt request failed', e); return json({ error: 'Unable to load or submit this test. Please retry.' }, 503); }
export async function GET(_: NextRequest, c: Context) { try {
    return json(publicAttempt(await readAttempt((await c.params).id)));
}
catch (e) {
    return failure(e);
} }
export async function POST(req: NextRequest, c: Context) { try {
    requireSameOrigin(req);
    return json(await advanceAttempt((await c.params).id, await readBody(req, 512 * 1024)));
}
catch (e) {
    return failure(e);
} }
