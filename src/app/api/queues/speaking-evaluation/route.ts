import { handleCallback } from '@vercel/queue';
import { processSpeaking } from '@/lib/products/speaking-worker';
export const runtime='nodejs';
// Same in-process path as the mock Speaking evaluation (Gemini parts in parallel, ~10–30 s in production).
export const maxDuration=300;
/**
 * Optional external worker (Render/VPS). It is used only when it is fully configured and accepts the job;
 * otherwise the job runs here. Before, a missing SPEAKING_WORKER_TOKEN or a sleeping/down worker made every
 * delivery throw, so standalone Speaking jobs stayed "pending" forever. Claims are atomic in Neon, so a job
 * the worker did accept is never paid for twice.
 */
async function handOff(id:string){
 const url=process.env.SPEAKING_WORKER_URL,token=process.env.SPEAKING_WORKER_TOKEN;
 if(!url)return false;
 if(!token||token.length<32){console.error('Speaking worker URL is set without a valid SPEAKING_WORKER_TOKEN; evaluating on Vercel');return false;}
 try{
  const target=new URL(url);
  if(target.protocol!=='https:'||target.username||target.password)throw Error('Invalid external Speaking worker URL');
  const response=await fetch(new URL('/jobs',target),{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({id}),redirect:'error',signal:AbortSignal.timeout(20000)});
  if(response.ok)return true;
  console.error('Speaking worker handoff failed; evaluating on Vercel',{status:response.status});
 }catch(error){console.error('Speaking worker unreachable; evaluating on Vercel',{name:(error as Error)?.name});}
 return false;
}
const callback=handleCallback(async(message:unknown)=>{
 if(!message||typeof message!=='object'||!('id'in message)||typeof message.id!=='string')throw Error('Invalid message');
 if(await handOff(message.id))return;
 await processSpeaking(message.id);
},{visibilityTimeoutSeconds:360,retry:()=>({afterSeconds:370})});
export async function POST(req:Request){return callback(req);}
