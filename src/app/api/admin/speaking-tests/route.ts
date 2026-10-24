import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { db } from '@/lib/auth/db';
import { requireSameOrigin,readBody,json,AuthHttpError } from '@/lib/auth/http';
import { productError } from '@/lib/products/access';
export async function POST(req:NextRequest){try{const s=await readSession();if(!s||!hasAdminRole(s.user))throw new AuthHttpError(403,'Forbidden');requireSameOrigin(req);const d=await readBody(req);if(typeof d.title!=='string'||!d.title.trim()||d.title.length>180||!Number.isInteger(d.minutes)||Number(d.minutes)<5||Number(d.minutes)>60)throw new AuthHttpError(400,'Use a title and 5–60 total minutes.');const rows=await db().query('INSERT INTO public.speaking_sets(title,minutes,updated_by) VALUES($1,$2,$3) RETURNING id',[d.title.trim(),d.minutes,s.user.id]);return json({id:String(rows[0].id)},201);}catch(e){return productError(e)}}
