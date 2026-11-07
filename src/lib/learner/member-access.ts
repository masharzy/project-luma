import 'server-only';
import {cache} from 'react';
import {db} from '@/lib/auth/db';
import {normalizeAccess,type PlanAccess} from '@/lib/plan-access';
// The access of the member's current plan, or null without an active plan.
export const memberPlan=cache(async(userId:string|null):Promise<{access:PlanAccess;startsAt:string}|null>=>{
 if(!userId)return null;
 try{
  const rows=await db().query(`SELECT access,starts_at FROM public.evaluation_subscriptions WHERE user_id=$1::uuid AND status='active' AND starts_at<=now() AND expires_at>now() ORDER BY starts_at DESC LIMIT 1`,[userId]);
  return rows[0]?{access:normalizeAccess(rows[0].access),startsAt:String(rows[0].starts_at)}:null;
 }catch{return null;}
});
// Recent Tests the member opened since the plan started. Used for plans that allow a number of them.
export const attemptedRecent=cache(async(userId:string|null,since:string):Promise<Set<string>>=>{
 if(!userId)return new Set();
 try{
  const rows=await db().query(`SELECT DISTINCT a.parent_id::text AS id FROM public.exam_attempts a JOIN public.admin_content c ON c.id=a.parent_id WHERE a.user_id=$1::uuid AND a.kind='practice' AND c.kind='practice' AND c.book_slug IS NULL AND a.created_at>=$2::timestamptz`,[userId,since]);
  return new Set(rows.map(r=>String(r.id)));
 }catch{return new Set();}
});
// How many premium items of a resource category the member's plan opens (0 = none).
export async function premiumResourceLimit(userId:string|null,category:string):Promise<number>{
 const plan=await memberPlan(userId);if(!plan)return 0;
 const a=plan.access,n=(x:{mode:string;count?:number})=>x.mode==='all'?Infinity:x.mode==='count'?Number(x.count):0;
 if(category==='writing')return n(a.writingSamples);
 if(category==='vocabulary')return n(a.vocabulary);
 if(category==='ebook')return a.ebooks?Infinity:0;
 if(category==='grammar')return a.grammar?Infinity:0;
 return 0;
}
