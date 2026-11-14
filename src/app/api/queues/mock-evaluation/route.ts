import { handleCallback } from '@vercel/queue';
import { processMockEvaluation } from '@/lib/exam/mock-evaluation';
export const runtime='nodejs';
export const maxDuration=300;
const callback=handleCallback(async(message:unknown)=>{
 if(!message||typeof message!=='object'||!('attemptId' in message)||typeof message.attemptId!=='string')throw Error('Invalid queue message');
 const module='module' in message&&(message.module==='speaking'||message.module==='settle')?message.module:'writing';
 await processMockEvaluation(message.attemptId,module);
},{visibilityTimeoutSeconds:360,retry:()=>({afterSeconds:370})});
export async function POST(request:Request){return callback(request);}
