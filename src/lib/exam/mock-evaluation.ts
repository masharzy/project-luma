import 'server-only';
import { randomUUID } from 'node:crypto';
import { send } from '@vercel/queue';
import { db } from '@/lib/auth/db';
import { assessWriting } from '@/lib/evaluation/provider';
import { writingInput } from '@/lib/evaluation/input';
import { evaluationDiagnostic } from '@/lib/evaluation/diagnostic';
import { assessSpeaking } from '@/lib/products/speaking-provider';
import { normalizeSpeakingSet } from '@/lib/speaking/schema';
import { speakingSteps } from '@/lib/speaking/flow';
import { settleAttempt } from './attempts';
import { moduleDeadline, mockEnd } from './timeline';
import { mockWritingBand, mockSpeakingBand } from './mock-bands';
import { SAVE_GRACE_MS } from './timeline';
export const mockEvaluationTopic='jumptonine-mock-evaluation';
export type MockJob='writing'|'speaking'|'settle';
export async function enqueueMockEvaluation(attemptId:string,retry=false,only?:'writing'|'speaking'){
 const row=(await db().query("SELECT a.snapshot,a.current_index,a.scheduled_start FROM public.exam_attempts a JOIN public.mock_events e ON e.id=a.parent_id WHERE a.id=$1::uuid AND a.kind='mock' AND e.results_published_at IS NULL",[attemptId]))[0];
 if(!row)return;
 const startsAt=new Date(String(row.scheduled_start)).getTime();
 // One job per AI-marked module. It runs when that module has ended on the shared clock (or at once if it is already settled),
 // on the server, whether or not the candidate still has the tab open.
 await Promise.all((row.snapshot as any[]).map((s,i)=>({s,i})).filter(({s})=>(s.module==='writing'||s.module==='speaking')&&(!only||s.module===only)).map(({s,i})=>{
  const settled=Number(row.current_index)>i;
  const delaySeconds=settled?0:Math.max(0,Math.ceil((moduleDeadline(row.snapshot,startsAt,i)+SAVE_GRACE_MS+1000-Date.now())/1000));
  return send(mockEvaluationTopic,{attemptId,module:s.module},{idempotencyKey:'mock-'+s.module+(settled?'-done':'')+':'+attemptId+(retry?':'+randomUUID():''),delaySeconds,retentionSeconds:86400});
 }));
 // One more job at the end of the whole mock settles every module on the server (Listening/Reading marks included),
 // even when the candidate closed the browser and nobody opens the attempt again.
 if(!only&&Number(row.current_index)<(row.snapshot as any[]).length)
  await send(mockEvaluationTopic,{attemptId,module:'settle'},{idempotencyKey:'mock-settle:'+attemptId,delaySeconds:Math.max(0,Math.ceil((mockEnd(row.snapshot,startsAt)+SAVE_GRACE_MS+1000-Date.now())/1000)),retentionSeconds:86400});
}
/** Queueing must never block Join or Submit: the attempt GET re-queues later (stable keys keep it idempotent). */
export async function enqueueMockEvaluationSafely(attemptId:string){
 try{await enqueueMockEvaluation(attemptId);}catch(error){console.warn('Mock evaluation could not be queued yet',evaluationDiagnostic(error));}
}
// This worker needs no browser session and runs even if the candidate has closed the tab.
export async function processMockEvaluation(attemptId:string,module:MockJob='writing'){
 if(!/^[a-f0-9-]{36}$/.test(attemptId))throw Error('Invalid mock attempt');
 const row=(await db().query("SELECT a.*,e.ends_at,e.results_published_at FROM public.exam_attempts a JOIN public.mock_events e ON e.id=a.parent_id WHERE a.id=$1::uuid AND a.kind='mock'",[attemptId]))[0];
 if(!row||row.results_published_at)return;
 const settled=await settleAttempt(row);
 if(module==='settle'){if(Number(settled.current_index)<(settled.snapshot as any[]).length)throw Error('Mock has not finished yet; retry');return;}
 const index=settled.snapshot.findIndex((s:any)=>s.module===module);if(index<0)return;
 if(Number(settled.current_index)<=index)throw Error('Module has not finished yet; retry');
 const writing=settled.results.find((r:any)=>r.module===module);
 if(!writing||['reviewed','ai_reviewed','ai_needs_review','ai_failed'].includes(writing.status))return;
 if(writing.status==='ai_running'&&new Date(writing.aiLeaseUntil).getTime()>Date.now())throw Error('Mock evaluation lease active');
 const tries=Number(writing.aiTries||0)+1;
 const claim=await db().query(`WITH event_lock AS (SELECT id FROM public.mock_events WHERE id=$2 AND results_published_at IS NULL FOR UPDATE)
 UPDATE public.exam_attempts a SET results=jsonb_set(a.results,'{${index}}',(a.results->${index})||jsonb_build_object('status','ai_running','aiTries',$3::integer,'aiLeaseUntil',now()+interval '${module==='speaking'?360:180} seconds'))
 FROM event_lock e WHERE a.id=$1::uuid AND a.parent_id=e.id AND a.current_index>=${index+1} AND (a.results->${index}->>'status'='unmarked' OR (a.results->${index}->>'status'='ai_running' AND (a.results->${index}->>'aiLeaseUntil')::timestamptz<now())) RETURNING a.id`,[attemptId,row.parent_id,tries]);
 if(!claim.length)throw Error('Mock evaluation changed; retry');
 let patch:Record<string,unknown>;
 try{
  if(tries>3)throw Error('Evaluation retry limit reached');
  if(module==='speaking'){
   const set=normalizeSpeakingSet(settled.snapshot[index].document.speakingSet),steps=speakingSteps(set);
   const clips=(await db().query('SELECT step,object_key,seconds FROM public.speaking_recordings WHERE attempt_id=$1 ORDER BY step',[attemptId])).filter((c:any)=>steps[Number(c.step)]?.t==='ask');
   const expectedByPart:Record<number,number>={};for(const s of steps)if(s.t==='ask')expectedByPart[Number(s.p)]=(expectedByPart[Number(s.p)]||0)+1;
   if(!clips.length)patch={status:'ai_reviewed',bandScore:0,feedback:'No Speaking recordings were submitted. Every question scores 0.'};
   else {const input={sourceParts:set.sourceParts||null,cueCard:set.cueCard,expected:steps.filter(s=>s.t==='ask').length,clips:clips.map((c:any)=>({step:Number(c.step),part:Number(steps[Number(c.step)].p),question:steps[Number(c.step)].q||'',seconds:Number(c.seconds),key:String(c.object_key)}))};const assessment=await assessSpeaking(input);
    // Unanswered questions score 0: the AI band of the answered part is scaled by how much of the test was answered.
    const mark=mockSpeakingBand(assessment.result,expectedByPart,input.clips);
    patch={status:mark.band===null?'ai_needs_review':'ai_reviewed',bandScore:mark.band,aiBand:assessment.result.estimatedBand,feedback:[mark.note,assessment.result.summary].filter(Boolean).join(' '),speakingAssessment:assessment.result,aiModel:assessment.model,aiUsage:assessment.usage};}
  }else{
  const input=writingInput(settled.snapshot[index].document,settled.answers[String(index)]||{});
  if(!input.tasks.some(t=>t.answer.trim()))patch={status:'ai_reviewed',bandScore:0,feedback:'No Writing response was submitted. Both tasks score 0.'};
  // Only answered tasks go to the AI; a blank task scores 0 (Task 2 still counts twice).
  else {const assessment=await assessWriting({tasks:input.tasks.filter(t=>t.answer.trim())});const mark=mockWritingBand(input.tasks,assessment.result.tasks);patch={status:mark.band===null?'ai_needs_review':'ai_reviewed',bandScore:mark.band,aiBand:assessment.result.estimatedBand,feedback:[mark.note,assessment.result.summary].filter(Boolean).join(' '),aiAssessment:assessment.result,aiModel:assessment.model,aiUsage:assessment.usage};}
  }
 }catch(error){
  console.warn('Mock '+module+' evaluation failed',evaluationDiagnostic(error));
  patch={status:tries>=3||(error as {retryable?:boolean})?.retryable===false?'ai_failed':'unmarked',feedback:'AI evaluation could not finish. An administrator can retry or review this paper.',aiError:String(JSON.stringify(evaluationDiagnostic(error))).slice(0,600)};
 }
 await db().query(`WITH event_lock AS (SELECT id FROM public.mock_events WHERE id=$2 AND results_published_at IS NULL FOR UPDATE)
 UPDATE public.exam_attempts a SET results=jsonb_set(a.results,'{${index}}',(a.results->${index})||$3::jsonb)
 FROM event_lock e WHERE a.id=$1::uuid AND a.parent_id=e.id AND a.results->${index}->>'status'='ai_running' AND (a.results->${index}->>'aiTries')::integer=$4`,[attemptId,row.parent_id,JSON.stringify(patch),tries]);
 if(patch.status==='unmarked')throw Error('Mock '+module+' evaluation will retry');
}
