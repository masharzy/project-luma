import {NextRequest} from 'next/server';
import {requireSameOrigin,readBody,AuthHttpError} from '@/lib/auth/http';
import {readSession} from '@/lib/auth/session';
import {db} from '@/lib/auth/db';
// Signed-in learners keep their flashcard progress on the server so it follows them across devices.
export async function GET(){
 const s=await readSession().catch(()=>null);
 if(!s?.user)return Response.json({items:[]});
 const rows=await db().query('SELECT word_id,box,seen,due_at,updated_at FROM public.vocab_progress WHERE user_id=$1::uuid',[s.user.id]);
 return Response.json({items:rows.map(r=>({id:Number(r.word_id),b:Number(r.box),s:Number(r.seen),d:new Date(String(r.due_at)).getTime(),u:new Date(String(r.updated_at)).getTime()}))},{headers:{'Cache-Control':'private, no-store'}});
}
export async function POST(request:NextRequest){
 const s=await readSession().catch(()=>null);
 if(!s?.user)return Response.json({error:'Sign in'},{status:401});
 let body:Record<string,unknown>;try{requireSameOrigin(request);body=await readBody(request);}catch(e){return Response.json({error:'Invalid request'},{status:e instanceof AuthHttpError?e.status:400});}
 const raw=Array.isArray(body.items)?body.items.slice(0,200):[];
 const items=raw.filter((x:any)=>x&&Number.isInteger(x.id)&&x.id>0&&Number.isInteger(x.b)&&x.b>=0&&x.b<=5&&Number.isFinite(x.d)).map((x:any)=>({id:x.id,b:x.b,s:Math.min(100000,Math.max(0,Math.floor(Number(x.s)||0))),d:new Date(Math.min(x.d,Date.now()+400*864e5)).toISOString()}));
 if(!items.length)return Response.json({saved:0});
 await db().query(`INSERT INTO public.vocab_progress(user_id,word_id,box,seen,due_at,updated_at)
  SELECT $1::uuid,r.id,r.b,r.s,r.d,now() FROM jsonb_to_recordset($2::jsonb) AS r(id int,b smallint,s int,d timestamptz) WHERE EXISTS(SELECT 1 FROM public.vocab_words w WHERE w.id=r.id)
  ON CONFLICT(user_id,word_id) DO UPDATE SET box=EXCLUDED.box,seen=EXCLUDED.seen,due_at=EXCLUDED.due_at,updated_at=now()`,[s.user.id,JSON.stringify(items)]);
 return Response.json({saved:items.length});
}
