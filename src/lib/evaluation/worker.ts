import 'server-only';
import { evaluationDiagnostic } from '@/lib/evaluation/diagnostic';
import { db } from '@/lib/auth/db';
import { assessWriting } from './provider';
import { failEvaluation } from './store';
export async function processWritingEvaluation(id:string){
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid evaluation job');
 const rows=await db().query(`UPDATE public.writing_evaluations SET status='running',tries=tries+1,lease_until=now()+interval '180 seconds',updated_at=now() WHERE id=$1::uuid AND tries<3 AND (status='pending' OR (status='running' AND lease_until<now())) RETURNING input,tries`,[id]);
 if(!rows[0]){
  const state=(await db().query('SELECT status,tries,lease_until FROM public.writing_evaluations WHERE id=$1::uuid',[id]))[0];
  if(state?.status==='running'&&state.lease_until&&new Date(String(state.lease_until)).getTime()>Date.now())throw Error('Evaluation lease active');
  if(state&&['pending','running'].includes(String(state.status)))await failEvaluation(id);
  return;
 }
 try{
  const evaluated=await assessWriting(rows[0].input);
  await db().query("UPDATE public.writing_evaluations SET status='completed',result=$2::jsonb,usage=$3::jsonb,lease_until=NULL,error_code=NULL,updated_at=now() WHERE id=$1::uuid AND status='running' AND tries=$4",[id,JSON.stringify(evaluated.result),JSON.stringify(evaluated.usage),rows[0].tries]);
 }catch(error){
  console.warn('Evaluation provider request failed',evaluationDiagnostic(error));
  if(Number(rows[0].tries)>=3){await failEvaluation(id);return;}
  await db().query("UPDATE public.writing_evaluations SET status='pending',lease_until=NULL,updated_at=now() WHERE id=$1::uuid AND status='running' AND tries=$2",[id,rows[0].tries]);
  throw Error('Writing evaluation will retry');
 }
}
