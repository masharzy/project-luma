import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { db } from '@/lib/auth/db';
import { requireSameOrigin,readBody,json,AuthHttpError,limit } from '@/lib/auth/http';
import { event,registerMock,joinMock } from '@/lib/exam/mock-events';
import { queueMockReminder } from '@/lib/exam/mock-reminders';
import { mockPhase } from '@/lib/exam/timeline';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const failure=(e:unknown)=>e instanceof AuthHttpError?json({error:e.message},e.status):json({error:'Unable to load this mock. Please retry.'},503);
export async function GET(_:Request,c:Context){try{const id=(await c.params).id,e=await event(id),s=await readSession();const r=s?(await db().query('SELECT registered_at,attempt_id FROM public.mock_registrations WHERE mock_id=$1 AND user_id=$2',[id,s.user.id]))[0]:null;
 return json({id:String(e.id),title:e.title,description:e.description,access:e.access,startsAt:e.starts_at,endsAt:e.ends_at,phase:mockPhase(new Date(String(e.starts_at)).getTime(),new Date(String(e.ends_at)).getTime(),Date.now()),serverNow:Date.now(),registered:Boolean(r),attemptId:r?.attempt_id??null,signedIn:Boolean(s),published:Boolean(e.results_published_at),modules:(e.snapshot as any[]).map(v=>({module:v.module,minutes:v.document.durationMinutes}))});}catch(e){return failure(e)}}
export async function POST(req:NextRequest,c:Context){try{requireSameOrigin(req);const s=await readSession();if(!s)throw new AuthHttpError(401,'Sign in with a verified account first.');const id=(await c.params).id,d=await readBody(req);await limit('mock-action:'+s.user.id,40,900);
 if(d.action==='register'){await registerMock(id,s.user.id);try{await queueMockReminder(id,s.user.id);}catch{console.warn('Mock reminder enqueue failed');}return json({ok:true});}
 if(d.action==='join')return json({attemptId:await joinMock(id,s.user.id)});
 throw new AuthHttpError(400,'Invalid action');}catch(e){return failure(e)}}
