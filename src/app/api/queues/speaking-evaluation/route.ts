import { handleCallback } from '@vercel/queue';
import { processSpeaking } from '@/lib/products/speaking-worker';
export const runtime='nodejs';export const maxDuration=1800;
const callback=handleCallback(async(message:unknown)=>{if(!message||typeof message!=='object'||!('id'in message)||typeof message.id!=='string')throw Error('Invalid message');await processSpeaking(message.id);},{visibilityTimeoutSeconds:1860,retry:()=>({afterSeconds:1870})});
export async function POST(req:Request){return callback(req);}
