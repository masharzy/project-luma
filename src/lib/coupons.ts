import 'server-only';
import {db} from '@/lib/auth/db';
import {AuthHttpError} from '@/lib/auth/http';
export type Quote={planId:string;listPrice:number;discount:number;total:number;coupon:{code:string;kind:'percent'|'fixed';value:number}|null};
export const normalizeCode=(v:unknown)=>typeof v==='string'?v.trim().toUpperCase().slice(0,40):'';
// Prices are always computed here, never taken from the browser.
export async function quoteFor(planId:string,userId:string,rawCode?:unknown):Promise<Quote>{
 const plan=(await db().query('SELECT price_bdt FROM public.evaluation_plans WHERE id=$1 AND published=true',[planId]))[0];
 if(!plan)throw new AuthHttpError(404,'This plan is no longer available.');
 const listPrice=Number(plan.price_bdt),code=normalizeCode(rawCode);
 if(!code)return {planId,listPrice,discount:0,total:listPrice,coupon:null};
 const c=(await db().query(`SELECT code,kind,value,plan_id::text AS plan_id,max_uses,expires_at,active,
  (SELECT count(*)::int FROM public.evaluation_subscriptions s WHERE s.coupon_code=c.code AND s.status<>'rejected' AND NOT(s.status='cancelled' AND s.starts_at IS NULL)) AS used,
  EXISTS(SELECT 1 FROM public.evaluation_subscriptions s WHERE s.coupon_code=c.code AND s.user_id=$1::uuid AND s.status<>'rejected' AND NOT(s.status='cancelled' AND s.starts_at IS NULL)) AS used_by_me
  FROM public.coupons c WHERE c.code=$2`,[userId,code]))[0];
 // One message for every failure, so codes cannot be probed.
 const bad=new AuthHttpError(400,'This code is not valid for this plan.');
 if(!c||!c.active||(c.plan_id&&c.plan_id!==planId)||(c.expires_at&&new Date(String(c.expires_at)).getTime()<=Date.now())||(c.max_uses!==null&&Number(c.used)>=Number(c.max_uses))||c.used_by_me)throw bad;
 const discount=c.kind==='percent'?Math.floor(listPrice*Number(c.value)/100):Math.min(Number(c.value),listPrice);
 return {planId,listPrice,discount,total:listPrice-discount,coupon:{code:String(c.code),kind:c.kind as 'percent'|'fixed',value:Number(c.value)}};
}
