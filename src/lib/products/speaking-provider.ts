import 'server-only';
import { z } from 'zod';
import { getKey } from '@/lib/ai-lab/secrets';
import { speakingQaPrompt, speakingQaPromptVersion } from './speaking-qa-prompt';
import { computedSpeakingBand } from './speaking-qa-validation';
import { speakingModel } from '@/lib/evaluation/provider';
import { getPrivate } from './storage';
import { speakingMp3 } from './speaking-audio';

const assessmentCriterion=z.object({band:z.number().min(0).max(9).multipleOf(.5).nullable(),feedback:z.string(),evidence:z.array(z.string())});
export const speakingAssessmentSchema=z.object({scorable:z.boolean(),limitation:z.string(),confidence:z.enum(['low','medium','high']),transcripts:z.array(z.object({step:z.number().int(),verbatim:z.string(),uncertain:z.array(z.string())})),fluency:assessmentCriterion,lexicalResource:assessmentCriterion,grammar:assessmentCriterion,pronunciation:assessmentCriterion,summary:z.string(),nextSteps:z.array(z.string())});
export const speakingResponseSchema=speakingAssessmentSchema.extend({limitation:z.string().nullish()});
export type SpeakingInput={sourceParts?:unknown[]|null;expected:number;cueCard:unknown;clips:{step:number;part:number;question:string;seconds:number;key:string}[]};
export type SpeakingAssessment=z.infer<typeof speakingAssessmentSchema>&{estimatedBand:number|null;assessmentDetails?:unknown;validationIssues?:unknown[]};

const band=z.number().min(0).max(9).multipleOf(.5).nullable();
const observation=z.object({quote:z.string(),why:z.string()});
const correction=z.object({
 original:z.string(),corrected:z.string(),category:z.enum(['grammar','vocabulary','coherence']),
 reason:z.string(),confidence:z.enum(['high','medium']),
});
const accent=z.object({description:z.string(),intelligibility:z.enum(['clear','mostly_clear','sometimes_unclear','unassessable']),observations:z.array(z.string())});
const answer=z.object({
 step:z.number().int(),verbatim:z.string().max(9000),
 speech_status:z.enum(['speech','partial_speech','no_speech','unintelligible_audio','technical_failure']),
 corrections:z.array(correction).max(6),
 pronunciation:z.array(z.object({word:z.string(),observation:z.string(),confidence:z.enum(['high','medium']),timestamp_seconds:z.number().nonnegative().nullable()})).max(4),
 strengths:z.array(observation).max(4),
 uncertain:z.array(z.string()).max(10),
});
const criterion=z.object({band,reason:z.string(),evidence:z.array(z.object({step:z.number().int(),quote:z.string(),reason:z.string()})).max(5)});
const modelOutput=z.object({
 answers:z.array(answer).max(40),
 criteria:z.object({fluency_coherence:criterion,lexical_resource:criterion,grammar:criterion,pronunciation:criterion}),
 accent,
 summary:z.string(),
 next_steps:z.array(z.string()).max(4),
 limitations:z.array(z.string()).max(8),
 confidence:z.enum(['high','medium','low']),
});


function modelJsonFormat(){
 const schema=z.toJSONSchema(modelOutput) as Record<string,unknown>;
 delete schema.$schema;
 const strict=(n:unknown)=>{
  if(!n||typeof n!=='object')return;
  const o=n as Record<string,unknown>;
  if(o.type==='object'&&o.properties){o.additionalProperties=false;o.required=Object.keys(o.properties as object);}
  for(const v of Object.values(o)){if(Array.isArray(v))v.forEach(strict);else if(v&&typeof v==='object')strict(v);}
 };
 strict(schema);
 return {type:'json_schema',json_schema:{name:'speaking_full_test',strict:true,schema}};
}

/** Display-only normalization, not a model-output validator. Does not edit raw response. */
export function finalizeSpeaking(raw:unknown,input:SpeakingInput):SpeakingAssessment {
 const wire=speakingResponseSchema.parse(raw);
 const r=speakingAssessmentSchema.parse({...wire,limitation:wire.limitation??''});
 const sourceCount=input.sourceParts?.length||3;
 const requiredParts=Array.from({length:sourceCount},(_,i)=>i+1);
 const complete=input.clips.length===input.expected&&requiredParts.every(p=>input.clips.some(c=>c.part===p))&&input.clips.reduce((n,c)=>n+c.seconds,0)>=60;
 const spoken=r.transcripts.some(t=>t.verbatim.trim().length>0);
 const overall=computedSpeakingBand([r.fluency.band,r.lexicalResource.band,r.grammar.band,r.pronunciation.band]);
 const scorable=spoken&&overall!==null&&r.confidence!=='low';
 const estimatedBand=scorable&&complete&&sourceCount===3?overall:null;
 const formatNote=sourceCount!==3?'Non-standard '+sourceCount+'-part test: no official full IELTS band. ':complete?'':'Incomplete test: holistic IELTS band is withheld. ';
 const evidenceNote=spoken?'':'No intelligible candidate speech was returned. ';
 return {...r,scorable,estimatedBand,limitation:formatNote+evidenceNote+r.limitation};
}

type ProviderEnvelope={id?:string;model?:string;usage?:Record<string,unknown>;choices?:Array<{message?:{content?:string};finish_reason?:string}>;error?:unknown};
function providerError(message:string,details:Record<string,unknown>){
 return Object.assign(new Error(message),{retryable:false,providerReport:details});
}

