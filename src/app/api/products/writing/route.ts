import { NextRequest } from 'next/server';
import { db } from '@/lib/auth/db';
import { requireSameOrigin,readBody,json,AuthHttpError,limitMany,networkKey } from '@/lib/auth/http';
import { productUser,productError,uuid } from '@/lib/products/access';
import { submitWritingProduct } from '@/lib/products/writing';
import { evaluationConfigured } from '@/lib/evaluation/provider';
import { enqueueWriting } from '@/lib/evaluation/queue';
export const runtime='nodejs';
export async function POST(req:NextRequest){try{requireSameOrigin(req);const u=await productUser();const d=await readBody(req,3300000);if(!uuid(d.submissionId))throw new AuthHttpError(400,'Invalid submission');if(!evaluationConfigured())throw new AuthHttpError(503,'AI evaluation is not enabled yet. Keep your draft and try later.');
 await limitMany([{key:'writing-product:'+u.id,max:12,seconds:3600},{key:'writing-product-net:'+networkKey(req),max:60,seconds:3600}]);
 const job=d.input?await submitWritingProduct(u.id,d.submissionId,d.input):(await db().query('SELECT id,status,result,model FROM public.writing_evaluations WHERE submission_id=$1 AND user_id=$2',[d.submissionId,u.id]))[0];
 if(!job)throw new AuthHttpError(404,'Submission unavailable');if(job.status==='pending')await enqueueWriting(String(job.id));return json({evaluation:job},202);
 }catch(e){if(e instanceof Error&&e.name==='ZodError')return json({error:'Check the task, image and answer before submitting.'},400);return productError(e)}}
export async function GET(req:NextRequest){try{const u=await productUser(),id=req.nextUrl.searchParams.get('submissionId');if(!uuid(id))throw new AuthHttpError(400,'Invalid submission');const job=(await db().query('SELECT id,status,result,model FROM public.writing_evaluations WHERE submission_id=$1 AND user_id=$2',[id,u.id]))[0];return json({evaluation:job||null});}catch(e){return productError(e)}}
