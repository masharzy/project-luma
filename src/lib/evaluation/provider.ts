import 'server-only';
import { writingSystemPrompt, assessmentPromptVersion } from './prompts';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, Output, type UserContent } from 'ai';
import { writingAssessmentSchema,finalizeAssessment,type WritingInput } from './schema';
export const writingModel='qwen3.7-flash';
export function evaluationConfigured(){return Boolean(process.env.DASHSCOPE_API_KEY&&process.env.QWEN_BASE_URL);}
export function qwenProvider(structured=true){
 if(!evaluationConfigured())throw Error('Evaluation provider is not configured');
 const url=new URL(process.env.QWEN_BASE_URL!);
 if(url.protocol!=='https:'||url.username||url.password||!/(^|\.)aliyuncs\.com$/.test(url.hostname))throw Error('Invalid provider endpoint');
 return createOpenAICompatible({name:'qwen',baseURL:url.href.replace(/\/$/,''),apiKey:process.env.DASHSCOPE_API_KEY,supportsStructuredOutputs:structured,supportedUrls:()=>({'image':[/^https:\/\//],'image/*':[/^https:\/\//]}),
  // JSON-schema output and bounded output are used without hidden thinking charges.
  transformRequestBody:body=>({...body,...(structured?{enable_thinking:false}:{reasoning_effort:'none'})})});
}
export async function assessWriting(input:WritingInput){
 if(!evaluationConfigured())throw Error('Evaluation provider is not configured');
 const provider=qwenProvider();
 const content:UserContent=[{type:'text',text:JSON.stringify({tasks:input.tasks.map(({image,...t})=>({...t,imageAttached:Boolean(image)}))})}];
 for(const task of input.tasks)if(task.image){content.push({type:'text',text:'Reference image for Writing Task '+task.task});
  // Leave remote image downloading to the provider. Never fetch arbitrary admin URLs on our server.
  content.push({type:'file',mediaType:'image',data:task.image.startsWith('data:')?task.image:new URL(task.image)});}
 const result=await generateText({model:provider.chatModel(writingModel),maxOutputTokens:4000,maxRetries:0,abortSignal:AbortSignal.timeout(90000),
  output:Output.object({schema:writingAssessmentSchema}),
  system:writingSystemPrompt,
  messages:[{role:'user',content}]});
 return {result:finalizeAssessment(result.output,input),usage:{...result.usage,promptVersion:assessmentPromptVersion},model:writingModel};
}
