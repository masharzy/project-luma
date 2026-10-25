import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { productUser,productError,uuid } from '@/lib/products/access';
import { membership,publicPlans,freePolicy } from '@/lib/products/plans';
import { db } from '@/lib/auth/db';
import { requireSameOrigin,readBody,json,AuthHttpError,limit,audit } from '@/lib/auth/http';
export async function GET(){try{const u=await productUser();const [account,plans,policy]=await Promise.all([membership(u.id),publicPlans(),freePolicy()]);return json({...account,plans,policy});}catch(e){return productError(e)}}
export async function POST(req:NextRequest){try{requireSameOrigin(req);const u=await productUser();await limit('membership-request:'+u.id,10,3600);const d=await readBody(req);
 if(d.action==='request'){if(!uuid(d.planId))throw new AuthHttpError(400,'Choose a plan');const rows=await db().query(`INSERT INTO public.evaluation_subscriptions(id,user_id,plan_id,plan_name,price_bdt,writing_limit,speaking_limit,status) SELECT $1,$2,id,name,price_bdt,writing_limit,speaking_limit,'pending' FROM public.evaluation_plans WHERE id=$3 AND published=true ON CONFLICT(user_id) WHERE status='pending' DO NOTHING RETURNING id`,[randomUUID(),u.id,d.planId]);if(!rows.length)throw new AuthHttpError(409,'A request is already pending, or this plan is no longer available.');await audit(u.id,'membership:requested:'+rows[0].id);}
 else if(d.action==='cancel'){if(!uuid(d.id))throw new AuthHttpError(400,'Invalid subscription');const rows=await db().query("UPDATE public.evaluation_subscriptions SET status='cancelled',updated_at=now(),updated_by=$2 WHERE id=$1 AND user_id=$2 AND status IN('pending','active') RETURNING id",[d.id,u.id]);if(!rows.length)throw new AuthHttpError(404,'Active subscription or request not found');await audit(u.id,'membership:cancelled:'+d.id);}
 else throw new AuthHttpError(400,'Invalid action');return json({ok:true});
 }catch(e){return productError(e)}}
