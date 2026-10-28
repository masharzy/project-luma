import 'server-only';
import { speakingSystemPrompt, assessmentPromptVersion } from '@/lib/evaluation/prompts';
import { z } from 'zod';
import { generateText,Output,type UserContent } from 'ai';
import { evaluationProvider, speakingModel } from '@/lib/evaluation/provider';
import { getPrivate } from './storage';
const criterion=z.object({band:z.number().min(0).max(9).multipleOf(.5),feedback:z.string().max(2000),evidence:z.array(z.string().max(800)).max(5)});
export const speakingAssessmentSchema=z.object({scorable:z.boolean(),limitation:z.string().max(1000),confidence:z.enum(['low','medium','high']),transcripts:z.array(z.object({step:z.number().int(),verbatim:z.string().max(8000),uncertain:z.array(z.string().max(200)).max(10)})).max(40),fluency:criterion,lexicalResource:criterion,grammar:criterion,pronunciation:criterion,summary:z.string().max(2000),nextSteps:z.array(z.string().max(1000)).max(4)});
export type SpeakingInput={sourceParts?:unknown[]|null;expected:number;cueCard:unknown;clips:{step:number;part:number;question:string;seconds:number;key:string}[]};
export type SpeakingAssessment=z.infer<typeof speakingAssessmentSchema>&{estimatedBand:number|null};
export function finalizeSpeaking(raw:unknown,input:SpeakingInput):SpeakingAssessment {
 const r=speakingAssessmentSchema.parse(raw);
 if(r.transcripts.length!==input.clips.length||new Set(r.transcripts.map(t=>t.step)).size!==r.transcripts.length||r.transcripts.some(t=>!input.clips.some(c=>c.step===t.step)))throw Error('Transcript does not match recordings');
 const sourceCount=input.sourceParts?.length||3,requiredParts=Array.from({length:sourceCount},(_,i)=>i+1);
 const complete=input.clips.length===input.expected&&requiredParts.every(p=>input.clips.some(c=>c.part===p))&&input.clips.reduce((n,c)=>n+c.seconds,0)>=60;
 const hasSpeech=r.transcripts.some(t=>t.verbatim.trim().length>0);
 const hasEvidence=[r.fluency,r.lexicalResource,r.grammar,r.pronunciation].every(c=>c.evidence.some(e=>e.trim().length>0));
 const scorable=r.scorable&&hasSpeech&&hasEvidence;
 const reliable=scorable&&r.confidence!=='low';
 const formatNote=sourceCount!==3?'Source-format practice with '+sourceCount+' parts; a standard three-part IELTS band is not estimated. ':complete?'':'Partial performance: a full-test band cannot be estimated reliably. ';
 const evidenceNote=!reliable?'Insufficient or low-confidence evidence: an overall band is withheld. ':'';
 return {...r,scorable,estimatedBand:reliable&&complete&&sourceCount===3?Math.round((r.fluency.band+r.lexicalResource.band+r.grammar.band+r.pronunciation.band)/4*2)/2:null,limitation:formatNote+evidenceNote+r.limitation};
}
export async function assessSpeaking(input:SpeakingInput){const content:UserContent=[{type:'text',text:JSON.stringify({sourceParts:input.sourceParts,cueCard:input.cueCard,answers:input.clips.map(({key,...c})=>c),expectedAnswers:input.expected})}];for(const clip of input.clips){const bytes=await getPrivate(clip.key);if(bytes.length>3900000)throw Error('Recording too large');content.push({type:'text',text:'Original recording for step '+clip.step+' / Part '+clip.part},{type:'file',mediaType:'audio/wav',data:bytes});}
 const result=await generateText({model:(await evaluationProvider()).chatModel(speakingModel),maxOutputTokens:7000,maxRetries:0,abortSignal:AbortSignal.timeout(90000),output:Output.object({schema:speakingAssessmentSchema}),system:speakingSystemPrompt+`\nRequired JSON schema: ${JSON.stringify(z.toJSONSchema(speakingAssessmentSchema))}`,messages:[{role:'user',content}]});return {result:finalizeSpeaking(result.output,input),usage:{...result.usage,promptVersion:assessmentPromptVersion},model:speakingModel};}
