import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { json,AuthHttpError,requireSameOrigin,readBody,audit } from '@/lib/auth/http';
import { prepareMock,mockAdminResults,markMockWriting,publishMock } from '@/lib/exam/mock-events';
import { enqueueMockEvaluation } from '@/lib/exam/mock-evaluation';
import { db } from '@/lib/auth/db';
import { mockSources,copyMockSource } from '@/lib/exam/mock-sources';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
async function admin(){const s=await readSession();if(!s||!hasAdminRole(s.user))throw new AuthHttpError(403,'Forbidden');return s.user;}
const failure=(e:unknown)=>e instanceof AuthHttpError?json({error:e.message},e.status):json({error:'Unable to update this mock.'},503);
export async function GET(req:Request,c:Context){try{await admin();if(new URL(req.url).searchParams.get('view')==='sources')return json({sources:await mockSources()});return json(await mockAdminResults((await c.params).id));}catch(e){return failure(e)}}
export async function POST(req:NextRequest,c:Context){try{const u=await admin();requireSameOrigin(req);const id=(await c.params).id;if(!/^\d{1,16}$/.test(id))throw new AuthHttpError(400,'Invalid mock');const d=await readBody(req);
 if(d.action==='prepare')await prepareMock(id,u.id);
 else if(d.action==='copy')await copyMockSource(id,d.sourceKind,d.sourceId,d.modules,u.id);
 else if(d.action==='publish')await publishMock(id);
 else if(d.action==='evaluate'){
 if(typeof d.attemptId!=='string'||!/^[a-f0-9-]{36}$/.test(d.attemptId))throw new AuthHttpError(400,'Invalid attempt');
 const rows=await db().query(`WITH event_lock AS (SELECT id FROM public.mock_events WHERE id=$1 AND ends_at<=now() AND results_published_at IS NULL FOR UPDATE) UPDATE public.exam_attempts a SET results=jsonb_set(a.results,'{2}',(a.results->2)||'{"status":"unmarked","aiTries":0}'::jsonb) FROM event_lock e WHERE a.id=$2::uuid AND a.parent_id=e.id AND a.kind='mock' AND a.current_index=3 AND a.results->2->>'status' IN ('unmarked','ai_failed','ai_needs_review') RETURNING a.id`,[id,d.attemptId]);
 if(!rows.length)throw new AuthHttpError(409,'This paper cannot be queued for evaluation.');
 await enqueueMockEvaluation(d.attemptId,true);
 }
 else if(d.action==='grade'){if(typeof d.attemptId!=='string'||!/^[a-f0-9-]{36}$/.test(d.attemptId)||typeof d.band!=='number'||typeof d.feedback!=='string')throw new AuthHttpError(400,'Invalid grade');await markMockWriting(id,d.attemptId,d.band,d.feedback);}
 else throw new AuthHttpError(400,'Invalid action');
 await audit(u.id,'mock:'+id+':'+String(d.action));return json({ok:true});}catch(e){return failure(e)}}
