import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { db } from '@/lib/auth/db';
import { speakingAttempt } from '@/lib/products/speaking';
import { storageConfigured } from '@/lib/products/storage';
import { normalizeSpeakingSet } from '@/lib/speaking/schema';
import { renderSpeakingRoom } from '@/lib/speaking/render';
import { productError } from '@/lib/products/access';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const user=(await readSession())?.user;if(!user)return Response.redirect(new URL('/auth/sign-in',req.url));const {id}=await params;const a=await speakingAttempt(id,user.id);if(a.status==='submitted')return Response.redirect(new URL('/speaking-evaluation/results/'+id,req.url));const nonce=req.headers.get('x-nonce');if(!nonce)throw Error('Nonce missing');const clips=await db().query('SELECT step FROM public.speaking_recordings WHERE attempt_id=$1',[id]);return new Response(await renderSpeakingRoom('evaluation',id,normalizeSpeakingSet(a.snapshot),nonce,false,Number(a.minutes),{savedSteps:clips.map(c=>Number(c.step)),storageReady:storageConfigured()}),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Permissions-Policy':'camera=(), microphone=(self), geolocation=()'}});}catch(e){return productError(e)}}
