import 'server-only';
import { randomUUID } from 'node:crypto';
import { send } from '@vercel/queue';
import { db } from '@/lib/auth/db';
import { assessWriting } from '@/lib/evaluation/provider';
import { writingInput } from '@/lib/evaluation/input';
import { evaluationDiagnostic } from '@/lib/evaluation/diagnostic';
import { settleAttempt } from './attempts';
export const mockEvaluationTopic='jumptonine-mock-evaluation';
export async function enqueueMockEvaluation(attemptId:string,retry=false){
 const row=(await db().query("SELECT a.id,e.ends_at FROM public.exam_attempts a JOIN public.mock_events e ON e.id=a.parent_id WHERE a.id=$1::uuid AND a.kind='mock' AND e.results_published_at IS NULL",[attemptId]))[0];
 if(!row)return;
 await send(mockEvaluationTopic,{attemptId},{idempotencyKey:'mock-writing:'+attemptId+(retry?':'+randomUUID():''),delaySeconds:Math.max(0,Math.ceil((new Date(String(row.ends_at)).getTime()-Date.now())/1000)),retentionSeconds:86400});
}
// This worker needs no browser session and runs even if the candidate has closed the tab.
export async function processMockEvaluation(attemptId:string){
 if(!/^[a-f0-9-]{36}$/.test(attemptId))throw Error('Invalid mock attempt');
 const row=(await db().query("SELECT a.*,e.ends_at,e.results_published_at FROM public.exam_attempts a JOIN public.mock_events e ON e.id=a.parent_id WHERE a.id=$1::uuid AND a.kind='mock'",[attemptId]))[0];
 if(!row||row.results_published_at)return;
 if(new Date(String(row.ends_at)).getTime()>Date.now())throw Error('Mock has not ended');
 const settled=await settleAttempt(row);
 const writing=settled.results.find((r:any)=>r.module==='writing');
 if(!writing||['reviewed','ai_reviewed','ai_needs_review','ai_failed'].includes(writing.status))return;
 if(writing.status==='ai_running'&&new Date(writing.aiLeaseUntil).getTime()>Date.now())throw Error('Mock evaluation lease active');
 const tries=Number(writing.aiTries||0)+1;
 const claim=await db().query(`WITH event_lock AS (SELECT id FROM public.mock_events WHERE id=$2 AND results_published_at IS NULL FOR UPDATE)
 UPDATE public.exam_attempts a SET results=jsonb_set(a.results,'{2}',(a.results->2)||jsonb_build_object('status','ai_running','aiTries',$3::integer,'aiLeaseUntil',now()+interval '180 seconds'))
 FROM event_lock e WHERE a.id=$1::uuid AND a.parent_id=e.id AND a.current_index=3 AND (a.results->2->>'status'='unmarked' OR (a.results->2->>'status'='ai_running' AND (a.results->2->>'aiLeaseUntil')::timestamptz<now())) RETURNING a.id`,[attemptId,row.parent_id,tries]);
 if(!claim.length)throw Error('Mock evaluation changed; retry');
 let patch:Record<string,unknown>;
 try{
  if(tries>3)throw Error('Evaluation retry limit reached');
  const input=writingInput(settled.snapshot[2].document,settled.answers['2']||{});
  if(!input.tasks.some(t=>t.answer.trim()))patch={status:'ai_reviewed',bandScore:0,feedback:'No Writing response was submitted.'};
  else {const assessment=await assessWriting(input);patch={status:assessment.result.estimatedBand===null?'ai_needs_review':'ai_reviewed',bandScore:assessment.result.estimatedBand,feedback:assessment.result.summary,aiAssessment:assessment.result,aiModel:assessment.model,aiUsage:assessment.usage};}
 }catch(error){
  console.warn('Mock Writing evaluation failed',evaluationDiagnostic(error));
  patch={status:tries>=3?'ai_failed':'unmarked',feedback:'AI evaluation could not finish. An administrator can retry or review this paper.'};
 }
 await db().query(`WITH event_lock AS (SELECT id FROM public.mock_events WHERE id=$2 AND results_published_at IS NULL FOR UPDATE)
 UPDATE public.exam_attempts a SET results=jsonb_set(a.results,'{2}',(a.results->2)||$3::jsonb)
 FROM event_lock e WHERE a.id=$1::uuid AND a.parent_id=e.id AND a.results->2->>'status'='ai_running' AND (a.results->2->>'aiTries')::integer=$4`,[attemptId,row.parent_id,JSON.stringify(patch),tries]);
 if(patch.status==='unmarked')throw Error('Mock Writing evaluation will retry');
}
