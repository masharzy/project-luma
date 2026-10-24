import { NextRequest } from 'next/server';
import { db } from '@/lib/auth/db';
import { requireSameOrigin,readBody,json,AuthHttpError,limitMany,networkKey } from '@/lib/auth/http';
import { productUser,productAccess,productError } from '@/lib/products/access';
import { generateWritingTask } from '@/lib/products/task-generation';
export const runtime='nodejs';export const maxDuration=90;
export async function POST(req:NextRequest){try{requireSameOrigin(req);const u=await productUser();await productAccess(u.id,'writing_product');const d=await readBody(req);if(![1,2].includes(Number(d.task))||typeof d.topic!=='string'||d.topic.length>160)throw new AuthHttpError(400,'Choose a task and short topic.');await limitMany([{key:'task-generation:'+u.id,max:10,seconds:86400},{key:'task-generation-net:'+networkKey(req),max:50,seconds:86400}]);const {usage,...task}=await generateWritingTask(Number(d.task) as 1|2,d.topic);return json({task});}catch(e){return productError(e)}}
export async function GET(req:NextRequest){try{await productUser();const id=req.nextUrl.searchParams.get('test');
 if(!id){const rows=await db().query("SELECT t.id,t.book_number,t.test_number,t.title FROM public.cambridge_tests t JOIN public.cambridge_books b USING(book_number) JOIN public.exam_modules e ON e.kind='cambridge' AND e.parent_id=t.id AND e.module='writing' WHERE t.status='published' AND b.status='published' AND t.access='free' AND b.access='free' AND t.sections ? 'writing' AND jsonb_array_length(e.document->'parts')>0 ORDER BY t.book_number,t.test_number LIMIT 200");return json({tests:rows});}
 if(!/^\d{1,16}$/.test(id))throw new AuthHttpError(400,'Invalid Cambridge test');
 const rows=await db().query("SELECT e.document FROM public.exam_modules e JOIN public.cambridge_tests t ON t.id=e.parent_id JOIN public.cambridge_books b USING(book_number) WHERE e.kind='cambridge' AND e.module='writing' AND t.id=$1 AND t.status='published' AND b.status='published' AND t.access='free' AND b.access='free' AND t.sections ? 'writing'",[id]);if(!rows[0])throw new AuthHttpError(404,'Writing tasks are unavailable.');
 const doc=rows[0].document;return json({tasks:doc.parts.map((p:any,i:number)=>({task:i+1,question:String(p.passage_text||doc.questions.find((q:any)=>q.part_id===p.id)?.question_text||'').replace(/<[^>]*>/g,' ').trim(),image:p.image_url||null,source:'cambridge'}))});
 }catch(e){return productError(e)}}
