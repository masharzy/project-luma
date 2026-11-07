import 'server-only';
import { z } from 'zod';
import { getKey } from '@/lib/ai-lab/secrets';
import { writingSystemPrompt } from '@/lib/evaluation/prompts';
import { writingAssessmentSchema,writingResponseSchema } from '@/lib/evaluation/schema';
// Admin-only Writing benchmark on the production prompt + schema. Cheap OpenRouter models only:
// the per-million price cap below keeps premium models out, and max_price is sent to OpenRouter too.
export const priceCap={prompt:1,completion:3};
export const writingBenchInput=z.object({model:z.string().min(3).max(150).regex(/^[a-zA-Z0-9._:/-]+$/),task:z.number().int().min(1).max(2),question:z.string().min(5).max(16000),answer:z.string().max(40000),variant:z.enum(['current','v2']).default('current'),maxTokens:z.number().int().min(500).max(8000).default(4000)});
// v2: stricter, more mechanical wording for verbatim quotes. Everything else unchanged.
const oldRule='corrections.original must be a nonempty EXACT substring of that task\'s answer.';
export const writingPromptV2=writingSystemPrompt.replace(oldRule,'corrections.original must be a nonempty EXACT substring of that task\'s answer: copy 3 to 12 consecutive words character by character (same spelling, capitalisation, punctuation, apostrophes and spaces), taken from inside one sentence and never across a line break. Never repair, shorten with ellipses or paraphrase inside original. If you cannot copy the excerpt exactly, omit that correction.').replace('Optional strengths (up to 2) must also quote exact substrings.','Optional strengths (up to 2) must also be exact copies of 3 to 12 consecutive words from the answer.');
type Entry={id:string;prompt:number;completion:number;ctx:number;reasoning:boolean;text:boolean};
let cache:{at:number;list:Entry[]}|null=null;
export async function cheapModels(){
 if(cache&&Date.now()-cache.at<600000)return cache.list;
 const r=await fetch('https://openrouter.ai/api/v1/models',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Model catalog unavailable');
 const list:Entry[]=((await r.json()).data||[]).map((m:{id:string;pricing?:{prompt?:string;completion?:string};context_length?:number;supported_parameters?:string[];architecture?:{input_modalities?:string[];output_modalities?:string[]}})=>({id:m.id,prompt:Number(m.pricing?.prompt)*1e6,completion:Number(m.pricing?.completion)*1e6,ctx:m.context_length||0,reasoning:Boolean(m.supported_parameters?.includes('reasoning')),text:Boolean(m.architecture?.input_modalities?.includes('text')&&(m.architecture?.output_modalities||['text']).join()==='text')}))
  .filter((m:Entry)=>Number.isFinite(m.prompt)&&Number.isFinite(m.completion)&&m.text&&m.prompt<=priceCap.prompt&&m.completion<=priceCap.completion&&m.ctx>=16000);
 cache={at:Date.now(),list};return list;
}
const fold=(s:string)=>s.replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
export async function runWritingBench(input:z.infer<typeof writingBenchInput>){
 const model=(await cheapModels()).find(m=>m.id===input.model);
 if(!model)throw Error('Model not in the cheap list (max $1 in / $3 out per 1M tokens, text only)');
 const key=await getKey('openrouter');
 const system=(input.variant==='v2'?writingPromptV2:writingSystemPrompt)+`\nRequired JSON schema: ${JSON.stringify(z.toJSONSchema(writingAssessmentSchema))}`;
 const body={model:input.model,max_tokens:input.maxTokens,temperature:0,response_format:{type:'json_object'},reasoning:{enabled:false},provider:{allow_fallbacks:false,require_parameters:true,max_price:{prompt:priceCap.prompt,completion:priceCap.completion}},messages:[{role:'system',content:system},{role:'user',content:JSON.stringify({tasks:[{task:input.task,question:input.question,answer:input.answer,imageAttached:false}]})}]};
 const started=performance.now();let raw='';
 const base={model:input.model,variant:input.variant,task:input.task,price:{prompt:model.prompt,completion:model.completion}};
 try{
  const res=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(110000)});
  const data=await res.json().catch(()=>({}));const ms=Math.round(performance.now()-started);
  if(!res.ok)return {...base,ok:false,stage:'http',error:`HTTP ${res.status}: ${String(data?.error?.message||'').replaceAll(key,'[redacted]').slice(0,200)}`,ms};
  raw=String(data.choices?.[0]?.message?.content||'');const finish=data.choices?.[0]?.finish_reason||null;const usage=data.usage||null;
  const common={...base,ms,finish,usage,costUsd:typeof usage?.cost==='number'?usage.cost:null,servedModel:data.model||null,raw};
  let json:unknown;try{json=JSON.parse(raw.replace(/^\s*```(?:json)?\s*/,'').replace(/\s*```\s*$/,''));}catch{return {...common,ok:false,stage:'json',error:'Invalid JSON'+(finish==='length'?' (hit output cap)':'')};}
  const parsed=writingResponseSchema.safeParse(json);if(!parsed.success)return {...common,ok:false,stage:'schema',error:parsed.error.issues.slice(0,3).map(i=>i.path.join('.')+': '+i.message).join('; ')};
  const t=parsed.data.tasks[0];const items=[...t.corrections.map(c=>c.original),...(t.strengths||[]).map(s=>s.original)];
  const strict=items.filter(o=>o.trim()&&input.answer.includes(o)).length,folded=items.filter(o=>o.trim()&&fold(input.answer).includes(fold(o))).length;
  const bands={task:t.taskAchievement.band,coherence:t.coherence.band,lexical:t.lexicalResource.band,grammar:t.grammar.band};
  const est=t.scorable?Math.round(Object.values(bands).reduce((a,b)=>a+b,0)/4*2)/2:null;
  return {...common,ok:strict===items.length&&parsed.data.tasks.length===1&&t.task===input.task,stage:'done',scorable:t.scorable,limitation:t.limitation||'',bands,estBand:est,quotes:{total:items.length,exact:strict,folded},corrections:t.corrections.length};
 }catch(e){return {...base,ok:false,stage:'network',error:e instanceof Error?e.message:'failed',ms:Math.round(performance.now()-started)};}
}
