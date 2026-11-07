import 'server-only';
import { z } from 'zod';
import { getKey } from '@/lib/ai-lab/secrets';
import { computedSpeakingBand } from './speaking-qa-validation';
import { speakingModel, speakingProvider } from './speaking-model';
import { getPrivate } from './storage';
import { readSpeakingStream, type SpeakingEnvelope } from './speaking-stream';
import { speakingCoverageIssues, speakingEvidenceIssues, repairSpeakingPart } from './speaking-coverage';
import { speakingMp3,encodeSpeakingPcm } from './speaking-audio';
import { packSpeakingAudio } from './speaking-audio-pack';
import { vocabularyProfile, vocabularyLevels } from './speaking-vocabulary';

const promptVersion = 'gemini-3.8-flash-part-lean-v2';
const systemPrompt = `Assess one IELTS Speaking part. Each question label is followed by its own audio clip. All evidence timestamps are seconds from the START of that clip.
1. For every clip, transcribe verbatim as "lines": one entry per sentence or natural clause, in order, preserving mistakes, fillers and repetitions. Use [unclear] for uncertain speech. For silence or unusable audio return an empty lines array and the actual speech_status. Never skip a later clip because of words spoken in an earlier one.
2. Give every line a mark: "g" = natural and accurate; "y" = understandable but could be improved (weak or repeated word choice, awkward phrasing, off-topic or unnecessary detail); "r" = contains a clear grammar or word error. Marks judge wording and grammar only, never accent or pronunciation. Most lines in a strong answer are "g". Do not explain "g" lines.
3. For lines marked "y" or "r" add corrections that point at exact words: "original" is an exact substring of that line; "corrected" is the replacement. Use category "redundant" with an empty "corrected" when the words are irrelevant, filler or needlessly repeated and should simply be removed. Use "vocabulary" for a better word, "grammar" for an error. Reasons are at most 12 words. At most 3 corrections per answer; choose the most useful. Never invent an experience for the candidate.
4. Listen to the actual audio for fluency/coherence and pronunciation. Cite a clip-relative timestamp and an audible feature for both criterion bands. Report at most 3 pronunciation words for the whole part, only if clearly audible. Never infer pronunciation from spelling or penalize accent alone. If you cannot hear or access the audio, set audio_access to unavailable and explain. For a silent part leave criterion bands null with a reason.
5. Part 2: say whether the cue card prompts were covered and whether the candidate sustained the talk. Part 3: judge opinions with reasons, examples and abstract language. Part 1: judge direct answers with a natural extension. Put this in the part summary (at most 2 sentences).
Use the full IELTS scale when the evidence warrants it. Separate content-planning pauses and natural self-repair from difficulty finding words or extending answers. Judge vocabulary by precision, flexibility and natural paraphrase. Judge grammar by range and the pattern of errors across answers. A band 5 shows limited flexibility and recurring difficulty, 6 communicates clearly with noticeable limitations, 7 sustains flexible speech with lapses, 8 shows wide command with occasional lapses, and 9 is consistently precise, effortless and clear. Do not reduce a strong score for an isolated slip.
vocabulary_level is the CEFR level (A1-C2) of the vocabulary actually used in this part, or null for a silent part. Use IELTS bands in half-point steps for the four criteria. Each criterion reason is at most 2 short sentences with 1 or 2 evidence items (each evidence "reason" at most 12 words; fluency and pronunciation evidence need a timestamp). At most 2 next_steps. Return one JSON object matching the response schema and fill every listed step in answers, even after a spoken skip.`;

