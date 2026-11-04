import {createHash,timingSafeEqual} from 'node:crypto';
import {db} from '@/lib/auth/db';
import {getKey} from '@/lib/ai-lab/secrets';
import {signedAudio} from '@/lib/products/storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(req:Request){
 const secret=process.env.SPEAKING_WORKER_TOKEN||'',token=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 const digest=(v:string)=>createHash('sha256').update(v).digest();
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(secret.length<32||!timingSafeEqual(digest(secret),digest(token)))return json({error:'Forbidden'},403);
 if(Number(req.headers.get('content-length')||0)>1024)return json({error:'Too large'},413);
 let id;try{id=(await req.json()).id;}catch{}
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))return json({error:'Invalid job'},400);
 const rows=await db().query("SELECT input FROM public.speaking_evaluations WHERE id=$1 AND ((status='pending' AND tries<1) OR (status='running' AND tries=1 AND lease_until>now()))",[id]);
 if(!rows.length)return json({error:'Job unavailable'},404);
 const clips=(rows[0].input as {clips:{key:string}[]}).clips;
 const audioUrls=Object.fromEntries(await Promise.all(clips.map(async c=>[c.key,await signedAudio(c.key)])));
 return json({providerKey:await getKey('openrouter'),audioUrls});
}
