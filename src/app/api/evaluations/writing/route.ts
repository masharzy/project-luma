import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { requireSameOrigin,readBody,json,AuthHttpError,limitMany,networkKey } from '@/lib/auth/http';
import { readAttempt } from '@/lib/exam/attempts';
import { createWritingEvaluation,evaluationForAttempt } from '@/lib/evaluation/store';
import { evaluationConfigured } from '@/lib/evaluation/provider';
import { enqueueWriting } from '@/lib/evaluation/queue';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function failure(e:unknown){return e instanceof AuthHttpError?json({error:e.message,code:e.code},e.status):json({error:'Evaluation is temporarily unavailable. Your answers remain saved.'},503);}
export async function POST(req:NextRequest){try{
 requireSameOrigin(req);
 const session=await readSession();if(!session)throw new AuthHttpError(401,'Sign in with a verified account for AI feedback.');
 const body=await readBody(req);if(typeof body.attemptId!=='string'||!/^[a-f0-9-]{36}$/.test(body.attemptId))throw new AuthHttpError(400,'Invalid attempt');
 if(!await evaluationConfigured())throw new AuthHttpError(503,'AI feedback is not enabled yet. Your answers remain saved.');
 await limitMany([{key:'writing-eval:'+session.user.id,max:12,seconds:3600},{key:'writing-eval-net:'+networkKey(req),max:60,seconds:3600}]);
 const job=await createWritingEvaluation(body.attemptId,session.user.id);
 if(job.status==='pending')await enqueueWriting(String(job.id));
 return json({evaluation:job},job.status==='completed'?200:202);
 }catch(e){return failure(e)}}
export async function GET(req:NextRequest){try{
 const session=await readSession();if(!session)throw new AuthHttpError(401,'Sign in to view this evaluation.');
 const id=req.nextUrl.searchParams.get('attemptId')||'';if(!/^[a-f0-9-]{36}$/.test(id))throw new AuthHttpError(400,'Invalid attempt');
 const attempt=await readAttempt(id);if(attempt.kind==='mock')throw new AuthHttpError(409,'View Writing feedback through your published mock result.');
 const existing=await evaluationForAttempt(id,session.user.id);if(existing)return json({evaluation:existing});
 if(attempt.user_id!==session.user.id)throw new AuthHttpError(404,'Evaluation unavailable');
 return json({evaluation:await evaluationForAttempt(id,session.user.id)});
 }catch(e){return failure(e)}}