const assessmentCriterion=z.object({band:z.number().min(0).max(9).multipleOf(.5).nullable(),feedback:z.string(),evidence:z.array(z.string())});
export const speakingAssessmentSchema=z.object({scorable:z.boolean(),limitation:z.string(),confidence:z.enum(['low','medium','high']),transcripts:z.array(z.object({step:z.number().int(),verbatim:z.string(),uncertain:z.array(z.string())})),fluency:assessmentCriterion,lexicalResource:assessmentCriterion,grammar:assessmentCriterion,pronunciation:assessmentCriterion,summary:z.string(),nextSteps:z.array(z.string())});
export const speakingResponseSchema=speakingAssessmentSchema.extend({limitation:z.string().nullish()});
export type SpeakingInput={sourceParts?:unknown[]|null;pronunciationQa?:true;expected:number;cueCard:unknown;clips:{step:number;part:number;question:string;seconds:number;key:string}[]};
export type SpeakingAssessment=z.infer<typeof speakingAssessmentSchema>&{estimatedBand:number|null;assessmentDetails?:unknown;validationIssues?:unknown[]};

const band=z.number().min(0).max(9).multipleOf(.5).nullable();
const observation=z.object({quote:z.string(),why:z.string()});
const correction=z.object({
 original:z.string(),corrected:z.string(),category:z.enum(['grammar','vocabulary','coherence','redundant']),
 reason:z.string(),confidence:z.enum(['high','medium']),
});
const lineMark=z.enum(['g','y','r']);
const answerWire=z.object({
 step:z.number().int(),
 speech_status:z.enum(['speech','partial_speech','no_speech','unintelligible_audio','technical_failure']),
 lines:z.array(z.object({text:z.string(),mark:lineMark})),
 corrections:z.array(correction),
 pronunciation:z.array(z.object({word:z.string(),observation:z.string(),confidence:z.enum(['high','medium']),timestamp_seconds:z.number().nonnegative().nullable()})),
 uncertain:z.array(z.string()),
});
const criterion=z.object({band,reason:z.string(),evidence:z.array(z.object({step:z.number().int(),quote:z.string(),reason:z.string().trim().min(1),timestamp_seconds:z.number().nonnegative().nullable()}))});
const modelOutput=z.object({
 audio_access:z.enum(['heard','unavailable']),
 criteria:z.object({fluency_coherence:criterion,lexical_resource:criterion,grammar:criterion,pronunciation:criterion}),
 vocabulary_level:z.enum(vocabularyLevels).nullable(),
 summary:z.string(),
 next_steps:z.array(z.string()),
 limitations:z.array(z.string()),
 confidence:z.enum(['high','medium','low']),
 answers:z.array(answerWire),
});


export function modelJsonFormat(steps:number[]){
 const schema=z.toJSONSchema(modelOutput) as Record<string,unknown>;
 delete schema.$schema;
 const answers=(schema.properties as Record<string,any>).answers;
 answers.minItems=steps.length;
 answers.maxItems=steps.length;
 answers.items.properties.step.enum=steps;
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
 const wire=raw as z.infer<typeof speakingResponseSchema>;
 const r={...wire,limitation:wire.limitation??''};
 const sourceCount=input.sourceParts?.length||3;
 const requiredParts=Array.from({length:sourceCount},(_,i)=>i+1);
 const returnedSteps=new Set(r.transcripts.map(t=>t.step));
 const returnedComplete=r.transcripts.length===input.clips.length&&returnedSteps.size===input.clips.length&&input.clips.every(c=>returnedSteps.has(c.step));
 if(!returnedComplete)throw Error('Transcript does not match recordings');
 const complete=input.clips.length===input.expected&&requiredParts.every(p=>input.clips.some(c=>c.part===p))&&input.clips.reduce((n,c)=>n+c.seconds,0)>=60;
 const spoken=r.transcripts.some(t=>t.verbatim.trim().length>0);
 const overall=computedSpeakingBand([r.fluency.band,r.lexicalResource.band,r.grammar.band,r.pronunciation.band]);
 const scorable=r.scorable!==false&&spoken&&overall!==null&&r.confidence!=='low'&&[r.fluency,r.lexicalResource,r.grammar,r.pronunciation].every(c=>c.evidence.length>0);
 const estimatedBand=scorable&&complete&&sourceCount===3?overall:null;
 const formatNote=sourceCount!==3?'Non-standard '+sourceCount+'-part test: no official full IELTS band. ':complete?'':'Incomplete test: holistic IELTS band is withheld. ';
 const evidenceNote=spoken?'':'No intelligible candidate speech was returned. ';
 return {...r,scorable,estimatedBand,limitation:formatNote+evidenceNote+r.limitation};
}

