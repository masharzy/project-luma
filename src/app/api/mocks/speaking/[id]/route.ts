import { NextRequest } from 'next/server';
import { productUser,productError } from '@/lib/products/access';
import { requireSameOrigin,json,AuthHttpError } from '@/lib/auth/http';
import { enqueueMockEvaluation } from '@/lib/exam/mock-evaluation';
import { advanceAttempt } from '@/lib/exam/attempts';
import { mockSpeakingContext,requireSpeakingWindow } from '@/lib/exam/mock-speaking';
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{requireSameOrigin(req);const u=await productUser(),id=(await params).id,context=await mockSpeakingContext(id,u.id);if(!context)throw new AuthHttpError(404,'Mock not found');if(!context.submitted){requireSpeakingWindow(context);await advanceAttempt(id,{action:'submit',index:3,answers:{}});}await enqueueMockEvaluation(id);return json({submitted:true});}catch(e){return productError(e)}}
