import { handleCallback } from '@vercel/queue';
import { processMockEvaluation } from '@/lib/exam/mock-evaluation';
export const runtime='nodejs';
export const maxDuration=120;
const callback=handleCallback(async(message:unknown)=>{
 if(!message||typeof message!=='object'||!('attemptId' in message)||typeof message.attemptId!=='string')throw Error('Invalid queue message');
 await processMockEvaluation(message.attemptId,'module' in message&&message.module==='speaking'?'speaking':'writing');
},{visibilityTimeoutSeconds:180,retry:()=>({afterSeconds:190})});
export async function POST(request:Request){return callback(request);}
