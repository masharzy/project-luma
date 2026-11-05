import 'server-only';
import { send } from '@vercel/queue';
import { db } from '@/lib/auth/db';
import { AuthHttpError } from '@/lib/auth/http';

export async function queueSpeakingEvaluation(job:{id:string;tries:number}){
 const key='speaking:'+job.id+(job.tries?':retry:'+job.tries:'');
 await send('luma-speaking-evaluation',{id:job.id},{idempotencyKey:key,retentionSeconds:86400});
}

export async function retrySpeakingEvaluation(id:string,userId:string|null){
 try{
  // Update the same row before reserving quota so competing retries cannot double-charge.
  // A new month uses its own allowance. A denied reservation rolls the job change back.
  const [job]=await db().query(`WITH target AS (
   SELECT s.id,s.user_id,s.status,s.tries FROM public.speaking_evaluations s
   WHERE s.id=$1 AND ($2::uuid IS NULL OR s.user_id=$2)
   FOR UPDATE
  ), allowance AS (
   SELECT t.user_id,a.monthly_limit FROM target t
   CROSS JOIN LATERAL public.evaluation_allowance(t.user_id,'speaking_product') a WHERE t.status='failed'
  ), reserved AS (
   INSERT INTO public.evaluation_usage(user_id,product,period,count)
   SELECT user_id,'speaking_product',date_trunc('month',now() AT TIME ZONE 'UTC')::date,1
   FROM allowance WHERE monthly_limit IS NULL OR monthly_limit>0
   ON CONFLICT(user_id,product,period) DO UPDATE SET count=evaluation_usage.count+1
   WHERE (SELECT monthly_limit FROM allowance) IS NULL OR evaluation_usage.count<(SELECT monthly_limit FROM allowance)
   RETURNING period
  ), retried AS (
   UPDATE public.speaking_evaluations s SET status='pending',period=r.period,result=NULL,error_code=NULL,
    lease_until=NULL,updated_at=now(),usage=jsonb_build_object('failureHistory',
     COALESCE(s.usage->'failureHistory','[]'::jsonb)||jsonb_build_array(jsonb_build_object(
      'try',s.tries,'code',s.error_code,'at',s.updated_at,'model',s.model,'report',s.usage-'failureHistory')))
   FROM target t CROSS JOIN reserved r WHERE s.id=t.id AND t.status='failed'
   RETURNING s.id,s.status,s.tries,s.result
  ) SELECT * FROM retried UNION ALL SELECT id,status,tries,NULL::jsonb AS result FROM target
   WHERE status='pending' OR (status='failed' AND NOT EXISTS(SELECT 1 FROM retried))`,[id,userId]);
  if(!job)throw new AuthHttpError(409,'This evaluation is no longer waiting for a retry.');
  if(job.status==='failed')throw new AuthHttpError(403,'The monthly Speaking Evaluation allowance is used up.','EVALUATION_LIMIT');
  await queueSpeakingEvaluation(job as {id:string;tries:number});
  return job;
 }catch(error){
  if((error as {code?:string}).code==='23505')throw new AuthHttpError(409,'This account already has a Speaking evaluation in progress.');
  throw error;
 }
}
