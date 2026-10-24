import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/auth/db';
import { AuthHttpError } from '@/lib/auth/http';
import { readAttempt } from '@/lib/exam/attempts';
import { writingInput } from './input';
import { writingModel } from './provider';
export const products=['cambridge_writing','practice_writing','writing_product','speaking_product'] as const;
export async function evaluationForAttempt(attemptId:string,userId:string){
 const rows=await db().query('SELECT id,status,result,model,error_code,created_at,updated_at FROM public.writing_evaluations WHERE attempt_id=$1::uuid AND user_id=$2::uuid',[attemptId,userId]);return rows[0]??null;
}
export async function createWritingEvaluation(attemptId:string,userId:string){
 const attempt=await readAttempt(attemptId);
 if(attempt.user_id!==userId)throw new AuthHttpError(403,'Sign in before starting a Writing attempt to receive AI feedback.');
 const existing=await evaluationForAttempt(attemptId,userId);if(existing)return existing;
 const snapshot=attempt.snapshot as {module:string;document:any}[];
 const index=snapshot.findIndex(s=>s.module==='writing');
 if(index<0||Number(attempt.current_index)<=index)throw new AuthHttpError(409,'Submit your Writing answers first.');
 const input=writingInput(snapshot[index].document,attempt.answers[String(index)]||{});
 if(!input.tasks.some(t=>t.answer.trim()))throw new AuthHttpError(400,'Write an answer before requesting evaluation.');
 const product=attempt.kind==='cambridge'?'cambridge_writing':'practice_writing';
 const grant=(await db().query('SELECT monthly_limit FROM public.evaluation_grants WHERE user_id=$1::uuid AND product=$2 AND expires_at>now()',[userId,product]))[0];
 if(!grant)throw new AuthHttpError(403,'AI feedback is not included in your current access. Your Writing answers are still available.','EVALUATION_ACCESS_REQUIRED');
 try {
 // Reserve the source-specific allowance and insert its job in a single atomic statement.
 // A duplicate attempt or concurrent active job rolls back the reservation as well.
 const rows=await db().query(`WITH allowance AS (
 SELECT monthly_limit FROM public.evaluation_grants WHERE user_id=$1::uuid AND product=$2 AND expires_at>now()
 ), reserved AS (
 INSERT INTO public.evaluation_usage(user_id,product,period,count)
 SELECT $1::uuid,$2,date_trunc('month',now() AT TIME ZONE 'UTC')::date,1 FROM allowance WHERE monthly_limit IS NULL OR monthly_limit>0
 ON CONFLICT(user_id,product,period) DO UPDATE SET count=evaluation_usage.count+1
 WHERE (SELECT monthly_limit FROM allowance) IS NULL OR evaluation_usage.count<(SELECT monthly_limit FROM allowance)
 RETURNING period
 ) INSERT INTO public.writing_evaluations(id,attempt_id,user_id,product,period,input,model)
 SELECT $3::uuid,$4::uuid,$1::uuid,$2,period,$5::jsonb,$6 FROM reserved RETURNING id,status,result,model,error_code,created_at,updated_at`,[userId,product,randomUUID(),attemptId,JSON.stringify(input),writingModel]);
 if(!rows[0])throw new AuthHttpError(403,'Your monthly AI feedback allowance is used up. You can continue practising without evaluation.','EVALUATION_LIMIT');
 return rows[0];
 }catch(e){if((e as {code?:string}).code==='23505'){const duplicate=await evaluationForAttempt(attemptId,userId);if(duplicate)return duplicate;throw new AuthHttpError(409,'Another evaluation is already in progress. Please wait.');}throw e;}
}
export async function failEvaluation(id:string){
 // Failure and refund are atomic and happen once. Domain and reservation month stay unchanged.
 await db().query(`WITH failed AS (UPDATE public.writing_evaluations SET status='failed',error_code='EVALUATION_FAILED',lease_until=NULL,updated_at=now() WHERE id=$1::uuid AND status IN ('pending','running') RETURNING user_id,product,period) UPDATE public.evaluation_usage u SET count=greatest(0,u.count-1) FROM failed f WHERE u.user_id=f.user_id AND u.product=f.product AND u.period=f.period`,[id]);
}