export async function assessSpeaking(input:SpeakingInput,options:{captureRaw?:boolean}={}){
 // This is ONE paid MiMo request for ALL clips and their examiner questions.
 // Keep each original MP3 separately associated with its question: that is the
 // exact packaging used by the first successful 14-answer full-test lab run.
 if(!input.clips.length)throw new Error('No Speaking recordings submitted');
 const content:Record<string,unknown>[]=[];
 let sourceAudioBytes=0,providerAudioBytes=0;
 for(const clip of input.clips){
  const bytes=await getPrivate(clip.key);
  if(bytes.length>3900000)throw new Error('Recording too large');
  const audio=speakingMp3(bytes);
  sourceAudioBytes+=bytes.length;
  providerAudioBytes+=audio.length;
  content.push(
   {type:'text',text:JSON.stringify({step:clip.step,part:clip.part,question:clip.question,seconds:clip.seconds})},
   {type:'input_audio',input_audio:{format:'mp3',data:Buffer.from(audio).toString('base64')}}
  );
 }
 if(providerAudioBytes>11000000)throw new Error('Combined compressed audio too large');
 const key=await getKey('openrouter');
 const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
  method:'POST',
  headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':'https://jumptonine.com','X-Title':'JumpToNine Speaking Evaluation'},
  body:JSON.stringify({model:speakingModel,max_tokens:9000,temperature:0.1,reasoning:{enabled:false},provider:{only:['Xiaomi'],allow_fallbacks:false,require_parameters:true},response_format:modelJsonFormat(),messages:[{role:'system',content:speakingQaPrompt},{role:'user',content}]}),
  signal:AbortSignal.timeout(250000)
 });
 const bodyText=await response.text();
 let envelope:ProviderEnvelope={};
 try{envelope=JSON.parse(bodyText);}catch{
  throw providerError('Speaking provider returned non-JSON HTTP response',{httpStatus:response.status,rawHttpText:bodyText.slice(0,120000)});
 }
 // Only the provider's model output is considered assessment data. Original
 // unfiltered content is retained even if it is internally inconsistent.
 const sanitized=JSON.parse(JSON.stringify(envelope).replaceAll(key,'[credential removed]')) as ProviderEnvelope;
 const providerReport={httpStatus:response.status,model:speakingModel,usage:sanitized.usage||null,providerId:sanitized.id||null,rawModelText:sanitized.choices?.[0]?.message?.content||'',rawProviderEnvelope:sanitized};
 if(!response.ok)throw providerError('Speaking provider rejected the request',providerReport);
 const modelText=sanitized.choices?.[0]?.message?.content||'';
 let raw:unknown;
 try{raw=JSON.parse(modelText);}catch{
  throw providerError('Speaking model returned invalid JSON',providerReport);
 }
 const parsed=modelOutput.safeParse(raw);
 if(!parsed.success)throw providerError('Speaking model returned an incomplete JSON structure', {...providerReport,rawModelJson:raw,issues:parsed.error.issues.map(e=>({path:e.path.join('.'),message:e.message})).slice(0,20)});
 const model=parsed.data;
 // Read and display the model's assertions as-is. Never change speech status,
 // erase transcripts, drop correction items, or null-out a claimed criterion band.
 const note: string[]=[];
 if(model.answers.length!==input.clips.length)note.push('Model answer count differs from submitted recordings');
 const sourceSteps=new Set(input.clips.map(c=>c.step));
 if(model.answers.some(a=>!sourceSteps.has(a.step)))note.push('Model returned an unknown step ID');
 const observed=new Set<number>();
 if(model.answers.some(a=>{if(observed.has(a.step))return true;observed.add(a.step);return false;}))note.push('Model repeated a step ID');
 for(const answer of model.answers){
  if(answer.speech_status==='no_speech'&&answer.verbatim.trim())note.push('Model marked step '+answer.step+' no_speech despite transcribing words');
 }
 const rub=(c:typeof model.criteria.grammar)=>({band:c.band,feedback:c.reason,evidence:c.evidence.map(e=>'Answer '+(input.clips.findIndex(x=>x.step===e.step)+1)+': “'+e.quote+'” — '+e.reason)});
 const transcriptByStep=new Map(model.answers.map(a=>[a.step,a]));
 const result=finalizeSpeaking({
  scorable:model.confidence!=='low',limitation:(model.limitations||[]).join(' '),confidence:model.confidence,
  transcripts:input.clips.map(c=>{const a=transcriptByStep.get(c.step);return {step:c.step,verbatim:a?.verbatim??'',uncertain:a?.uncertain??[]};}),
  fluency:rub(model.criteria.fluency_coherence),lexicalResource:rub(model.criteria.lexical_resource),grammar:rub(model.criteria.grammar),pronunciation:rub(model.criteria.pronunciation),
  summary:model.summary,nextSteps:model.next_steps
 },input);
 result.assessmentDetails=raw;
 result.validationIssues=note;
 return {result,usage:{...sanitized.usage,promptVersion:speakingQaPromptVersion,sourceAudioBytes,providerAudioBytes,providerRequestId:sanitized.id||null,...(options.captureRaw?{rawPrimary:sanitized}:{})},model:speakingModel};
}
