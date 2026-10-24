import { handleCallback } from '@vercel/queue';
import { processWritingEvaluation } from '@/lib/evaluation/worker';
export const runtime='nodejs';
export const maxDuration=120;
const callback=handleCallback(async(message:unknown)=>{
 if(!message||typeof message!=='object'||!('id' in message)||typeof message.id!=='string')throw Error('Invalid queue message');
 await processWritingEvaluation(message.id);
},{visibilityTimeoutSeconds:180,retry:()=>({afterSeconds:190})});
export async function POST(request:Request){return callback(request);}
