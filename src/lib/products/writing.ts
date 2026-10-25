import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db } from '@/lib/auth/db';
import { AuthHttpError } from '@/lib/auth/http';
import { productAccess } from './access';
import { writingModel } from '@/lib/evaluation/provider';
const image=z.string().max(1500000).nullable().refine(v=>v===null||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)||(()=>{try{const u=new URL(v);return v.length<=2000&&u.protocol==='https:'&&!u.username&&!u.password}catch{return false}})());
export const productWritingSchema=z.object({tasks:z.array(z.object({task:z.number().int().min(1).max(2),question:z.string().trim().min(10).max(16000),answer:z.string().max(20000),image})).min(1).max(2)}).refine(v=>new Set(v.tasks.map(t=>t.task)).size===v.tasks.length,'Duplicate task').refine(v=>v.tasks.some(t=>t.answer.trim()),'Write an answer first');
export async function submitWritingProduct(userId:string,id:string,value:unknown){
 const input=productWritingSchema.parse(value);
 const existing=(await db().query('SELECT id,status,result,model FROM public.writing_evaluations WHERE submission_id=$1::uuid AND user_id=$2',[id,userId]))[0];if(existing)return existing;
 await productAccess(userId,'writing_product');
 try{
 const rows=await db().query(`WITH allowance AS (SELECT monthly_limit FROM public.evaluation_allowance($1::uuid,'writing_product')),
 reserved AS (INSERT INTO public.evaluation_usage(user_id,product,period,count) SELECT $1,'writing_product',date_trunc('month',now() AT TIME ZONE 'UTC')::date,1 FROM allowance WHERE monthly_limit IS NULL OR monthly_limit>coalesce((SELECT sum(count) FROM public.evaluation_usage WHERE user_id=$1 AND product='cambridge_writing' AND period=date_trunc('month',now() AT TIME ZONE 'UTC')::date),0) ON CONFLICT(user_id,product,period) DO UPDATE SET count=evaluation_usage.count+1 WHERE (SELECT monthly_limit FROM allowance) IS NULL OR evaluation_usage.count+coalesce((SELECT sum(count) FROM public.evaluation_usage WHERE user_id=$1 AND product='cambridge_writing' AND period=date_trunc('month',now() AT TIME ZONE 'UTC')::date),0)<(SELECT monthly_limit FROM allowance) RETURNING period),
 submission AS (INSERT INTO public.writing_submissions(id,user_id,input) SELECT $2::uuid,$1,$3::jsonb FROM reserved RETURNING id)
 INSERT INTO public.writing_evaluations(id,submission_id,user_id,product,period,input,model) SELECT $4::uuid,submission.id,$1,'writing_product',reserved.period,$3::jsonb,$5 FROM submission,reserved RETURNING id,status,result,model`,[userId,id,JSON.stringify(input),randomUUID(),writingModel]);
 if(!rows[0])throw new AuthHttpError(403,'Your monthly Writing Evaluation allowance is used up.','EVALUATION_LIMIT');return rows[0];
 }catch(e){if((e as {code?:string}).code==='23505'){const duplicate=(await db().query('SELECT id,status,result,model FROM public.writing_evaluations WHERE submission_id=$1::uuid AND user_id=$2',[id,userId]))[0];if(duplicate)return duplicate;throw new AuthHttpError(409,'A Writing evaluation is already in progress.');}throw e;}
}
