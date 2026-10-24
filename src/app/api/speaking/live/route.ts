import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { requireSameOrigin,readBody,json,AuthHttpError,limitMany,networkKey } from '@/lib/auth/http';
import { db } from '@/lib/auth/db';
import { publishedSpeakingSet } from '@/lib/speaking/store';
import { examInstructions,examEventTool } from '@/lib/speaking/schema';
export const runtime='nodejs';
export const maxDuration=30;
async function hangup(call:string,key:string){return fetch(`https://api.openai.com/v1/realtime/calls/${encodeURIComponent(call)}/hangup`,{method:'POST',headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(10000)})}
export async function POST(req:NextRequest){let reservation:string|null=null;let providerCall:string|null=null;let apiKey:string|undefined;try{
 requireSameOrigin(req);const session=await readSession();if(!session)return json({error:'Sign in with a verified account to join a live mock.'},401);
 const key=process.env.OPENAI_API_KEY;apiKey=key;if(!key)return json({error:'Live speaking is not configured yet.'},503);
 const d=await readBody(req,70000);if(typeof d.sdp!=='string'||d.sdp.length>65000||!d.sdp.startsWith('v=0')||!d.sdp.includes('m=audio'))throw new AuthHttpError(400,'Invalid audio connection');
 const set=await publishedSpeakingSet('mock',String(d.testId));
 await limitMany([{key:'speaking-live:user:'+session.user.id,max:3,seconds:3600},{key:'speaking-live:net:'+networkKey(req),max:10,seconds:3600}]);
 // Stop abandoned calls for this account before opening another paid connection.
 const old=await db().query('SELECT id,call_id,created_at FROM public.speaking_live_calls WHERE user_id=$1 AND ended_at IS NULL',[session.user.id]);
 for(const row of old){if(Date.now()-new Date(String(row.created_at)).getTime()<20*60000)throw new AuthHttpError(409,'A live session is already open. Leave that session before reconnecting.');const r=String(row.call_id).startsWith('pending_')?new Response(null,{status:200}):await hangup(String(row.call_id),key);if(!r.ok&&r.status!==404)throw new AuthHttpError(503,'Unable to close the previous voice session. Please retry.');await db().query('UPDATE public.speaking_live_calls SET ended_at=now() WHERE id=$1',[row.id])}
 reservation=randomUUID();try{await db().query('INSERT INTO public.speaking_live_calls(id,user_id,call_id) VALUES($1,$2,$3)',[reservation,session.user.id,'pending_'+reservation])}catch(e){reservation=null;if((e as {code?:string}).code==='23505')throw new AuthHttpError(409,'A live session is already open.');throw e}
 const form=new FormData();form.set('sdp',d.sdp);form.set('session',JSON.stringify({type:'realtime',model:process.env.OPENAI_REALTIME_MODEL||'gpt-realtime-2.1-mini',instructions:examInstructions(set,d.examiner==='male'?'male':'female'),max_output_tokens:350,tools:[examEventTool],tool_choice:'auto',audio:{input:{noise_reduction:{type:'near_field'},turn_detection:{type:'semantic_vad',eagerness:'low',create_response:true,interrupt_response:false}},output:{voice:d.examiner==='male'?'cedar':'marin'}}}));
 const response=await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new AuthHttpError(502,'The live examiner could not connect. Please retry.');
 const call=response.headers.get('location')?.split('/').pop();if(!call||!/^[a-zA-Z0-9_-]{6,160}$/.test(call))throw new AuthHttpError(502,'Invalid live connection response');
 providerCall=call;const sdp=await response.text();await db().query('UPDATE public.speaking_live_calls SET call_id=$1 WHERE id=$2',[call,reservation]);const id=reservation;reservation=null;return json({id,sdp});
 }catch(e){if(reservation){if(providerCall&&apiKey)await hangup(providerCall,apiKey).catch(()=>null);await db().query('UPDATE public.speaking_live_calls SET ended_at=now() WHERE id=$1',[reservation]).catch(()=>null)}if(e instanceof AuthHttpError)return json({error:e.message},e.status);console.error('Live speaking setup failed');return json({error:'Live speaking is temporarily unavailable.'},503)}}
export async function DELETE(req:NextRequest){try{requireSameOrigin(req);const session=await readSession();if(!session)return json({error:'Sign in required'},401);const d=await readBody(req);if(typeof d.id!=='string'||!/^[0-9a-f-]{36}$/i.test(d.id))throw new AuthHttpError(400,'Invalid session');const rows=await db().query('SELECT call_id,ended_at FROM public.speaking_live_calls WHERE id=$1 AND user_id=$2',[d.id,session.user.id]);if(!rows[0])throw new AuthHttpError(404,'Session not found');if(!rows[0].ended_at){const key=process.env.OPENAI_API_KEY;if(!key)throw new AuthHttpError(503,'Voice service unavailable');const r=await hangup(String(rows[0].call_id),key);if(!r.ok&&r.status!==404)throw new AuthHttpError(502,'Unable to end the voice session. Retry.');await db().query('UPDATE public.speaking_live_calls SET ended_at=now() WHERE id=$1',[d.id])}return json({ended:true})}catch(e){if(e instanceof AuthHttpError)return json({error:e.message},e.status);return json({error:'Unable to end voice session'},503)}}
