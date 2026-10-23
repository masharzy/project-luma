import "server-only";
import DOMPurify from "isomorphic-dompurify";
import { db } from "@/lib/auth/db";
import { emptyDocument, normalizeDocument, type Module, type ExamKind, type ExamDocument } from "./document";
export async function examParent(kind: ExamKind, parentId: string) {
  if (!/^\d{1,16}$/.test(parentId)) return null;
  const rows = kind === "cambridge"
    ? await db().query("SELECT id,title,sections,access,status,book_number,test_number FROM public.cambridge_tests WHERE id=$1", [parentId])
    : await db().query("SELECT id,title,sections,access,status FROM public.admin_content WHERE id=$1 AND kind=$2", [parentId, kind]);
  const r = rows[0];
  return r ? { id: String(r.id), title: String(r.title || `Cambridge ${r.book_number} · Test ${r.test_number}`), modules: r.sections as string[], access: String(r.access), status: String(r.status) } : null;
}
export async function loadExam(kind: ExamKind, parentId: string, module: Module) {
  const rows = await db().query("SELECT document,revision FROM public.exam_modules WHERE kind=$1 AND parent_id=$2 AND module=$3", [kind, parentId, module]);
  return rows[0] ? { document: normalizeDocument(rows[0].document, module), revision: Number(rows[0].revision) } : { document: emptyDocument(module), revision: 0 };
}
function sanitize(value: any, learner = false): any {
  if (typeof value === "string") return value.includes("<") ? DOMPurify.sanitize(value, learner ? { FORBID_ATTR: ["data-correct-answer"] } : {}) : value;
  if (Array.isArray(value)) return value.map(v => sanitize(v, learner));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !learner || !/correct|solution|explanation|sample_answer|answer_key/i.test(key)).map(([k,v]) => [k,sanitize(v,learner)]));
  return value;
}
export const learnerDocument = (doc: ExamDocument): ExamDocument => sanitize(doc, true);
export async function saveExam(kind: ExamKind, parentId: string, module: Module, document: unknown, revision: number, userId: string) {
  const doc = normalizeDocument(sanitize(document), module);
  const rows = await db().query(`INSERT INTO public.exam_modules(kind,parent_id,module,cambridge_id,content_id,document,updated_by) VALUES($1,$2,$3,CASE WHEN $1='cambridge' THEN $2::bigint ELSE NULL END,CASE WHEN $1<>'cambridge' THEN $2::bigint ELSE NULL END,$4::jsonb,$5) ON CONFLICT(kind,parent_id,module) DO UPDATE SET document=excluded.document,revision=exam_modules.revision+1,updated_by=excluded.updated_by,updated_at=now() WHERE exam_modules.revision=$6 RETURNING revision`, [kind, parentId, module, JSON.stringify(doc), userId, revision]);
  return rows[0] ? { revision: Number(rows[0].revision), document: doc } : null;
}