type WireModel = z.infer<typeof modelOutput>;
type PartAnswer = Omit<WireModel['answers'][number],'lines'> & {verbatim:string;lines:{text:string;mark:'g'|'y'|'r'}[];strengths:{quote:string;why:string}[]};
type PartModel = Omit<WireModel,'answers'> & {answers:PartAnswer[]};
// The model returns the transcript once, as marked lines. verbatim is derived (one line per entry) so evidence matching still works on one text.
const normalizePart=(m:WireModel):PartModel=>({...m,answers:m.answers.map(a=>({...a,lines:a.lines.filter(l=>l.text.trim()),verbatim:a.lines.filter(l=>l.text.trim()).map(l=>l.text.trim()).join('\n'),strengths:[]}))});
type Clip = SpeakingInput['clips'][number];
type PartReport = {
 part:number; issues:string[]; providerRequestId?:string; httpStatus?:number;
 rawResponse?:SpeakingEnvelope | string;
 repaired?:Record<string,number>; attempts?:number;
};
type AssessmentOptions = {
 onProgress?:(report:PartReport)=>Promise<void>;
 providerKey?:string;
 loadAudio?:(key:string)=>Promise<Uint8Array>;
 // Admin benchmark only: evaluate with another audio model. providerOnly null lets OpenRouter pick the provider.
 model?:string;
 providerOnly?:string|null;
 // Admin benchmark only: reasoning-mandatory models need an effort instead of enabled:false; some providers reject multipleOf.
 reasoning?:'low'|'medium';
 simpleSchema?:boolean;
 noStepEnum?:boolean;
 // One joined audio per part (clips separated by 1 s silence, explicit start/end offsets) instead of one audio part per clip.
 pack?:boolean;
 // Admin benchmark only: drop array-size/length constraints (Gemini rejects large nested constrained schemas). Coverage is still validated in code.
 loose?:boolean;
 // Admin benchmark only: for models without structured-output or reasoning params. Schema goes in the prompt; no response_format, no require_parameters.
 relaxed?:boolean;
 ignoreProviders?:string[];
};
const isSpeech=(status:string)=>status==='speech'||status==='partial_speech';
const criterionKeys=['fluency_coherence','lexical_resource','grammar','pronunciation'] as const;
const noAudio=/no (?:audio|recording)(?: was| is)? (?:provided|available|attached)|(?:cannot|could not|unable to) (?:listen|hear|access the audio)/i;

