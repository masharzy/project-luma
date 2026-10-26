import { NextRequest } from 'next/server';
import { randomUUID,createHash } from 'node:crypto';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { json,requireSameOrigin,readBody,AuthHttpError,limit,audit } from '@/lib/auth/http';
import { db } from '@/lib/auth/db';
import { getKey,keyStatus,saveKey,vaultReady } from '@/lib/ai-lab/secrets';
import { inputSchema,runBenchmark,googleReasoning } from '@/lib/ai-lab/benchmark';
export const maxDuration=300;
async function admin(){const s=await readSession();if(!s||!hasAdminRole(s.user))throw new AuthHttpError(403,'Forbidden');return s.user;}
function failure(e:unknown){return e instanceof AuthHttpError?json({error:e.message},e.status):json({error:'AI Lab unavailable. Check migration and server configuration.'},503);}
export async function GET(){try{await admin();const status=await keyStatus();const runs=await db().query('SELECT id,created_at,result FROM public.ai_lab_runs ORDER BY created_at DESC LIMIT 100');return json({status,runs});}catch(e){return failure(e);}}
export async function POST(req:NextRequest){try{const u=await admin();requireSameOrigin(req);const d=await readBody(req,4500000);
 if(d.action==='save-key'){
  if(!['google','openrouter'].includes(String(d.provider))||typeof d.key!=='string'||d.key.trim().length<15||d.key.length>1024)throw new AuthHttpError(400,'Invalid provider key');
  if(!vaultReady())throw new AuthHttpError(503,'Set AI_LAB_MASTER_KEY on the server before saving keys.');
  await saveKey(d.provider as 'google'|'openrouter',d.key.trim());await audit(u.id,'ai_lab_key_updated:'+d.provider);return json({ok:true});
 }
 if(d.action==='models'){
  const provider=d.provider;if(provider!=='google'&&provider!=='openrouter')throw new AuthHttpError(400,'Invalid provider');
  const response=await fetch(provider==='google'?'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000':'https://openrouter.ai/api/v1/models',{headers:provider==='google'?{'x-goog-api-key':await getKey(provider)}:{},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new AuthHttpError(502,'Unable to load models');const catalog=await response.json();
  const models=provider==='google'?(catalog.models||[]).filter((m:{supportedGenerationMethods?:string[]})=>m.supportedGenerationMethods?.includes('generateContent')).filter((m:{name:string})=>/^models\/gemini-/.test(m.name)&&!/(image|tts|transcribe|robotics|computer|omni)/.test(m.name)).map((m:{name:string})=>({id:m.name.replace('models/',''),reasoning:googleReasoning(m.name.replace('models/','')),note:m.name.includes('2.5')?'Legacy access may be restricted':'Verify free quota in Google AI Studio'})).sort((a:{id:string},b:{id:string})=>Number(b.id.includes('flash')&&!b.id.includes('2.5'))-Number(a.id.includes('flash')&&!a.id.includes('2.5'))||b.id.localeCompare(a.id,undefined,{numeric:true})):(catalog.data||[]).filter((m:{id:string;pricing?:{prompt:string;completion:string}})=>m.id.endsWith(':free')&&Number(m.pricing?.prompt)===0&&Number(m.pricing?.completion)===0).map((m:{id:string;architecture?:{input_modalities?:string[]};supported_parameters?:string[]})=>({id:m.id,note:(m.architecture?.input_modalities||[]).join(', '),reasoning:m.supported_parameters?.includes('reasoning')?'effort':'none'}));return json({models});
 }
 const parsed=inputSchema.safeParse(d);if(!parsed.success)throw new AuthHttpError(400,parsed.error.issues.map(i=>i.message).join('; '));
 await limit('ai-lab:'+u.id,30,3600);
 const id=randomUUID(),result=await runBenchmark(parsed.data);
 const {audio,answer,question,...settings}=parsed.data;
 const contentHash=createHash('sha256').update(JSON.stringify({audio,answer,question})).digest('hex');
 const report={...settings,contentHash,audioBytes:audio?Math.floor(audio.data.length*3/4):0,...result};
 await db().query('INSERT INTO public.ai_lab_runs(id,admin_id,result) VALUES($1,$2,$3::jsonb)',[id,u.id,JSON.stringify(report)]);
 return json({id,...report});
 }catch(e){return failure(e);}}
