import { z } from 'zod';
const band=z.number().min(0).max(9).multipleOf(.5).nullable();
const evidence=z.object({step:z.number().int(),quote:z.string().min(1),reason_bn:z.string()});
const criterion=z.object({band,reason_bn:z.string(),evidence:z.array(evidence).max(2)});
const stamp=z.number().nonnegative().nullable().optional();
const transcript=z.object({step:z.number().int(),part:z.number().int().min(1).max(3),verbatim:z.string().max(18000),speech_status:z.enum(['speech','partial_speech','no_speech','unintelligible_audio','technical_failure']),response_relevance:z.enum(['relevant','partly_relevant','irrelevant','no_answer','uncertain']),audio_quality:z.enum(['clear','degraded','unusable','unknown']),uncertain:z.array(z.string()).max(30),corrections:z.array(z.object({original:z.string(),corrected:z.string(),category:z.enum(['grammar','vocabulary','coherence']),reason_bn:z.string(),confidence:z.enum(['high','medium'])})).max(20),pronunciation:z.array(z.object({word:z.string(),timestamp_seconds:stamp,observation_bn:z.string(),confidence:z.enum(['high','medium'])})).max(10),fluency:z.object({delivery_band:band,speech_rate_wpm:z.number().nonnegative().nullable(),long_pause_count:z.number().nonnegative().nullable(),observations_bn:z.array(z.string()),evidence:z.array(z.object({timestamp_seconds:stamp,quote:z.string(),observation_bn:z.string()}))})});
export const speakingQaSchema=z.object({scorable:z.boolean().optional(),transcripts:z.array(transcript).max(40),criteria:z.object({fluency_coherence:criterion,lexical_resource:criterion,grammar:criterion,pronunciation:criterion}),overall_band:band,confidence:z.enum(['high','medium','low']),limitations_bn:z.array(z.string()),summary_bn:z.string(),next_steps_bn:z.array(z.string()).max(4)});
export const qaCriteria=['fluency_coherence','lexical_resource','grammar','pronunciation'] as const;
export type QaClip={step:number;part:number;seconds:number};
export function computedSpeakingBand(values:(number|null)[]){return values.length===4&&values.every(v=>v!==null&&Number.isFinite(v)&&v>=0&&v<=9&&v*2===Math.round(v*2))?Math.round((values as number[]).reduce((a,b)=>a+b,0)/2)/2:null;}
export function validateSpeakingQa(raw:unknown,clips:QaClip[]){
 const parsed=speakingQaSchema.safeParse(raw);
 if(!parsed.success)return {accepted:false,issues:parsed.error.issues.map(i=>({code:'schema',path:i.path.join('.'),detail:i.message})),result:null};
 const result=structuredClone(parsed.data),issues:{code:string;step?:number;detail?:string}[]=[];
 const fail=(code:string,step?:number,detail?:string)=>issues.push({code,step,detail});
 if(result.transcripts.length!==clips.length||result.transcripts.some((t,i)=>t.step!==clips[i]?.step||t.part!==clips[i]?.part))return {accepted:false,issues:[{code:'step_order_or_coverage'}],result:null};
 for(const t of result.transcripts){
  const seconds=clips.find(c=>c.step===t.step)!.seconds,ungradable=['no_speech','unintelligible_audio','technical_failure'].includes(t.speech_status);
  if(t.speech_status==='no_speech'&&t.verbatim.trim()){fail('speech_on_no_speech',t.step);t.verbatim='';}
  const disputed=(quote:string)=>t.uncertain.some(u=>u.trim()&&quote.toLowerCase().includes(u.toLowerCase().trim()));
  t.corrections=t.corrections.filter((c,i)=>{
   const code=ungradable?'correction_on_ungradable':!c.original.trim()||!t.verbatim.includes(c.original)?'correction_not_verbatim':c.original.trim()===c.corrected.trim()||!c.corrected.trim()?'unchanged_or_empty_correction':disputed(c.original)||c.original.includes('[unclear]')?'uncertain_hearing_punished':i>=3?'correction_budget':null;
   if(code){fail(code,t.step,c.original);return false;}return true;
  });
  t.fluency.evidence=t.fluency.evidence.filter(e=>{if(ungradable||!e.quote||!t.verbatim.includes(e.quote)||disputed(e.quote)){fail('fluency_evidence_not_supported',t.step);return false;}if(e.timestamp_seconds!=null&&e.timestamp_seconds>seconds){fail('timestamp_out_of_bounds',t.step);e.timestamp_seconds=null;}return true;});
  t.pronunciation=t.pronunciation.filter(e=>{if(ungradable||!t.verbatim.toLowerCase().includes(e.word.toLowerCase())||disputed(e.word)){fail('pronunciation_not_supported',t.step);return false;}if(e.timestamp_seconds!=null&&e.timestamp_seconds>seconds){fail('timestamp_out_of_bounds',t.step);e.timestamp_seconds=null;}return true;});
  if(t.fluency.delivery_band!==null){fail('per_answer_band',t.step);t.fluency.delivery_band=null;}
  if(ungradable){t.pronunciation=[];t.fluency.evidence=[];t.fluency.speech_rate_wpm=null;t.fluency.long_pause_count=null;}
 }
 for(const key of qaCriteria){const c=result.criteria[key];c.evidence=c.evidence.filter(e=>{const t=result.transcripts.find(t=>t.step===e.step);const ok=t&&['speech','partial_speech'].includes(t.speech_status)&&t.verbatim.includes(e.quote)&&!t.uncertain.some(u=>u.trim()&&e.quote.toLowerCase().includes(u.toLowerCase().trim()));if(!ok)fail('criterion_evidence_not_supported',e.step,key);return Boolean(ok);});if(c.band!==null&&!c.evidence.length){fail('criterion_without_evidence',undefined,key);c.band=null;}}
 const speech=result.transcripts.filter(t=>['speech','partial_speech'].includes(t.speech_status)&&t.verbatim.trim());
 const words=speech.reduce((n,t)=>n+t.verbatim.trim().split(/\s+/).length,0);
 const enough=clips.length>=3&&[1,2,3].every(p=>speech.some(t=>t.part===p))&&words>=50&&result.confidence!=='low'&&result.scorable!==false;
 // Coverage floor is an engineering withholding rule, never an IELTS band formula.
 if(!enough){if(qaCriteria.some(k=>result.criteria[k].band!==null))fail('insufficient_test_coverage');for(const k of qaCriteria)result.criteria[k].band=null;}
 const computed=computedSpeakingBand(qaCriteria.map(k=>result.criteria[k].band));
 if(result.overall_band!==computed)fail('overall_rounding_or_coverage_mismatch');
 result.overall_band=computed;result.scorable=computed!==null;
 return {accepted:true,issues,result};
}

export function speakingQaJsonFormat(){const schema=z.toJSONSchema(speakingQaSchema) as Record<string,unknown>;delete schema.$schema;function strict(n:unknown){if(!n||typeof n!=='object')return;const o=n as Record<string,unknown>;if(o.type==='object'&&o.properties){o.additionalProperties=false;o.required=Object.keys(o.properties as object);}for(const v of Object.values(o)){if(Array.isArray(v))v.forEach(strict);else if(v&&typeof v==='object')strict(v);}}strict(schema);return {type:'json_schema',json_schema:{name:'speaking_evaluation',strict:true,schema}};}
