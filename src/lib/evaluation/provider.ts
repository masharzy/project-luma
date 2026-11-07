import 'server-only';
import { z } from 'zod';
import { getKey, keyStatus } from '@/lib/ai-lab/secrets';
import { writingSystemPrompt, assessmentPromptVersion } from './prompts';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, Output, type UserContent } from 'ai';
import { writingAssessmentSchema,writingResponseSchema,finalizeAssessment,type WritingInput } from './schema';
// Task 1 always carries a chart image, so the evaluation model must accept images.
// DeepSeek V4 Flash is text-only (404 from OpenRouter with an image part), so it cannot be used.
// Gemini 3.1 Flash-Lite won the Task 1 (chart image) and Task 2 benchmark on 2026-11-07.
export const writingModel='google/gemini-3.1-flash-lite';
// Task generation was not benchmarked with the evaluation model; keep it on its previous model.
export const taskModel='qwen/qwen3.7-flash';
export { speakingModel } from '@/lib/products/speaking-model';
export async function evaluationConfigured(){
 try {const status=await keyStatus();return status.openrouter&&(Boolean(process.env.OPENROUTER_API_KEY)||status.vaultReady);}catch{return false;}
}
export async function evaluationProvider(){
 const apiKey=await getKey('openrouter');
 return createOpenAICompatible({name:'openrouter',baseURL:'https://openrouter.ai/api/v1',apiKey,
  supportsStructuredOutputs:false,supportedUrls:()=>({'image':[/^https:\/\//],'image/*':[/^https:\/\//]}),
  transformRequestBody:body=>({...body,reasoning:{enabled:false},provider:{allow_fallbacks:false,require_parameters:true}})});
}
export async function assessWriting(input:WritingInput){
 if(!await evaluationConfigured())throw Error('Evaluation provider is not configured');
 const provider=await evaluationProvider();
 const content:UserContent=[{type:'text',text:JSON.stringify({tasks:input.tasks.map(({image,...t})=>({...t,imageAttached:Boolean(image)}))})}];
 for(const task of input.tasks)if(task.image){content.push({type:'text',text:'Reference image for Writing Task '+task.task});
  // Leave remote image downloading to the provider. Never fetch arbitrary admin URLs on our server.
  content.push({type:'file',mediaType:'image',data:task.image.startsWith('data:')?task.image:new URL(task.image)});}
 const result=await generateText({model:provider.chatModel(writingModel),maxOutputTokens:4000,maxRetries:0,abortSignal:AbortSignal.timeout(90000),
  output:Output.object({schema:writingResponseSchema}),
  system:writingSystemPrompt+`\nRequired JSON schema: ${JSON.stringify(z.toJSONSchema(writingAssessmentSchema))}`,
  messages:[{role:'user',content}]});
 return {result:finalizeAssessment(result.output,input),usage:{...result.usage,promptVersion:assessmentPromptVersion},model:writingModel};
}
