import 'server-only';
import { db } from '@/lib/auth/db';
import { AuthHttpError } from '@/lib/auth/http';
import { loadExam,examParent } from './store';
import type { ExamDocument,Module } from './document';
export async function mockSources(){
 return db().query(`SELECT t.id::text,'cambridge' AS kind,'Cambridge '||t.book_number||' · Test '||t.test_number AS label,
 ARRAY(SELECT e.module FROM public.exam_modules e WHERE e.kind='cambridge' AND e.parent_id=t.id AND jsonb_array_length(e.document->'parts')>0 ORDER BY e.module) AS modules
 FROM public.cambridge_tests t
 UNION ALL SELECT c.id::text,'practice',CASE WHEN c.book_slug IS NULL THEN 'Practice · ' ELSE 'More Books · '||c.book_slug||' · ' END||c.title,
 ARRAY(SELECT e.module FROM public.exam_modules e WHERE e.kind='practice' AND e.parent_id=c.id AND jsonb_array_length(e.document->'parts')>0 ORDER BY e.module)
 FROM public.admin_content c WHERE c.kind='practice' AND c.status<>'archived' ORDER BY label LIMIT 1000`);
}
// Keep the actual paper and assets intact; source labels belong only in the admin picker.
export function mockCopyDocument(document:ExamDocument,module:Module):ExamDocument{
 const scrub=(value:any):any=>Array.isArray(value)?value.map(scrub):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!/^(source_?(label|title|url)|book_?(name|title)|test_?title)$/i.test(key)).map(([k,v])=>[k,scrub(v)])):value;
 const copy=scrub(document) as ExamDocument;
 copy.parts=copy.parts.map((p:any,i:number)=>({...p,title:(module==='writing'?'Task ':'Part ')+(i+1)}));
 return copy;
}
export async function copyMockSource(id:string,kind:unknown,sourceId:unknown,selected:unknown,adminId:string){
 if(!/^\d{1,16}$/.test(id)||!['cambridge','practice'].includes(String(kind))||typeof sourceId!=='string'||!/^\d{1,16}$/.test(sourceId)||!Array.isArray(selected)||!selected.length||selected.length>3||new Set(selected).size!==selected.length||!selected.every(m=>['listening','reading','writing'].includes(m)))throw new AuthHttpError(400,'Choose a source test and its modules.');
 const parent=await examParent(kind as 'cambridge'|'practice',sourceId);if(!parent||parent.status==='archived')throw new AuthHttpError(404,'Source test unavailable');
 const docs=await Promise.all((selected as Module[]).map(async module=>{const {document,revision}=await loadExam(kind as 'cambridge'|'practice',sourceId,module);if(!revision||!document.parts.length)throw new AuthHttpError(400,'The selected source module has no questions.');return {module,document:mockCopyDocument(document,module)};}));
 const rows=await db().query(`WITH input AS (SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(module text,document jsonb)),
 target AS (UPDATE public.admin_content SET updated_at=now(),durations=durations||(SELECT jsonb_object_agg(module,document->'durationMinutes') FROM input) WHERE id=$1 AND kind='mock' AND status='draft' AND NOT EXISTS(SELECT 1 FROM public.mock_events WHERE id=$1) RETURNING id),
 copied AS (INSERT INTO public.exam_modules(kind,parent_id,module,content_id,document,updated_by)
 SELECT 'mock',t.id,i.module,t.id,i.document,$3::uuid FROM target t CROSS JOIN input i
 ON CONFLICT(kind,parent_id,module) DO UPDATE SET document=excluded.document,revision=exam_modules.revision+1,updated_by=excluded.updated_by,updated_at=now() RETURNING module)
 SELECT module FROM copied`,[id,JSON.stringify(docs),adminId]);
 if(!rows.length)throw new AuthHttpError(409,'Only an unscheduled draft mock can receive copied modules.');
 return {copied:docs.map(d=>d.module)};
}
