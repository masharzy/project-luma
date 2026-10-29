import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { json,AuthHttpError,requireSameOrigin,readBody,audit } from '@/lib/auth/http';
import { prepareMock,mockAdminResults,markMockWriting,publishMock } from '@/lib/exam/mock-events';
import { enqueueMockEvaluation } from '@/lib/exam/mock-evaluation';
import { db } from '@/lib/auth/db';
import { signedAudio } from '@/lib/products/storage';
import { mockSources,copyMockSource } from '@/lib/exam/mock-sources';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
async function admin(){const s=await readSession();if(!s||!hasAdminRole(s.user))throw new AuthHttpError(403,'Forbidden');return s.user;}
const failure=(e:unknown)=>e instanceof AuthHttpError?json({error:e.message},e.status):json({error:'Unable to update this mock.'},503);
export async function GET(req:Request,c:Context){try{await admin();const query=new URL(req.url).searchParams;if(query.get('view')==='recordings'){const attemptId=query.get('attemptId');if(!attemptId||!/^[a-f0-9-]{36}$/.test(attemptId))throw new AuthHttpError(400,'Invalid attempt');const clips=await db().query("SELECT r.step,r.object_key FROM public.speaking_recordings r JOIN public.exam_attempts a ON a.id=r.attempt_id WHERE a.id=$1::uuid AND a.parent_id=$2 AND a.kind='mock' ORDER BY r.step",[attemptId,(await c.params).id]);return json({clips:await Promise.all(clips.map(async r=>({step:r.step,url:await signedAudio(String(r.object_key))})))});}if(query.get('view')==='sources')return json({sources:await mockSources(),speakingSets:await db().query('SELECT id::text,title,minutes FROM public.speaking_sets WHERE published=true AND document IS NOT NULL ORDER BY title')});return json(await mockAdminResults((await c.params).id));}catch(e){return failure(e)}}
export async function POST(req:NextRequest,c:Context){try{const u=await admin();requireSameOrigin(req);const id=(await c.params).id;if(!/^\d{1,16}$/.test(id))throw new AuthHttpError(400,'Invalid mock');const d=await readBody(req);
 if(d.action==='prepare')await prepareMock(id,u.id,typeof d.speakingSetId==='string'?d.speakingSetId:undefined);
 else if(d.action==='copy')await copyMockSource(id,d.sourceKind,d.sourceId,d.modules,u.id);
 else if(d.action==='finishSpeaking'){
 if(typeof d.attemptId!=='string'||!/^[a-f0-9-]{36}$/.test(d.attemptId))throw new AuthHttpError(400,'Invalid attempt');
 const rows=await db().query(`WITH event_lock AS(SELECT id FROM public.mock_events WHERE id=$1 AND ends_at<=now() AND results_published_at IS NULL FOR UPDATE) UPDATE public.exam_attempts a SET current_index=current_index+1,deadline=NULL,locked_index=NULL,results=results||'[{"module":"speaking","correct":null,"total":null,"scorePercent":null,"bandScore":null,"status":"unmarked","items":[]}]'::jsonb FROM event_lock e WHERE a.id=$2::uuid AND a.parent_id=e.id AND a.kind='mock' AND a.snapshot->a.current_index->>'module'='speaking' RETURNING a.id`,[id,d.attemptId]);
 if(!rows.length)throw new AuthHttpError(409,'Speaking is not open or has already been submitted.');await enqueueMockEvaluation(d.attemptId);
 }
 else if(d.action==='publish')await publishMock(id);
 else if(d.action==='evaluate'){
 if(typeof d.attemptId!=='string'||!/^[a-f0-9-]{36}$/.test(d.attemptId)||(d.module!==undefined&&!['writing','speaking'].includes(String(d.module))))throw new AuthHttpError(400,'Invalid attempt');
 const module=d.module==='speaking'?'speaking':'writing';
 const paper=(await db().query("SELECT snapshot FROM public.exam_attempts WHERE id=$1::uuid AND parent_id=$2 AND kind='mock'",[d.attemptId,id]))[0];
 const index=paper?.snapshot.findIndex((s:any)=>s.module===module)??-1;if(index<0)throw new AuthHttpError(400,'Module is not included in this mock.');
 const rows=await db().query(`WITH event_lock AS (SELECT id FROM public.mock_events WHERE id=$1 AND ends_at<=now() AND results_published_at IS NULL FOR UPDATE) UPDATE public.exam_attempts a SET results=jsonb_set(a.results,'{${index}}',(a.results->${index})||'{"status":"unmarked","aiTries":0}'::jsonb) FROM event_lock e WHERE a.id=$2::uuid AND a.parent_id=e.id AND a.kind='mock' AND a.current_index>=${index+1} AND a.results->${index}->>'status' IN ('unmarked','ai_failed','ai_needs_review') RETURNING a.id`,[id,d.attemptId]);
 if(!rows.length)throw new AuthHttpError(409,'This paper cannot be queued for evaluation.');
 await enqueueMockEvaluation(d.attemptId,true);
 }
 else if(d.action==='grade'){if(typeof d.attemptId!=='string'||!/^[a-f0-9-]{36}$/.test(d.attemptId)||typeof d.band!=='number'||typeof d.feedback!=='string')throw new AuthHttpError(400,'Invalid grade');await markMockWriting(id,d.attemptId,d.band,d.feedback,d.module==='speaking'?'speaking':'writing');}
 else throw new AuthHttpError(400,'Invalid action');
 await audit(u.id,'mock:'+id+':'+String(d.action));return json({ok:true});}catch(e){return failure(e)}}
