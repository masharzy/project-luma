import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { requireSameOrigin,readBody,json,AuthHttpError,limit } from '@/lib/auth/http';
import { db } from '@/lib/auth/db';
import { getKey } from '@/lib/ai-lab/secrets';
import { speakingModel } from '@/lib/products/speaking-model';
import { assessSpeakingDirect,type SpeakingInput } from '@/lib/products/speaking-provider';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=300;
// Admin-only Speaking benchmark: the production per-part direct-audio pipeline on one saved recording
// (14 clips, 228 s). Reference transcript = gemini-3.1-pro-preview run 91ea393f (not a human transcript).
const SOURCE='91ea393f-1ebb-4627-9eb6-5af6393e76f8';
const cap={prompt:1.5,completion:4};
async function admin(){const s=await readSession();if(!s||!hasAdminRole(s.user))throw new AuthHttpError(403,'Forbidden');return s.user;}
const norm=(t:string)=>t.toLowerCase().replace(/\[[^\]]*\]/g,' ').replace(/[^a-z0-9' ]+/g,' ').split(/\s+/).filter(w=>w&&!['uh','um','hmm','erm','er','ah','oh'].includes(w));
function wer(ref:string[],hyp:string[]){if(!ref.length)return null;const d=Array.from({length:ref.length+1},(_,i)=>[i,...Array(hyp.length).fill(0)]);for(let j=0;j<=hyp.length;j++)d[0][j]=j;for(let i=1;i<=ref.length;i++)for(let j=1;j<=hyp.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(ref[i-1]===hyp[j-1]?0:1));return d[ref.length][hyp.length]/ref.length;}
export async function POST(req:NextRequest){try{const u=await admin();requireSameOrigin(req);const d=await readBody(req,20000);
 if(d.action==='models'){
  const r=await fetch('https://openrouter.ai/api/v1/models',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw new AuthHttpError(502,'Model catalog unavailable');
  const models=((await r.json()).data||[]).filter((m:{architecture?:{input_modalities?:string[]};pricing?:{prompt?:string;completion?:string}})=>m.architecture?.input_modalities?.includes('audio')&&Number(m.pricing?.prompt)*1e6<=cap.prompt&&Number(m.pricing?.completion)*1e6<=cap.completion&&Number(m.pricing?.prompt)>0)
   .map((m:{id:string;pricing:{prompt:string;completion:string;audio?:string};context_length:number})=>({id:m.id,prompt:Number(m.pricing.prompt)*1e6,completion:Number(m.pricing.completion)*1e6,audio:m.pricing.audio?Number(m.pricing.audio)*1e6:null,ctx:m.context_length}));
  return json({models});
 }
 const model=String(d.model||'');if(!/^[a-zA-Z0-9._:/-]{3,150}$/.test(model))throw new AuthHttpError(400,'Invalid model');
 const catalog=await fetch('https://openrouter.ai/api/v1/models',{signal:AbortSignal.timeout(15000)}).then(r=>r.json());
 const entry=(catalog.data||[]).find((m:{id:string})=>m.id===model);
 if(model!==speakingModel&&(!entry||!entry.architecture?.input_modalities?.includes('audio')||Number(entry.pricing?.prompt)*1e6>cap.prompt||Number(entry.pricing?.completion)*1e6>cap.completion))throw new AuthHttpError(400,'Model must accept audio and cost at most $1.5 in / $4 out per 1M tokens');
 await limit('speaking-bench:'+u.id,60,3600);
 const rows=await db().query('SELECT input,result FROM public.speaking_evaluations WHERE id=$1::uuid',[SOURCE]);if(!rows[0])throw new AuthHttpError(404,'Saved recording missing');
 const input=rows[0].input as SpeakingInput,refText=new Map<number,string>((rows[0].result.transcripts as {step:number;verbatim:string}[]).map(t=>[t.step,t.verbatim]));
 const key=await getKey('openrouter'),started=performance.now();
 const base={model,sourceSeconds:Math.round(input.clips.reduce((n,c)=>n+c.seconds,0)),clips:input.clips.length};
 let out:Record<string,unknown>;
 try{
  const {result,usage}=await assessSpeakingDirect(input,{providerKey:key,model,providerOnly:null,reasoning:d.reasoning==='low'||d.reasoning==='medium'?d.reasoning:undefined,simpleSchema:d.simpleSchema===true,noStepEnum:d.noStepEnum===true,pack:d.pack===true});
  const tr=new Map(result.transcripts.map(t=>[t.step,t.verbatim]));
  const perStep=input.clips.map(c=>({step:c.step,sec:c.seconds,wer:wer(norm(refText.get(c.step)||''),norm(tr.get(c.step)||'')),chars:(tr.get(c.step)||'').length}));
  const refAll=input.clips.flatMap(c=>norm(refText.get(c.step)||'')),hypAll=input.clips.flatMap(c=>norm(tr.get(c.step)||''));
  const details=result.assessmentDetails as {answers:{step:number;pronunciation:unknown[]}[]};
  const pronSteps=details.answers.filter(a=>a.pronunciation.length).map(a=>a.step);
  const cost=(usage as {cost:number|null}).cost;
  out={...base,ok:true,ms:Math.round(performance.now()-started),costUsd:cost,
   bands:{fluency:result.fluency.band,lexical:result.lexicalResource.band,grammar:result.grammar.band,pronunciation:result.pronunciation.band},estBand:result.estimatedBand,
   pronEvidence:{items:result.pronunciation.evidence.length,stepsWithWordNotes:pronSteps,partsWithWordNotes:[...new Set(pronSteps.map(s=>input.clips.find(c=>c.step===s)?.part))]},
   fluencyEvidenceSteps:[...new Set(result.fluency.evidence.map(e=>e.slice(0,10)))].length,
   transcriptWer:wer(refAll,hypAll),perStep,validationIssues:(result.validationIssues||[]).length,summary:result.summary.slice(0,300)};
 }catch(e){
  const rep=(e as {providerReport?:{failureCode:string;parts:{part:number;issues:string[];httpStatus?:number;rawResponse?:unknown}[]}}).providerReport;
  out={...base,ok:false,ms:Math.round(performance.now()-started),failureCode:rep?.failureCode||'ERROR',parts:rep?.parts?.map(p=>({part:p.part,http:p.httpStatus,issues:p.issues.slice(0,4),msg:p.httpStatus&&p.httpStatus>=400?JSON.stringify((p.rawResponse as {error?:unknown})?.error??p.rawResponse??'').slice(0,300):undefined}))||null,error:rep?null:(e instanceof Error?e.message.slice(0,200):'failed')};
 }
 const id=randomUUID();
 await db().query('INSERT INTO public.ai_lab_runs(id,admin_id,result) VALUES($1,$2,$3::jsonb)',[id,u.id,JSON.stringify({provider:'openrouter',skill:'speaking',profile:'speaking-bench-v1',sampleId:'saved-14clip-228s',...out})]);
 return json({id,...out});
 }catch(e){return e instanceof AuthHttpError?json({error:e.message},e.status):json({error:'Speaking benchmark unavailable'},503);}}
