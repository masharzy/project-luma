import "server-only";
import { db } from "@/lib/auth/db";
import { questionType } from "@/lib/exam/question-types";
import {type BookTest} from "@/lib/other-books";
export async function listOtherBookTests(bookSlug?:string):Promise<BookTest[]> {
 const rows=await db().query(`SELECT c.id,c.title,c.book_slug,c.access,c.sections,c.durations,e.module,e.document
 FROM public.admin_content c JOIN public.book_volumes b ON b.slug=c.book_slug AND b.status='published' JOIN public.book_series s ON s.slug=b.series_slug AND s.status='published' LEFT JOIN public.exam_modules e ON e.kind='practice' AND e.parent_id=c.id
 AND c.sections ? e.module AND e.revision>0 AND jsonb_array_length(e.document->'parts')>0
 AND e.module IN ('listening','reading','writing') AND (e.module='writing' OR jsonb_array_length(e.document->'questions')>0)
 WHERE c.kind='practice' AND c.status='published' AND c.book_slug IS NOT NULL
 AND ($1::text IS NULL OR c.book_slug=$1) ORDER BY c.id,e.module`,[bookSlug||null]);
 const tests=new Map<string,BookTest>();
 for(const row of rows){const id=String(row.id);
 if(!tests.has(id))tests.set(id,{id,title:String(row.title),bookSlug:row.book_slug,access:row.access==='premium'?'premium':'free',sections:row.sections||[],durations:row.durations||{},modules:[]});
 if(!row.module)continue;
 const doc=row.document,groups=new Map<string,Record<string,any>>();
 for(const part of doc.parts||[])for(const group of part.question_groups||[])groups.set(group.id,group);
 const types=[...new Set<string>((doc.questions||[]).map((q:Record<string,any>)=>questionType(q,groups.get(q.group_id))))].sort();
 tests.get(id)!.modules.push({module:String(row.module),types});}
 // Speaking lives in speaking_sets, not exam_modules: surface it on the card when a published set is linked.
 const ids=[...tests.keys()];
 if(ids.length){const sets=await db().query(`SELECT practice_content_id::text AS id FROM public.speaking_sets WHERE published=true AND document IS NOT NULL AND practice_content_id::text=ANY($1::text[])`,[ids]);
  for(const r of sets){const t=tests.get(String(r.id));if(t&&(t.sections||[]).includes('speaking')&&!t.modules.some(m=>m.module==='speaking'))t.modules.push({module:'speaking',types:[]});}}
 // Metadata only: locked passages, questions and answer keys never cross this boundary.
 return [...tests.values()];
}
