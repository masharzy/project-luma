import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { publishedSpeakingSet } from '@/lib/speaking/store';
import { speakingSteps } from '@/lib/speaking/flow';
import { AuthHttpError,json,limit,networkKey } from '@/lib/auth/http';
export const runtime='nodejs';
export async function GET(req:NextRequest){try{
 if(req.headers.get('sec-fetch-site')==='cross-site')return json({error:'Forbidden'},403);
 const key=process.env.OPENAI_API_KEY;if(!key)return json({error:'Examiner audio is not configured.'},503);
 const mode=req.nextUrl.searchParams.get('mode');if(mode!=='practice'&&mode!=='cambridge')throw new AuthHttpError(400,'Invalid mode');
 const set=await publishedSpeakingSet(mode,req.nextUrl.searchParams.get('test')||'');
 const version=createHash('sha256').update(JSON.stringify(set)).digest('hex').slice(0,16);if(req.nextUrl.searchParams.get('v')!==version)throw new AuthHttpError(409,'Speaking questions changed. Reopen the test.');
 const index=Number(req.nextUrl.searchParams.get('step'));if(!Number.isInteger(index)||index<0)throw new AuthHttpError(400,'Invalid question');const step=speakingSteps(set)[index];if(!step?.say)throw new AuthHttpError(400,'No audio for this step');
 await limit('speaking-voice:'+networkKey(req),150,3600);
 const r=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',voice:req.nextUrl.searchParams.get('examiner')==='male'?'onyx':'shimmer',input:step.say,response_format:'mp3',instructions:'Read the supplied IELTS examiner line in clear natural British English. Do not add anything.'}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)return json({error:'Examiner audio is temporarily unavailable.'},502);
 return new Response(r.body,{headers:{'Content-Type':'audio/mpeg','Cache-Control':'public, max-age=86400, s-maxage=86400','X-Content-Type-Options':'nosniff'}});
 }catch(e){if(e instanceof AuthHttpError)return json({error:e.message},e.status);return json({error:'Audio unavailable'},503)}}
