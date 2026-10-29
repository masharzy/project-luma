import { NextRequest } from 'next/server';
import { send } from '@vercel/queue';
import { db } from '@/lib/auth/db';
import { requireSameOrigin,readBody,json,AuthHttpError,limitMany,networkKey } from '@/lib/auth/http';
import { productUser,productError,uuid } from '@/lib/products/access';
import { createSpeakingEvaluation } from '@/lib/products/speaking';
import { evaluationConfigured } from '@/lib/evaluation/provider';
import { storageConfigured } from '@/lib/products/storage';
import { mockSpeakingContext } from '@/lib/exam/mock-speaking';
export async function POST(req:NextRequest){try{requireSameOrigin(req);const u=await productUser(),d=await readBody(req);if(!uuid(d.attemptId))throw new AuthHttpError(400,'Invalid attempt');if(await mockSpeakingContext(d.attemptId,u.id))throw new AuthHttpError(409,'Submit Speaking through your scheduled mock.');if(!await evaluationConfigured()||!storageConfigured())throw new AuthHttpError(503,'Speaking evaluation is not enabled yet. Your recordings remain available in this tab.');await limitMany([{key:'speaking-evaluate:'+u.id,max:12,seconds:3600},{key:'speaking-eval-net:'+networkKey(req),max:60,seconds:3600}]);const job=await createSpeakingEvaluation(d.attemptId,u.id);if(job.status==='pending')await send('luma-speaking-evaluation',{id:job.id},{idempotencyKey:'speaking:'+job.id,retentionSeconds:86400});return json({evaluation:job},202);}catch(e){return productError(e)}}
export async function GET(req:NextRequest){try{const u=await productUser(),id=req.nextUrl.searchParams.get('attemptId');if(!uuid(id))throw new AuthHttpError(400,'Invalid attempt');const mock=await mockSpeakingContext(id,u.id);if(mock){const a=(await db().query('SELECT results FROM public.exam_attempts WHERE id=$1',[id]))[0];const result=a?.results?.find((r:any)=>r.module==='speaking');return json({evaluation:mock.results_published_at?{status:'completed',result:result?.speakingAssessment??null}:null});}const job=(await db().query('SELECT id,status,result FROM public.speaking_evaluations WHERE attempt_id=$1 AND user_id=$2',[id,u.id]))[0];return json({evaluation:job||null});}catch(e){return productError(e)}}
