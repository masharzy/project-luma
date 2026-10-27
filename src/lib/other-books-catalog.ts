import "server-only";
import { db } from "@/lib/auth/db";
import { questionType } from "@/lib/exam/question-types";
import { validBookSlug,type BookTest } from "@/lib/other-books";
export async function listOtherBookTests(bookSlug?:string):Promise<BookTest[]> {
 const rows=await db().query(`SELECT c.id,c.title,c.book_slug,c.access,c.sections,c.durations,e.module,e.document
 FROM public.admin_content c LEFT JOIN public.exam_modules e ON e.kind='practice' AND e.parent_id=c.id
 AND c.sections ? e.module AND e.revision>0 AND jsonb_array_length(e.document->'parts')>0
 AND (e.module IN ('writing','speaking') OR jsonb_array_length(e.document->'questions')>0)
 WHERE c.kind='practice' AND c.status='published' AND c.book_slug IS NOT NULL
 AND ($1::text IS NULL OR c.book_slug=$1) ORDER BY c.id,e.module`,[bookSlug||null]);
 const tests=new Map<string,BookTest>();
 for(const row of rows){if(!validBookSlug(row.book_slug))continue;const id=String(row.id);
 if(!tests.has(id))tests.set(id,{id,title:String(row.title),bookSlug:row.book_slug,access:row.access==='premium'?'premium':'free',sections:row.sections||[],durations:row.durations||{},modules:[]});
 if(!row.module)continue;
 const doc=row.document,groups=new Map<string,Record<string,any>>();
 for(const part of doc.parts||[])for(const group of part.question_groups||[])groups.set(group.id,group);
 const types=[...new Set<string>((doc.questions||[]).map((q:Record<string,any>)=>questionType(q,groups.get(q.group_id))))].sort();
 tests.get(id)!.modules.push({module:String(row.module),types});}
 const speaking=await db().query(`SELECT s.id,s.practice_content_id FROM public.speaking_sets s JOIN public.admin_content c ON c.id=s.practice_content_id WHERE s.published=true AND s.document IS NOT NULL AND c.kind='practice' AND c.status='published' AND c.sections ? 'speaking' AND ($1::text IS NULL OR c.book_slug=$1)`,[bookSlug||null]);
 for(const s of speaking){const t=tests.get(String(s.practice_content_id));if(t){t.speakingSetId=String(s.id);t.modules.push({module:'speaking',types:[]});}}
 // Metadata only: locked passages, questions and answer keys never cross this boundary.
 return [...tests.values()];
}
