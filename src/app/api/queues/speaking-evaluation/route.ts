import { handleCallback } from '@vercel/queue';
import { processSpeaking } from '@/lib/products/speaking-worker';
export const runtime='nodejs'; // Use the hosting plan's execution duration; no application request deadline.
const callback=handleCallback(async(message:unknown)=>{if(!message||typeof message!=='object'||!('id'in message)||typeof message.id!=='string')throw Error('Invalid message');await processSpeaking(message.id);},{visibilityTimeoutSeconds:360,retry:()=>({afterSeconds:370})});
export async function POST(req:Request){return callback(req);}
