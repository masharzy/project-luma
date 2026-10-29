import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { json,AuthHttpError,requireSameOrigin,readBody,audit } from '@/lib/auth/http';
import { prepareMock,mockAdminResults,markMockWriting,publishMock } from '@/lib/exam/mock-events';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
async function admin(){const s=await readSession();if(!s||!hasAdminRole(s.user))throw new AuthHttpError(403,'Forbidden');return s.user;}
const failure=(e:unknown)=>e instanceof AuthHttpError?json({error:e.message},e.status):json({error:'Unable to update this mock.'},503);
export async function GET(_:Request,c:Context){try{await admin();return json(await mockAdminResults((await c.params).id));}catch(e){return failure(e)}}
export async function POST(req:NextRequest,c:Context){try{const u=await admin();requireSameOrigin(req);const id=(await c.params).id;if(!/^\d{1,16}$/.test(id))throw new AuthHttpError(400,'Invalid mock');const d=await readBody(req);
 if(d.action==='prepare')await prepareMock(id,u.id);
 else if(d.action==='publish')await publishMock(id);
 else if(d.action==='grade'){if(typeof d.attemptId!=='string'||!/^[a-f0-9-]{36}$/.test(d.attemptId)||typeof d.band!=='number'||typeof d.feedback!=='string')throw new AuthHttpError(400,'Invalid grade');await markMockWriting(id,d.attemptId,d.band,d.feedback);}
 else throw new AuthHttpError(400,'Invalid action');
 await audit(u.id,'mock:'+id+':'+String(d.action));return json({ok:true});}catch(e){return failure(e)}}
