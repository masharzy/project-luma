import { NextRequest } from 'next/server';
import { readAccountSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { requireSameOrigin, AuthHttpError, limit, json } from '@/lib/auth/http';
import { db } from '@/lib/auth/db';
import { getKey } from '@/lib/ai-lab/secrets';
import { getPrivate } from '@/lib/products/storage';
import { speakingModel } from '@/lib/evaluation/provider';
import { assessSpeaking } from '@/lib/products/speaking-provider';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(req:NextRequest){
 let key='';
 try{
  requireSameOrigin(req);
  const session=await readAccountSession();
  if(!session||!hasAdminRole(session.user))throw new AuthHttpError(403,'Forbidden');
  await limit('speaking-diagnostic:'+session.user.id,12,3600);
  const form=await req.formData(),id=String(form.get('attemptId')||''),mode=String(form.get('mode')||'');
  if(!/^[a-f0-9-]{36}$/i.test(id)||!['plain','json','full'].includes(mode))throw new AuthHttpError(400,'Invalid diagnostic');
  const job=(await db().query('SELECT id,input,status FROM public.speaking_evaluations WHERE attempt_id=$1::uuid AND user_id=$2::uuid',[id,session.user.id]))[0];
  if(!job)throw new AuthHttpError(404,'Your saved evaluation was not found');
  key=await getKey('openrouter');
  const started=Date.now();
  if(mode==='full'){
   const result=await assessSpeaking(job.input);
   return json({mode,elapsedMs:Date.now()-started,...result});
  }
  const clip=job.input.clips[0],bytes=await getPrivate(clip.key);
  const body={model:speakingModel,max_tokens:500,reasoning:{enabled:false},provider:{allow_fallbacks:false,require_parameters:true},...(mode==='json'?{response_format:{type:'json_object'}}:{}),messages:[{role:'user',content:[{type:'text',text:mode==='json'?'Transcribe the attached audio. Return JSON with a single transcript field.':'Transcribe the attached audio. Return only the words you hear.'},{type:'input_audio',input_audio:{format:'wav',data:Buffer.from(bytes).toString('base64')}}]}]};
  const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
  const text=await response.text();
  return json({mode,httpStatus:response.status,elapsedMs:Date.now()-started,audioBytes:bytes.length,response:sanitize(text,key)});
 }catch(error){
  if(error instanceof AuthHttpError)return json({error:error.message},error.status);
  const e=error as {statusCode?:number;responseBody?:string;message?:string};
  return json({httpStatus:e.statusCode||null,error:sanitize(e.responseBody||e.message||'Diagnostic failed',key)},502);
 }
}
function sanitize(value:string,key:string){return (key?value.replaceAll(key,'[credential removed]'):value).replace(/data:[^\s"']+;base64,[A-Za-z0-9+/=]+/g,'[audio removed]').replace(/[A-Za-z0-9+/=]{100,}/g,'[binary removed]').slice(0,24000);}
