import { NextRequest } from 'next/server';
import { requireSameOrigin, readBody, json, AuthHttpError, limitMany, networkKey } from '@/lib/auth/http';
import { readSession } from '@/lib/auth/session';
import { createWritingEvaluation } from '@/lib/evaluation/store';
import { evaluationConfigured } from '@/lib/evaluation/provider';
import { enqueueWriting } from '@/lib/evaluation/queue';
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
    const id = (await c.params).id;
    const body = await readBody(req, 512 * 1024);
    const result = await advanceAttempt(id, body);
    if(body.action==='save')return json({saved:true});
    // Writing feedback is automatic at submission, not triggered by another learner button.
    // It is deliberately best-effort: an AI/queue outage must not undo saved exam answers.
    if (result.kind !== 'mock' && body.action === 'submit' && result.complete && result.results.some((r: { module: string }) => r.module === 'writing')) {
        try {
            const session = await readSession();
            if (session && await evaluationConfigured()) {
                await limitMany([
                    { key: 'writing-eval:' + session.user.id, max: 12, seconds: 3600 },
                    { key: 'writing-eval-net:' + networkKey(req), max: 60, seconds: 3600 },
                ]);
                const job = await createWritingEvaluation(id, session.user.id);
                if (job.status === 'pending') await enqueueWriting(String(job.id));
            }
        } catch (evaluationError) {
            // The UI will show the quota/access error or retry a pending job idempotently.
            console.warn('Automatic writing evaluation was not queued', evaluationError);
        }
    }
    return json(result);
}
catch (e) {
    return failure(e);
} }
