import { handleCallback } from '@vercel/queue';
import { processSpeaking } from '@/lib/products/speaking-worker';
export const runtime='nodejs'; // Use the hosting plan's execution duration; no application request deadline.
const callback=handleCallback(async(message:unknown)=>{if(!message||typeof message!=='object'||!('id'in message)||typeof message.id!=='string')throw Error('Invalid message');if(process.env.SPEAKING_WORKER_URL){
 const target=new URL(process.env.SPEAKING_WORKER_URL);
 if(target.protocol!=='https:'||target.username||target.password)throw Error('Invalid external Speaking worker URL');
 const token=process.env.SPEAKING_WORKER_TOKEN;if(!token||token.length<32)throw Error('External Speaking worker token missing');
 const response=await fetch(new URL('/jobs',target),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({id:message.id}),redirect:'error'});
 if(!response.ok)throw Error('External Speaking worker handoff failed');
 return;
 }await processSpeaking(message.id);},{visibilityTimeoutSeconds:360,retry:()=>({afterSeconds:370})});
export async function POST(req:Request){return callback(req);}
