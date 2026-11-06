import 'server-only';
import { evaluationDiagnostic } from '@/lib/evaluation/diagnostic';
import { db } from '@/lib/auth/db';
import { assessSpeaking } from './speaking-provider';
import { speakingModel } from './speaking-model';

export async function failSpeaking(id:string,code:string,tries:number,report:unknown=null,expired=false){
 // Match the claimed generation. Record the response and refund in the same transition.
 await db().query(`WITH failed AS (
  UPDATE public.speaking_evaluations SET status='failed',result=NULL,lease_until=NULL,error_code=$2,
   usage=COALESCE(usage,'{}'::jsonb)||jsonb_build_object('rawFailure',$4::jsonb),updated_at=now()
  WHERE id=$1 AND status='running' AND tries=$3 AND (NOT $5::boolean OR lease_until<now())
  RETURNING user_id,product,period
 ) UPDATE public.evaluation_usage u SET count=greatest(0,u.count-1)
 FROM failed f WHERE u.user_id=f.user_id AND u.product=f.product AND u.period=f.period`,
 [id,code,tries,JSON.stringify(report),expired]);
}

export async function processSpeaking(id:string,options:Parameters<typeof assessSpeaking>[1]={}){
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid Speaking job');
 const row=(await db().query(`UPDATE public.speaking_evaluations SET status='running',tries=tries+1,
  lease_until=now()+interval '360 seconds',model=$2,updated_at=now()
  WHERE id=$1 AND status='pending' RETURNING input,tries`,[id,speakingModel]))[0];
 if(!row){
  const stale=(await db().query("SELECT tries FROM public.speaking_evaluations WHERE id=$1 AND status='running' AND lease_until<now()",[id]))[0];
  if(stale)await failSpeaking(id,'WORKER_INTERRUPTED',stale.tries,null,true);
  return;
 }
 try{
  const {result,usage,model}=await assessSpeaking(row.input,{...options,onProgress:async report=>{
   // Each part updates its own checkpoint. Keep paid output if the worker is interrupted.
   try{await db().query(`UPDATE public.speaking_evaluations
    SET usage=COALESCE(usage,'{}'::jsonb)||jsonb_build_object('checkpoints',
     COALESCE(usage->'checkpoints','{}'::jsonb)||jsonb_build_object($3::text,$4::jsonb)),updated_at=now()
    WHERE id=$1 AND status='running' AND tries=$2`,[id,row.tries,String(report.part),JSON.stringify(report)]);}
   catch{console.warn('Speaking checkpoint unavailable');}
  }});
  await db().query(`UPDATE public.speaking_evaluations SET status='completed',result=$2::jsonb,
   usage=(COALESCE(usage,'{}'::jsonb)-'checkpoints')||$3::jsonb,model=$5,error_code=NULL,lease_until=NULL,updated_at=now()
   WHERE id=$1 AND status='running' AND tries=$4`,[id,JSON.stringify(result),JSON.stringify(usage),row.tries,model]);
 }catch(error){
  const diagnostic=evaluationDiagnostic(error);
  console.warn('Speaking evaluation failed',diagnostic);
  const report=(error as {providerReport?:{failureCode:string}})?.providerReport;
  await failSpeaking(id,report?.failureCode??'EVALUATION_FAILED',row.tries,report??diagnostic);
 }
}
