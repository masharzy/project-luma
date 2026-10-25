import 'server-only';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { readSession } from '@/lib/auth/session';
import { db } from '@/lib/auth/db';
import { digest, randomToken, validToken } from '@/lib/auth/crypto';
import { AuthHttpError } from '@/lib/auth/http';
import { moduleOrder, selectedModules } from '@/lib/cambridge-settings';
import { examParent, loadExam, learnerDocument } from './store';
import { gradeModule } from './result';
import type { ExamDocument, Module } from './document';
export const ownerCookie = 'luma_exam_owner';
type Snapshot = {
    module: Module;
    document: ExamDocument;
}[];
export async function startAttempt(kind: string, parentId: string, selection: string, owner: string, userId: string | null) {
    if (!['cambridge', 'practice'].includes(kind) || !/^\d{1,16}$/.test(parentId) || ![...moduleOrder, 'full'].includes(selection as any))
        throw new AuthHttpError(400, 'Invalid test');
    const k = kind as 'cambridge' | 'practice';
    const parent = await examParent(k, parentId);
    if (!parent || parent.status !== 'published' || parent.access !== 'free')
        throw new AuthHttpError(404, 'Test unavailable');
    const chosen = selectedModules(parent.modules, selection);
    if (!chosen.length)
        throw new AuthHttpError(404, 'Module unavailable');
    const snapshot: Snapshot = await Promise.all(chosen.map(async module => {
        const { document, revision } = await loadExam(k, parentId, module);
        if (!revision || !document.parts.length || (module !== 'writing' && !document.questions.length))
            throw new AuthHttpError(409, 'This test is not ready yet');
        return { module, document };
    }));
    const id = randomUUID();
    await db().query("INSERT INTO public.exam_attempts(id,owner_hash,kind,parent_id,title,snapshot,user_id,deadline) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::uuid,now()+($8::integer * interval '1 second'))", [id, digest(owner), kind, parentId, parent.title, JSON.stringify(snapshot), userId, snapshot[0].document.durationMinutes * 60]);
    return id;
}
export async function readAttempt(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id))
        throw new AuthHttpError(404, 'Attempt not found');
    const session = await readSession();
    const token = (await cookies()).get(ownerCookie)?.value;
    if (!session?.user.id && !validToken(token))
        throw new AuthHttpError(404, 'Attempt not found');
    const rows = await db().query(
        'SELECT * FROM public.exam_attempts WHERE id=$1 AND expires_at>now() AND ((user_id IS NOT NULL AND user_id=$2::uuid) OR (user_id IS NULL AND owner_hash=$3))',
        [id, session?.user.id ?? null, validToken(token) ? digest(token) : '']
    );
    if (!rows.length)
        throw new AuthHttpError(404, 'This attempt has expired or belongs to another account');
    return rows[0];
}
export function publicAttempt(r: any) {
    const snapshot = r.snapshot as Snapshot;
    const index = Number(r.current_index);
    const complete = index >= snapshot.length;
    return { id: r.id, title: r.title, kind: r.kind, parentId: String(r.parent_id), index, complete, deadline: r.deadline, serverNow: Date.now(), modules: snapshot.map(s => ({ module: s.module, minutes: s.document.durationMinutes })), current: !complete ? { module: snapshot[index].module, document: learnerDocument(snapshot[index].document) } : null, results: complete ? r.results : [] };
}
export async function advanceAttempt(id: string, body: Record<string, unknown>) {
    const r = await readAttempt(id);
    const index = Number(r.current_index), snapshot = r.snapshot as Snapshot;
    if (index >= snapshot.length)
        return publicAttempt(r);
    if (body.index !== index)
        throw new AuthHttpError(409, 'This module has already changed. Reload the test.');
    if (body.action === 'start') {
        if (!r.deadline) {
            await db().query("UPDATE public.exam_attempts SET deadline=now()+($3::integer * interval '1 second') WHERE id=$1 AND current_index=$2 AND deadline IS NULL", [id, index, snapshot[index].document.durationMinutes * 60]);
        }
    }
    else if (body.action === 'submit') {
        if (!r.deadline)
            throw new AuthHttpError(409, 'Start the module first');
        const input = body.answers;
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length > 450)
            throw new AuthHttpError(400, 'Invalid answers');
        const allowed = new Set(snapshot[index].document.questions.map((q: any) => q.id));
        snapshot[index].document.parts.forEach((p: any) => allowed.add('writing_draft_' + p.id));
        const answers: Record<string, string> = {};
        for (const [key, value] of Object.entries(input)) {
            if (!allowed.has(key) || typeof value !== 'string' || value.length > 60000)
                throw new AuthHttpError(400, 'Invalid answer');
            answers[key] = value;
        }
        const result = gradeModule(snapshot[index].module, snapshot[index].document, answers);
        await db().query("UPDATE public.exam_attempts SET current_index=current_index+1,deadline=CASE WHEN current_index+1<$5::integer THEN now()+($6::integer * interval '1 second') ELSE NULL END,results=results||$3::jsonb,answers=jsonb_set(answers,ARRAY[$2::text],$4::jsonb) WHERE id=$1 AND current_index=$2::integer AND deadline IS NOT NULL", [id, index, JSON.stringify([result]), JSON.stringify(answers), snapshot.length, snapshot[index + 1]?.document.durationMinutes * 60 ?? 0]);
    }
    else
        throw new AuthHttpError(400, 'Invalid action');
    return publicAttempt(await readAttempt(id));
}
export function newOwner(existing: string | undefined) { return validToken(existing) ? existing : randomToken(); }
