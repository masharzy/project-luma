import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { requireSameOrigin,readBody,json,AuthHttpError,audit } from '@/lib/auth/http';
import { mockBuilderData,saveMockBuilder } from '@/lib/exam/mock-builder';
async function admin(){const s=await readSession();if(!s||!hasAdminRole(s.user))throw new AuthHttpError(403,'Forbidden');return s.user;}
const fail=(e:unknown)=>e instanceof AuthHttpError?json({error:e.message},e.status):json({error:'Unable to save this mock. Please retry.'},503);
export async function GET(){try{await admin();return json(await mockBuilderData());}catch(e){return fail(e);}}
export async function POST(req:NextRequest){try{const u=await admin();requireSameOrigin(req);const result=await saveMockBuilder(await readBody(req,64000),u.id);await audit(u.id,'mock-builder:'+result.id);return json(result);}catch(e){return fail(e);}}
