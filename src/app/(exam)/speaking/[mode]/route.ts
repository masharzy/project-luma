import { NextRequest } from 'next/server';
import { renderSpeakingRoom } from '@/lib/speaking/render';
import { publishedSpeakingSet,speakingDuration } from '@/lib/speaking/store';
import { readSession } from '@/lib/auth/session';
import type { SpeakingMode } from '@/lib/speaking/schema';
import { AuthHttpError,json } from '@/lib/auth/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest,{params}:{params:Promise<{mode:string}>}){try{
 const {mode}=await params;if(!['practice','cambridge','mock'].includes(mode))return json({error:'Not found'},404);
 if(mode==='mock'&&!await readSession())return Response.redirect(new URL('/auth/sign-in',req.url));
 const id=req.nextUrl.searchParams.get('test')||'';const set=await publishedSpeakingSet(mode as SpeakingMode,id);
 const nonce=req.headers.get('x-nonce');if(!nonce)throw Error('Missing security nonce');
 return new Response(await renderSpeakingRoom(mode as SpeakingMode,id,set,nonce,false,await speakingDuration(mode as SpeakingMode,id)),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Permissions-Policy':'camera=(), microphone=(self), geolocation=()'}});
 }catch(e){if(e instanceof AuthHttpError)return json({error:e.message},e.status);console.error('Speaking room unavailable');return json({error:'Speaking room unavailable'},503)}}