function validatePart(model:PartModel,clips:Clip[]){
 const issues=speakingCoverageIssues(model.answers,clips.map(clip=>clip.step));
 if(model.audio_access!=='heard'||[model.summary,...model.limitations].some(note=>noAudio.test(note)))issues.push('audio_not_heard');
 // Optional strength highlights may be shortened. Corrections and band evidence must remain grounded.
 issues.push(...speakingEvidenceIssues({...model,answers:model.answers.map(a=>({...a,strengths:[]}))},clips));
 const spoken=model.answers.some(a=>isSpeech(a.speech_status));
 for(const a of model.answers){
  if(a.speech_status==='technical_failure')issues.push('audio_processing_failed:'+a.step);
  if(!isSpeech(a.speech_status)&&a.verbatim.trim())issues.push('unscorable_transcript:'+a.step);
  if(!isSpeech(a.speech_status))continue;
  if(!a.lines.length)issues.push('missing_lines:'+a.step);
 }
 for(const name of criterionKeys){
  const c=model.criteria[name];
  if(!c.reason.trim()||(spoken?c.band===null:c.band!==null))issues.push('missing_or_inconsistent_band:'+name);
  if(name!=='fluency_coherence'&&name!=='pronunciation')continue;
  if(noAudio.test(c.reason)||c.evidence.some(e=>noAudio.test(e.reason)))issues.push('audio_not_heard:'+name);
  if(spoken&&!c.evidence.some(e=>e.timestamp_seconds!==null&&e.reason.trim()))issues.push('missing_audio_evidence:'+name);
  for(const e of c.evidence){
   const clip=clips.find(clip=>clip.step===e.step);
   if(e.timestamp_seconds!==null&&(!clip||e.timestamp_seconds>clip.seconds+.05))issues.push('criterion_timestamp_out_of_bounds:'+name+':'+e.step);
  }
 }
 if(!model.summary.trim()||(spoken&&!model.next_steps.length)||model.next_steps.some(step=>!step.trim()))issues.push('missing_summary_or_next_steps');
 return issues;
}

