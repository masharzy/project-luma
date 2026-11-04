import 'server-only';
import { getKey } from '@/lib/ai-lab/secrets';
import { speakingQaPrompt, speakingQaPromptVersion } from './speaking-qa-prompt';
import { validateSpeakingQa, speakingQaJsonFormat, computedSpeakingBand, type QaClip } from './speaking-qa-validation';
import { z } from 'zod';
import { speakingModel } from '@/lib/evaluation/provider';
import { getPrivate } from './storage';
import { speakingMp3 } from './speaking-audio';
const criterion=z.object({band:z.number().min(0).max(9).multipleOf(.5).nullable(),feedback:z.string().max(2000),evidence:z.array(z.string().max(800)).max(5)});
export const speakingAssessmentSchema=z.object({scorable:z.boolean(),limitation:z.string().max(1000),confidence:z.enum(['low','medium','high']),transcripts:z.array(z.object({step:z.number().int(),verbatim:z.string().max(8000),uncertain:z.array(z.string().max(200)).max(10)})).max(40),fluency:criterion,lexicalResource:criterion,grammar:criterion,pronunciation:criterion,summary:z.string().max(2000),nextSteps:z.array(z.string().max(1000)).max(4)});
export const speakingResponseSchema=speakingAssessmentSchema.extend({limitation:z.string().max(1000).nullish()});
export type SpeakingInput={sourceParts?:unknown[]|null;expected:number;cueCard:unknown;clips:{step:number;part:number;question:string;seconds:number;key:string}[]};
export type SpeakingAssessment=z.infer<typeof speakingAssessmentSchema>&{estimatedBand:number|null;assessmentDetails?:unknown;validationIssues?:unknown[]};
export function finalizeSpeaking(raw:unknown,input:SpeakingInput):SpeakingAssessment {
 const wire=speakingResponseSchema.parse(raw);
 const r=speakingAssessmentSchema.parse({...wire,limitation:wire.limitation??''});
 if(r.transcripts.length!==input.clips.length||new Set(r.transcripts.map(t=>t.step)).size!==r.transcripts.length||r.transcripts.some(t=>!input.clips.some(c=>c.step===t.step)))throw Error('Transcript does not match recordings');
 const sourceCount=input.sourceParts?.length||3,requiredParts=Array.from({length:sourceCount},(_,i)=>i+1);
 const complete=input.clips.length===input.expected&&requiredParts.every(p=>input.clips.some(c=>c.part===p))&&input.clips.reduce((n,c)=>n+c.seconds,0)>=60;
 const hasSpeech=r.transcripts.some(t=>t.verbatim.trim().length>0);
 const hasEvidence=[r.fluency,r.lexicalResource,r.grammar,r.pronunciation].every(c=>c.evidence.some(e=>e.trim().length>0));
 const overall=computedSpeakingBand([r.fluency.band,r.lexicalResource.band,r.grammar.band,r.pronunciation.band]);
 const scorable=r.scorable&&hasSpeech&&hasEvidence&&overall!==null;
 const reliable=scorable&&r.confidence!=='low';
 const formatNote=sourceCount!==3?'Source-format practice with '+sourceCount+' parts; a standard three-part IELTS band is not estimated. ':complete?'':'Partial performance: a full-test band cannot be estimated reliably. ';
 const evidenceNote=!reliable?'Insufficient or low-confidence evidence: an overall band is withheld. ':'';
 return {...r,scorable,estimatedBand:reliable&&complete&&sourceCount===3?overall:null,limitation:formatNote+evidenceNote+r.limitation};
}
export async function assessSpeaking(input:SpeakingInput,options:{captureRaw?:boolean}={}){
 const deadline=Date.now()+270000;let sourceAudioBytes=0,providerAudioBytes=0;
 const content:Record<string,unknown>[]=[];
 for(const clip of input.clips){
  const bytes=await getPrivate(clip.key);if(bytes.length>3900000)throw Error('Recording too large');
  const audio=speakingMp3(bytes);sourceAudioBytes+=bytes.length;providerAudioBytes+=audio.length;
  content.push({type:'text',text:JSON.stringify({step:clip.step,part:clip.part,question:clip.question,seconds:clip.seconds})},{type:'input_audio',input_audio:{format:'mp3',data:Buffer.from(audio).toString('base64')}});
 }
 const key=await getKey('openrouter');
 const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':'https://jumptonine.com','X-Title':'JumpToNine Speaking Evaluation'},body:JSON.stringify({model:speakingModel,max_tokens:6500,temperature:0.1,reasoning:{enabled:false},provider:{only:['Xiaomi'],allow_fallbacks:false,require_parameters:true},response_format:speakingQaJsonFormat(),messages:[{role:'system',content:speakingQaPrompt},{role:'user',content}]}),signal:AbortSignal.timeout(Math.max(1000,Math.min(250000,deadline-Date.now())))});
 const envelope=await response.json();
 if(!response.ok)throw Object.assign(Error('Speaking provider request failed'),{statusCode:response.status,retryable:response.status>=500||response.status===429||response.status===408});
 let raw:unknown;try{raw=JSON.parse(envelope.choices?.[0]?.message?.content||'');}catch{throw Object.assign(Error('Speaking response JSON invalid'),{retryable:false});}
 const validation=validateSpeakingQa(raw,input.clips as QaClip[]);
 if(!validation.accepted||!validation.result)throw Object.assign(Error('Speaking evidence schema invalid'),{retryable:false});
 const r=validation.result;
 const map=(c:typeof r.criteria.grammar)=>({band:c.band,feedback:c.reason_bn,evidence:c.evidence.map(e=>'Answer '+(input.clips.findIndex(x=>x.step===e.step)+1)+': "'+e.quote+'" — '+e.reason_bn)});
 const result:SpeakingAssessment=finalizeSpeaking({scorable:r.scorable,limitation:r.limitations_bn.join(' ')+(validation.issues.length?' Some unsupported model claims were withheld.':''),confidence:r.confidence,transcripts:r.transcripts.map(t=>({step:t.step,verbatim:t.verbatim,uncertain:t.uncertain.slice(0,10)})),fluency:map(r.criteria.fluency_coherence),lexicalResource:map(r.criteria.lexical_resource),grammar:map(r.criteria.grammar),pronunciation:map(r.criteria.pronunciation),summary:r.summary_bn,nextSteps:r.next_steps_bn},input);
 result.assessmentDetails=r;result.validationIssues=validation.issues;
 return {result,usage:{...envelope.usage,promptVersion:speakingQaPromptVersion,sourceAudioBytes,providerAudioBytes,providerRequestId:envelope.id,...(options.captureRaw?{rawPrimary:JSON.parse(JSON.stringify(envelope).replaceAll(key,'[credential removed]'))}:{})},model:speakingModel};
}
