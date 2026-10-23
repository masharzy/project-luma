import "server-only";
import DOMPurify from "isomorphic-dompurify";
import { db } from "@/lib/auth/db";
import { emptyDocument, normalizeDocument, type Module, type ExamKind, type ExamDocument } from "./document";
export async function examParent(kind: ExamKind, parentId: string) {
    if (!/^\d{1,16}$/.test(parentId))
        return null;
    const rows = kind === "cambridge"
        ? await db().query("SELECT t.id,t.title,t.sections,CASE WHEN b.access='premium' THEN 'premium' ELSE t.access END AS access,CASE WHEN b.status<>'published' THEN b.status ELSE t.status END AS status,t.book_number,t.test_number FROM public.cambridge_tests t JOIN public.cambridge_books b USING(book_number) WHERE t.id=$1", [parentId])
        : await db().query("SELECT id,title,sections,access,status FROM public.admin_content WHERE id=$1 AND kind=$2", [parentId, kind]);
    const r = rows[0];
    return r ? { id: String(r.id), title: String(r.title || `Cambridge ${r.book_number} · Test ${r.test_number}`), modules: r.sections as string[], access: String(r.access), status: String(r.status) } : null;
}
export async function loadExam(kind: ExamKind, parentId: string, module: Module) {
    const rows = await db().query("SELECT e.document,e.revision,t.durations FROM (SELECT 1) seed LEFT JOIN public.exam_modules e ON e.kind=$1 AND e.parent_id=$2 AND e.module=$3 LEFT JOIN public.cambridge_tests t ON $1='cambridge' AND t.id=$2", [kind,parentId,module]);
    const row=rows[0];
    const data=row?.document?{document:normalizeDocument(row.document,module),revision:Number(row.revision)}:{document:emptyDocument(module),revision:0};
    const minutes=Number(row?.durations?.[module]);
    if(kind==='cambridge'&&Number.isInteger(minutes)&&minutes>0&&minutes<=240)data.document.durationMinutes=minutes;
    return data;
}

function sanitize(value: any, learner = false): any {
    if (typeof value === "string")
        return value.includes("<") ? DOMPurify.sanitize(value, learner ? { FORBID_ATTR: ["data-correct-answer"] } : {}) : value;
    if (Array.isArray(value))
        return value.map(v => sanitize(v, learner));
    if (value && typeof value === "object")
        return Object.fromEntries(Object.entries(value).filter(([key]) => !learner || !/correct|solution|explanation|sample_answer|answer_key/i.test(key)).map(([k, v]) => [k, sanitize(v, learner)]));
    return value;
}
export const learnerDocument = (doc: ExamDocument): ExamDocument => sanitize(doc, true);
export async function saveExam(kind: ExamKind, parentId: string, module: Module, document: unknown, revision: number, userId: string) {
    const doc = normalizeDocument(sanitize(document), module);
    const rows = await db().query(`WITH saved AS (INSERT INTO public.exam_modules(kind,parent_id,module,cambridge_id,content_id,document,updated_by) VALUES($1,$2,$3,CASE WHEN $1='cambridge' THEN $2::bigint ELSE NULL END,CASE WHEN $1<>'cambridge' THEN $2::bigint ELSE NULL END,$4::jsonb,$5) ON CONFLICT(kind,parent_id,module) DO UPDATE SET document=excluded.document,revision=exam_modules.revision+1,updated_by=excluded.updated_by,updated_at=now() WHERE exam_modules.revision=$6 RETURNING revision), timing AS (UPDATE public.cambridge_tests SET durations=jsonb_set(durations,ARRAY[$3::text],to_jsonb(($4::jsonb->>'durationMinutes')::integer)),updated_at=now() WHERE $1='cambridge' AND id=$2 AND EXISTS(SELECT 1 FROM saved) RETURNING id) SELECT revision FROM saved`, [kind, parentId, module, JSON.stringify(doc), userId, revision]);
    return rows[0] ? { revision: Number(rows[0].revision), document: doc } : null;
}