async function assessPart(part:number, clips:Clip[], cueCard:unknown, key:string, options:AssessmentOptions){
 const report:PartReport={part,issues:[]};
 let model:PartModel|undefined;
 let stage='audio_download';
 try{
  const loadAudio=options.loadAudio??getPrivate;
  const steps=clips.map(clip=>clip.step);
  const content:Record<string,unknown>[]=[{type:'text',text:JSON.stringify({part,steps,cueCard:part===2?cueCard:undefined})}];
  // Each part prepares its own audio. Download clips serially within a part.
  if(options.pack){
   const loaded:{clip:Omit<Clip,'key'>;bytes:Uint8Array}[]=[];
   for(const {key:objectKey,...clip} of clips){stage='audio_download';loaded.push({clip,bytes:await loadAudio(objectKey)});}
   stage='audio_encode';
   const packed=packSpeakingAudio(loaded);
   content.push({type:'text',text:'AUDIO PACKAGING: the single audio below joins this part\'s answers in order, separated by 1 second of silence that is never candidate hesitation. Each entry gives start_seconds/end_seconds in the joined audio. Assess each answer only inside its interval. Any timestamp_seconds you report must be relative to the start of that answer (subtract its start_seconds). Return exactly one answer object per step.\n'+JSON.stringify(packed.segments)},
    {type:'input_audio',input_audio:{format:'mp3',data:encodeSpeakingPcm(Buffer.from(packed.audio).subarray(44)).toString('base64')}});
  }else{
  for(const {key:objectKey,...clip} of clips){
   stage='audio_download';
   const bytes=await loadAudio(objectKey);
   stage='audio_encode';
   const audio=speakingMp3(bytes);
   content.push({type:'text',text:JSON.stringify(clip)},{type:'input_audio',input_audio:{format:'mp3',data:audio.toString('base64')}});
  }
  }
  stage='provider_request';
  const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{
   method:'POST',signal:AbortSignal.timeout(260_000),
   headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','HTTP-Referer':'https://jumptonine.com','X-Title':'JumpToNine Speaking Evaluation'},
   body:JSON.stringify({
    model:options.model??speakingModel,stream:true,stream_options:{include_usage:true},max_tokens:16000,
    ...(options.relaxed?{}:{reasoning:{effort:options.reasoning??'low',exclude:true}}),provider:{...(options.providerOnly===null||options.relaxed?{}:{only:[options.providerOnly??speakingProvider]}),...(options.ignoreProviders?.length?{ignore:options.ignoreProviders}:{}),allow_fallbacks:!!options.relaxed,require_parameters:!options.relaxed},
    ...(options.relaxed?{}:{response_format:options.simpleSchema||options.noStepEnum||options.loose!==false?JSON.parse(JSON.stringify(modelJsonFormat(steps),(k,v)=>k==='multipleOf'||(options.loose!==false&&['minItems','maxItems','maxLength','minLength'].includes(k))||((options.noStepEnum||options.loose!==false)&&k==='enum'&&Array.isArray(v)&&v.every(x=>typeof x==='number'))?undefined:v)):modelJsonFormat(steps)}),
    messages:[{role:'system',content:options.relaxed?systemPrompt+'\nReturn ONLY one JSON object (no markdown fences, no prose) matching this JSON Schema exactly:\n'+JSON.stringify((modelJsonFormat(steps).json_schema.schema as Record<string,unknown>))+'\nUse answers in this exact step order: '+steps.join(', ')+'.':systemPrompt},{role:'user',content}],
   }),
  });
  report.httpStatus=response.status;
  stage='provider_response';
  const sanitize=(raw:SpeakingEnvelope)=>JSON.parse(JSON.stringify(raw).replaceAll(key,'[credential removed]')) as SpeakingEnvelope;
  let lastCheckpoint=0;
  let envelope:SpeakingEnvelope;
  if(!response.headers.get('content-type')?.includes('text/event-stream')){
   const raw=(await response.text()).replaceAll(key,'[credential removed]');
   report.rawResponse=raw;
   envelope=JSON.parse(raw);
  }else{
   try{
    envelope=await readSpeakingStream(response,async partial=>{
     if(!partial.id||Date.now()-lastCheckpoint<10_000)return;
     lastCheckpoint=Date.now();
     await options.onProgress?.({...report,providerRequestId:partial.id,rawResponse:sanitize(partial)});
    });
   }catch(error){
    const partial=(error as {partialEnvelope?:SpeakingEnvelope}).partialEnvelope;
    if(partial)report.rawResponse=sanitize(partial);
    throw error;
   }
  }
  report.rawResponse=sanitize(envelope);
  report.providerRequestId=envelope.id;
  if(!response.ok||envelope.error)report.issues.push('provider_error');
  else if(envelope.choices?.[0]?.finish_reason!=='stop')report.issues.push('incomplete_model_output');
  else{
   let raw:unknown;
   try{raw=JSON.parse((envelope.choices[0].message?.content??'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}
   catch{report.issues.push('invalid_model_json');}
   if(!report.issues.length){
    const parsed=modelOutput.safeParse(raw);
    if(!parsed.success)report.issues.push(...parsed.error.issues.map(issue=>'schema:'+issue.path.join('.')+': '+issue.message));
    else{
     // Size limits are applied here instead of failing the whole part when a model is slightly verbose.
     const bounded={...normalizePart(parsed.data),next_steps:parsed.data.next_steps.slice(0,2),limitations:parsed.data.limitations.slice(0,8),
      criteria:Object.fromEntries(Object.entries(parsed.data.criteria).map(([k,c])=>[k,{...c,evidence:c.evidence.slice(0,3)}])) as PartModel['criteria']};
     const repaired=repairSpeakingPart(bounded,clips);
     if(Object.keys(repaired.dropped).length)report.repaired=repaired.dropped;
     report.issues.push(...validatePart(repaired.model,clips));
     if(!report.issues.length)model=repaired.model;
    }
   }
  }
 }catch(error){
  const cause=error instanceof Error?error.cause:error;
  const name=cause instanceof Error?cause.name:error instanceof Error?error.name:'UnknownError';
  report.issues.push(stage+':'+name);
 }
 await options.onProgress?.(report);
 return {report,model};
}

// One automatic retry per part (model output is non-deterministic); a provider 4xx is a request problem and is not retried.
async function assessPartWithRetry(part:number,clips:Clip[],cueCard:unknown,key:string,options:AssessmentOptions){
 const first=await assessPart(part,clips,cueCard,key,options);
 if(first.model||(first.report.httpStatus!==undefined&&first.report.httpStatus>=400&&first.report.httpStatus<500))return {...first,report:{...first.report,attempts:1}};
 const second=await assessPart(part,clips,cueCard,key,options);
 return {...second,report:{...second.report,attempts:2}};
}

export async function assessSpeakingDirect(input:SpeakingInput,options:AssessmentOptions={}){
 const byPart=new Map<number,Clip[]>();
 for(const clip of input.clips){
  const clips=byPart.get(clip.part)??[];
  clips.push(clip);
  byPart.set(clip.part,clips);
 }
 const key=options.providerKey??await getKey('openrouter');
 const parts=await Promise.all([...byPart].sort(([a],[b])=>a-b).map(([part,clips])=>assessPartWithRetry(part,clips,input.cueCard,key,options)));
 const reports=parts.map(p=>p.report);
 if(!parts.length||parts.some(p=>!p.model)){
  const failureCode=reports.some(p=>p.issues.some(i=>i.startsWith('missing_step:')||i.startsWith('empty_speech:')))
   ?'INCOMPLETE_ANSWER_COVERAGE':'SPEAKING_VALIDATION_FAILED';
  throw Object.assign(new Error('Speaking evaluation requires review'),{retryable:false,providerReport:{failureCode,model:speakingModel,parts:reports}});
 }
 const models=parts.map(p=>p.model!);
 const answers=models.flatMap(m=>m.answers);
 const byStep=new Map(answers.map(a=>[a.step,a]));
 const labels=new Map(input.clips.map((clip,i)=>[clip.step,i+1]));
 const rubric=(name:typeof criterionKeys[number])=>{
  const rated=models.flatMap(m=>m.criteria[name].band===null?[]:[m.criteria[name].band]);
  return {
   band:rated.length?Math.round(2*rated.reduce((sum,score)=>sum+score,0)/rated.length)/2:null,
   feedback:parts.map(p=>'Part '+p.report.part+': '+p.model!.criteria[name].reason).join(' '),
   evidence:models.flatMap(m=>m.criteria[name].evidence.map(e=>'Answer '+labels.get(e.step)+
    (e.timestamp_seconds===null?'':' · '+e.timestamp_seconds+'s')+': “'+e.quote+'” — '+e.reason)),
  };
 };
 const result=finalizeSpeaking({
  limitation:models.flatMap(m=>m.limitations).join(' '),
  confidence:models.some(m=>m.confidence==='low')?'low':models.every(m=>m.confidence==='high')?'high':'medium',
  transcripts:input.clips.map(c=>{const a=byStep.get(c.step)!;return {step:a.step,verbatim:a.verbatim,uncertain:a.uncertain};}),
  fluency:rubric('fluency_coherence'),lexicalResource:rubric('lexical_resource'),grammar:rubric('grammar'),pronunciation:rubric('pronunciation'),
  summary:parts.map(p=>'Part '+p.report.part+': '+p.model!.summary).join(' '),
  nextSteps:[...new Set(models.flatMap(m=>m.next_steps))].slice(0,3),
 },input);
 // A wholly silent or unintelligible part can have feedback but cannot support a full band.
 if(models.some(m=>!m.answers.some(a=>isSpeech(a.speech_status))))result.estimatedBand=null;
 result.assessmentDetails={answers,parts:parts.map(p=>({part:p.report.part,criteria:p.model!.criteria})),
  vocabulary:vocabularyProfile(parts.map(p=>({part:p.report.part,level:p.model!.vocabulary_level,texts:p.model!.answers.filter(a=>isSpeech(a.speech_status)).map(a=>a.verbatim)})))};
 const costs=reports.flatMap(r=>typeof r.rawResponse==='object'&&typeof r.rawResponse.usage?.cost==='number'?[r.rawResponse.usage.cost]:[]);
 return {result,usage:{promptVersion,reasoningEnabled:false,cost:costs.length===parts.length?costs.reduce((a,b)=>a+b,0):null,parts:reports},model:options.model??speakingModel};
}

export const assessSpeaking = assessSpeakingDirect;
