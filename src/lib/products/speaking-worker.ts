import 'server-only';
import { evaluationDiagnostic } from '@/lib/evaluation/diagnostic';
import { db } from '@/lib/auth/db';
import { assessSpeaking } from './speaking-provider';

/** A failed Speaking assessment always refunds the reserved evaluation allowance. */
export async function failSpeaking(id:string,code='EVALUATION_FAILED'){
 await db().query(`WITH failed AS (
  UPDATE public.speaking_evaluations SET status='failed',lease_until=NULL,error_code=$2,updated_at=now()
  WHERE id=$1 AND status IN ('pending','running')
  RETURNING user_id,product,period
 ) UPDATE public.evaluation_usage u SET count=greatest(0,u.count-1)
 FROM failed f WHERE u.user_id=f.user_id AND u.product=f.product AND u.period=f.period`,[id,code]);
}

export async function processSpeaking(id:string){
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid job');
 // Never make a second paid OpenRouter request automatically for the same attempt.
 const row=(await db().query("UPDATE public.speaking_evaluations SET status='running',tries=tries+1,lease_until=now()+interval '360 seconds',updated_at=now() WHERE id=$1 AND tries<1 AND status='pending' RETURNING input,tries",[id]))[0];
 if(!row){
  const state=(await db().query('SELECT status,tries,lease_until FROM public.speaking_evaluations WHERE id=$1',[id]))[0];
  if(state?.status==='running'&&new Date(String(state.lease_until)).getTime()>Date.now())return;
  if(state&&['pending','running'].includes(state.status))await failSpeaking(id);
  return;
 }
 try{
  const {result,usage,model}=await assessSpeaking(row.input);
  await db().query("UPDATE public.speaking_evaluations SET status='completed',result=$2::jsonb,usage=$3::jsonb,model=$4,lease_until=NULL,updated_at=now() WHERE id=$1 AND status='running' AND tries=$5",[id,JSON.stringify(result),JSON.stringify(usage),model,row.tries]);
 }catch(error){
  console.warn('Speaking evaluation failed',evaluationDiagnostic(error));
  // Keep billed provider response, even if JSON parsing fails. No retry, no second charge.
  const report=(error as {providerReport?:unknown})?.providerReport;
  if(report){
   try{await db().query("UPDATE public.speaking_evaluations SET usage=$2::jsonb,model='xiaomi/mimo-v2.6-flash',updated_at=now() WHERE id=$1 AND status='running'",[id,JSON.stringify({rawFailure:report})]);}
   catch{console.warn('Unable to save failed Speaking raw response');}
  }
  const code=(report as {failureCode?:string}|undefined)?.failureCode==='INCOMPLETE_ANSWER_COVERAGE'?'INCOMPLETE_ANSWER_COVERAGE':'EVALUATION_FAILED';
  await failSpeaking(id,code);
 }
}
