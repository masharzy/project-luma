import {writingSource,writingTaskList} from '@/lib/products/writing-library';
import {hasPremiumTests} from '@/lib/learner/test-access';
import { NextRequest } from 'next/server';
import { db } from '@/lib/auth/db';
import { requireSameOrigin,readBody,json,AuthHttpError,limitMany,networkKey } from '@/lib/auth/http';
import { productUser,productAccess,productError } from '@/lib/products/access';
import { generateWritingTask } from '@/lib/products/task-generation';
export const runtime='nodejs';export const maxDuration=90;
export async function POST(req:NextRequest){try{requireSameOrigin(req);const u=await productUser();await productAccess(u.id,'writing_product');const d=await readBody(req);if(![1,2].includes(Number(d.task))||typeof d.topic!=='string'||d.topic.length>160)throw new AuthHttpError(400,'Choose a task and short topic.');await limitMany([{key:'task-generation:'+u.id,max:10,seconds:86400},{key:'task-generation-net:'+networkKey(req),max:50,seconds:86400}]);const {usage,...task}=await generateWritingTask(Number(d.task) as 1|2,d.topic);return json({task});}catch(e){return productError(e)}}
export async function GET(req:NextRequest){try{const user=await productUser();const premium=await hasPremiumTests(user.id);const input=req.nextUrl.searchParams.get('test');
 const access=`WITH sources AS (
 SELECT t.id,'cambridge'::text kind,t.title,t.book_number,t.test_number,NULL::text book_slug,e.document
 FROM public.cambridge_tests t JOIN public.cambridge_books b USING(book_number) JOIN public.exam_modules e ON e.kind='cambridge' AND e.parent_id=t.id AND e.module='writing'
 WHERE t.status='published' AND b.status='published' AND ((t.access='free' AND b.access='free') OR $1::boolean) AND t.sections ? 'writing'
 UNION ALL
 SELECT c.id,'practice'::text kind,c.title,NULL::integer,NULL::integer,c.book_slug,e.document
 FROM public.admin_content c JOIN public.exam_modules e ON e.kind='practice' AND e.parent_id=c.id AND e.module='writing'
 WHERE c.kind='practice' AND c.status='published' AND (c.access='free' OR $1::boolean) AND c.sections ? 'writing'
 )`;
 if(!input){const rows=await db().query(access+` SELECT * FROM sources WHERE jsonb_array_length(document->'parts')>0 ORDER BY kind,book_number,test_number,title`,[premium]);return json({tests:rows.map((r:any)=>({id:String(r.id),kind:r.kind,...writingSource(r),tasks:writingTaskList(r.document,r.kind).map((t:any)=>t.task)}))});}
 const match=input.match(/^(?:(cambridge|practice):)?(\d{1,16})$/);if(!match)throw new AuthHttpError(400,'Choose a valid test.');
 const kind=match[1]||'cambridge',rows=await db().query(access+' SELECT * FROM sources WHERE kind=$2 AND id=$3',[premium,kind,match[2]]);if(!rows[0])throw new AuthHttpError(404,'Writing tasks are unavailable or outside your access.');
 return json({tasks:writingTaskList(rows[0].document,writingSource(rows[0] as any).label)});
 }catch(e){return productError(e)}}
