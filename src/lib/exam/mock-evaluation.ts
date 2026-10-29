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
export const mockEvaluationTopic='jumptonine-mock-evaluation';
export async function enqueueMockEvaluation(attemptId:string,retry=false){
 const row=(await db().query("SELECT a.id,e.ends_at,jsonb_array_length(a.snapshot) AS module_count FROM public.exam_attempts a JOIN public.mock_events e ON e.id=a.parent_id WHERE a.id=$1::uuid AND a.kind='mock' AND e.results_published_at IS NULL",[attemptId]))[0];
 if(!row)return;
 await Promise.all((Number(row.module_count)===4?['writing','speaking']:['writing']).map(module=>send(mockEvaluationTopic,{attemptId,module},{idempotencyKey:'mock-'+module+':'+attemptId+(retry?':'+randomUUID():''),delaySeconds:Math.max(0,Math.ceil((new Date(String(row.ends_at)).getTime()-Date.now())/1000)),retentionSeconds:86400})));
}
// This worker needs no browser session and runs even if the candidate has closed the tab.
export async function processMockEvaluation(attemptId:string,module:'writing'|'speaking'='writing'){
 if(!/^[a-f0-9-]{36}$/.test(attemptId))throw Error('Invalid mock attempt');
 const row=(await db().query("SELECT a.*,e.ends_at,e.results_published_at FROM public.exam_attempts a JOIN public.mock_events e ON e.id=a.parent_id WHERE a.id=$1::uuid AND a.kind='mock'",[attemptId]))[0];
 if(!row||row.results_published_at)return;
 if(new Date(String(row.ends_at)).getTime()>Date.now())throw Error('Mock has not ended');
 const settled=await settleAttempt(row);
 const index=module==='writing'?2:3;
 const writing=settled.results.find((r:any)=>r.module===module);
 if(!writing||['reviewed','ai_reviewed','ai_needs_review','ai_failed'].includes(writing.status))return;
 if(writing.status==='ai_running'&&new Date(writing.aiLeaseUntil).getTime()>Date.now())throw Error('Mock evaluation lease active');
 const tries=Number(writing.aiTries||0)+1;
 const claim=await db().query(`WITH event_lock AS (SELECT id FROM public.mock_events WHERE id=$2 AND results_published_at IS NULL FOR UPDATE)
 UPDATE public.exam_attempts a SET results=jsonb_set(a.results,'{${index}}',(a.results->${index})||jsonb_build_object('status','ai_running','aiTries',$3::integer,'aiLeaseUntil',now()+interval '180 seconds'))
 FROM event_lock e WHERE a.id=$1::uuid AND a.parent_id=e.id AND a.current_index=jsonb_array_length(a.snapshot) AND (a.results->${index}->>'status'='unmarked' OR (a.results->${index}->>'status'='ai_running' AND (a.results->${index}->>'aiLeaseUntil')::timestamptz<now())) RETURNING a.id`,[attemptId,row.parent_id,tries]);
 if(!claim.length)throw Error('Mock evaluation changed; retry');
 let patch:Record<string,unknown>;
 try{
  if(tries>3)throw Error('Evaluation retry limit reached');
  if(module==='speaking'){
   const set=normalizeSpeakingSet(settled.snapshot[3].document.speakingSet),steps=speakingSteps(set);
   const clips=await db().query('SELECT step,object_key,seconds FROM public.speaking_recordings WHERE attempt_id=$1 ORDER BY step',[attemptId]);
   if(!clips.length)patch={status:'ai_reviewed',bandScore:0,feedback:'No Speaking recordings were submitted.'};
   else {const input={sourceParts:set.sourceParts||null,cueCard:set.cueCard,expected:steps.filter(s=>s.t==='ask').length,clips:clips.map(c=>({step:Number(c.step),part:steps[Number(c.step)].p,question:steps[Number(c.step)].q||'',seconds:Number(c.seconds),key:String(c.object_key)}))};const assessment=await assessSpeaking(input);patch={status:assessment.result.estimatedBand===null?'ai_needs_review':'ai_reviewed',bandScore:assessment.result.estimatedBand,feedback:assessment.result.summary,speakingAssessment:assessment.result,aiModel:assessment.model,aiUsage:assessment.usage};}
  }else{
  const input=writingInput(settled.snapshot[2].document,settled.answers['2']||{});
  if(!input.tasks.some(t=>t.answer.trim()))patch={status:'ai_reviewed',bandScore:0,feedback:'No Writing response was submitted.'};
  else {const assessment=await assessWriting(input);patch={status:assessment.result.estimatedBand===null?'ai_needs_review':'ai_reviewed',bandScore:assessment.result.estimatedBand,feedback:assessment.result.summary,aiAssessment:assessment.result,aiModel:assessment.model,aiUsage:assessment.usage};}
  }
 }catch(error){
  console.warn('Mock Writing evaluation failed',evaluationDiagnostic(error));
  patch={status:tries>=3?'ai_failed':'unmarked',feedback:'AI evaluation could not finish. An administrator can retry or review this paper.'};
 }
 await db().query(`WITH event_lock AS (SELECT id FROM public.mock_events WHERE id=$2 AND results_published_at IS NULL FOR UPDATE)
 UPDATE public.exam_attempts a SET results=jsonb_set(a.results,'{${index}}',(a.results->${index})||$3::jsonb)
 FROM event_lock e WHERE a.id=$1::uuid AND a.parent_id=e.id AND a.results->${index}->>'status'='ai_running' AND (a.results->${index}->>'aiTries')::integer=$4`,[attemptId,row.parent_id,JSON.stringify(patch),tries]);
 if(patch.status==='unmarked')throw Error('Mock Writing evaluation will retry');
}
