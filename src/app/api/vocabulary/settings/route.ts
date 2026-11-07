import {NextRequest} from 'next/server';
import {requireSameOrigin,readBody,AuthHttpError} from '@/lib/auth/http';
import {readSession} from '@/lib/auth/session';
import {db} from '@/lib/auth/db';
export async function POST(request:NextRequest){
 const s=await readSession().catch(()=>null);
 if(!s?.user)return Response.json({error:'Sign in'},{status:401});
 let body:Record<string,unknown>;try{requireSameOrigin(request);body=await readBody(request);}catch(e){return Response.json({error:'Invalid request'},{status:e instanceof AuthHttpError?e.status:400});}
 const g=Number(body.dailyGoal);
 if(!Number.isInteger(g)||g<1||g>200)return Response.json({error:'Goal must be 1 to 200'},{status:400});
 await db().query('INSERT INTO public.vocab_settings(user_id,daily_goal) VALUES($1::uuid,$2) ON CONFLICT(user_id) DO UPDATE SET daily_goal=EXCLUDED.daily_goal,updated_at=now()',[s.user.id,g]);
 return Response.json({dailyGoal:g});
}
