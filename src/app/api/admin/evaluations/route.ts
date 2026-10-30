import { NextRequest } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { hasAdminRole } from '@/lib/auth/policy';
import { requireSameOrigin,readBody,json,AuthHttpError,parseEmail,audit } from '@/lib/auth/http';
import { db } from '@/lib/auth/db';
import { products } from '@/lib/evaluation/store';
import { evaluationConfigured,writingModel } from '@/lib/evaluation/provider';
export async function GET(){const session=await readSession();if(!session||!hasAdminRole(session.user))return json({error:'Forbidden'},403);
 const grants=await db().query('SELECT u.email,g.product,g.monthly_limit,g.expires_at FROM public.evaluation_grants g JOIN app_auth.users u ON u.id=g.user_id ORDER BY g.updated_at DESC LIMIT 100');
 return json({configured:await evaluationConfigured(),model:writingModel,grants});}
export async function POST(req:NextRequest){try{
 const session=await readSession();if(!session||!hasAdminRole(session.user))throw new AuthHttpError(403,'Forbidden');requireSameOrigin(req);
 const d=await readBody(req),email=parseEmail(d.email);
 if(!['writing_product','speaking_product'].includes(String(d.product))||!(d.monthlyLimit===null||(Number.isInteger(d.monthlyLimit)&&Number(d.monthlyLimit)>=0&&Number(d.monthlyLimit)<=10000))||typeof d.expiresAt!=='string'||!Number.isFinite(Date.parse(d.expiresAt))||Date.parse(d.expiresAt)<=Date.now())throw new AuthHttpError(400,'Choose a product, valid allowance and future expiry.');
 const user=(await db().query('SELECT id FROM app_auth.users WHERE email=$1 AND banned=false',[email]))[0];if(!user)throw new AuthHttpError(404,'Account not found');
 await db().query('INSERT INTO public.evaluation_grants(user_id,product,monthly_limit,expires_at,updated_by) VALUES($1,$2,$3,$4::timestamptz,$5) ON CONFLICT(user_id,product) DO UPDATE SET monthly_limit=excluded.monthly_limit,expires_at=excluded.expires_at,updated_by=excluded.updated_by,updated_at=now()',[user.id,d.product,d.monthlyLimit,d.expiresAt,session.user.id]);
 await audit(session.user.id,'evaluation_grant_updated:'+d.product);
 return json({ok:true});
 }catch(e){return e instanceof AuthHttpError?json({error:e.message},e.status):json({error:'Unable to update evaluation access'},503)}}
