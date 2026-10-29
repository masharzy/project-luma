import { handleCallback } from '@vercel/queue';
import { deliverMockReminder } from '@/lib/exam/mock-reminders';
export const runtime='nodejs';export const maxDuration=60;
const callback=handleCallback(async(message:unknown)=>{if(!message||typeof message!=='object')throw Error('Invalid reminder');const m=message as Record<string,unknown>;if(typeof m.mockId!=='string'||!/^\d{1,16}$/.test(m.mockId)||typeof m.userId!=='string'||!/^[a-f0-9-]{36}$/.test(m.userId))throw Error('Invalid reminder');await deliverMockReminder(m.mockId,m.userId);},{visibilityTimeoutSeconds:120,retry:()=>({afterSeconds:120})});
export async function POST(request:Request){return callback(request);}
