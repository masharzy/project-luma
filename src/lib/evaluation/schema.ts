import { z } from 'zod';
const band=z.number().min(0).max(9).multipleOf(0.5);
const criterion=z.object({band,evidence:z.array(z.string().max(1000)).max(5),feedback:z.string().max(2000)});
export const writingAssessmentSchema=z.object({
 tasks:z.array(z.object({task:z.number().int().min(1).max(2),scorable:z.boolean(),limitation:z.string().max(1000),
  taskAchievement:criterion,coherence:criterion,lexicalResource:criterion,grammar:criterion,
  corrections:z.array(z.object({original:z.string().max(500),improved:z.string().max(1000),reason:z.string().max(1000),category:z.enum(['grammar','word_choice','clarity','coherence','task_response']).optional()})).max(8),
  strengths:z.array(z.object({original:z.string().max(500),reason:z.string().max(1000)})).max(3).optional(),
  nextSteps:z.array(z.string().max(1000)).max(3)
 })).min(1).max(2),summary:z.string().max(2000)
});
// Providers may omit a limitation when none applies; keep the stored result canonical.
export const writingResponseSchema=writingAssessmentSchema.extend({tasks:z.array(writingAssessmentSchema.shape.tasks.element.extend({limitation:z.string().max(1000).nullish()})).min(1).max(2)});
export type WritingInput={tasks:{task:number;question:string;answer:string;image:string|null}[]};
export type WritingAssessment=z.infer<typeof writingAssessmentSchema> & {estimatedBand:number|null};
export function finalizeAssessment(value:unknown,input:WritingInput):WritingAssessment {
 const wire=writingResponseSchema.parse(value);
 const result=writingAssessmentSchema.parse({...wire,tasks:wire.tasks.map(t=>({...t,limitation:t.limitation??''}))});
 if(result.tasks.length!==input.tasks.length||new Set(result.tasks.map(t=>t.task)).size!==result.tasks.length||result.tasks.some(t=>!input.tasks.some(p=>p.task===t.task)))throw Error('Assessment task mismatch');
 for(const task of result.tasks){const answer=input.tasks.find(p=>p.task===task.task)!.answer;for(const correction of task.corrections){if(!correction.original.trim()||!answer.includes(correction.original))throw Error('Unsupported correction');}for(const strength of task.strengths??[]){if(!strength.original.trim()||!answer.includes(strength.original))throw Error('Unsupported positive evidence');}}
 // Never trust a model-calculated combined band. Task 2 has twice the weight.
 const scorable=result.tasks.every(t=>t.scorable);
 const total=result.tasks.reduce((n,t)=>n+(t.task===2?2:1)*(t.taskAchievement.band+t.coherence.band+t.lexicalResource.band+t.grammar.band)/4,0);
 const weight=result.tasks.reduce((n,t)=>n+(t.task===2?2:1),0);
 return {...result,estimatedBand:scorable?Math.round(total/weight*2)/2:null};
}
