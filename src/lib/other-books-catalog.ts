import "server-only";
import { db } from "@/lib/auth/db";
import { questionType } from "@/lib/exam/question-types";
import { validBookSlug, type BookTest } from "@/lib/other-books";
export async function listOtherBookTests():Promise<BookTest[]> {
 const rows=await db().query(`SELECT c.id,c.title,to_jsonb(c)->>'book_slug' AS book_slug,e.module,e.document
 FROM public.admin_content c JOIN public.exam_modules e ON e.kind='practice' AND e.parent_id=c.id
 WHERE c.kind='practice' AND c.status='published' AND c.access='free' AND c.sections ? e.module
 AND (to_jsonb(c)->>'book_slug') IS NOT NULL AND jsonb_array_length(e.document->'parts')>0
 AND (e.module IN ('writing','speaking') OR jsonb_array_length(e.document->'questions')>0) ORDER BY c.id,e.module`);
 const tests=new Map<string,BookTest>();
 for(const row of rows){
  if(!validBookSlug(row.book_slug))continue;
  const id=String(row.id),doc=row.document;
  if(!tests.has(id))tests.set(id,{id,title:String(row.title),bookSlug:row.book_slug,modules:[]});
  const groups=new Map<string,Record<string,any>>();
  for(const part of doc.parts||[])for(const group of part.question_groups||[])groups.set(group.id,group);
  const types=[...new Set<string>((doc.questions||[]).map((q:Record<string,any>)=>questionType(q,groups.get(q.group_id))))].sort();
  tests.get(id)!.modules.push({module:String(row.module),types});
 }
 // Only metadata crosses the server/client boundary; passages, audio and answer keys stay server-side.
 return [...tests.values()];
}
