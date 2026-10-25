import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { db } from '@/lib/auth/db';
import { requireSameOrigin,readBody,json,AuthHttpError } from '@/lib/auth/http';
import { productError } from '@/lib/products/access';
import { normalizeSpeakingSet } from '@/lib/speaking/schema';
export async function PUT(req:NextRequest){try{const s=await readSession();if(!s||!hasAdminRole(s.user))throw new AuthHttpError(403,'Forbidden');requireSameOrigin(req);const d=await readBody(req,64000);if(d.kind!=='evaluation'||typeof d.id!=='string'||!/^\d{1,16}$/.test(d.id)||typeof d.published!=='boolean')throw new AuthHttpError(400,'Invalid Speaking test');let doc;try{doc=normalizeSpeakingSet(d.document);}catch{throw new AuthHttpError(400,'Check all source parts, questions and timing.');}const rows=await db().query('UPDATE public.speaking_sets SET document=$2::jsonb,published=$3,updated_by=$4,updated_at=now() WHERE id=$1 RETURNING id',[d.id,JSON.stringify(doc),d.published,s.user.id]);if(!rows[0])throw new AuthHttpError(404,'Test not found');return json({ok:true});}catch(e){return productError(e)}}
