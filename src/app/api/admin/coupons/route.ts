import {NextRequest} from 'next/server';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {readSession} from '@/lib/auth/session';
import {hasAdminRole} from '@/lib/auth/policy';
import {requireSameOrigin,readBody,json,AuthHttpError,audit,limit} from '@/lib/auth/http';
import {db} from '@/lib/auth/db';
import {uuid} from '@/lib/products/access';
export const runtime='nodejs';
const create=z.object({
 code:z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/),
 kind:z.enum(['percent','fixed']),
 value:z.number().int().min(1).max(100000),
 planId:z.uuid().nullable(),
 maxUses:z.number().int().min(1).max(1000000).nullable(),
 expiresAt:z.string().nullable(),
 note:z.string().trim().max(200).nullable().optional(),
}).strict().refine(c=>c.kind!=='percent'||c.value<=100,{message:'percent'});
export async function POST(req:NextRequest){
 try{
  const session=await readSession();
  if(!session?.user||!hasAdminRole(session.user))throw new AuthHttpError(403,'Administrator access required');
  requireSameOrigin(req);
  await limit('admin-coupons:'+session.user.id,60,3600);
  const d=await readBody(req),sql=db();
  if(d.action==='create'){
   const c=create.parse(d.coupon);
   const until=c.expiresAt?Date.parse(c.expiresAt):null;
   if(c.expiresAt&&(!Number.isFinite(until)||(until as number)<=Date.now()))throw new AuthHttpError(400,'Choose an expiry date in the future.');
   try{
    await sql.query('INSERT INTO public.coupons(id,code,kind,value,plan_id,max_uses,expires_at,note,created_by) VALUES($1,$2,$3,$4,$5,$6,$7::timestamptz,$8,$9)',[randomUUID(),c.code,c.kind,c.value,c.planId,c.maxUses,c.expiresAt,c.note||null,session.user.id]);
   }catch(e){if((e as {code?:string}).code==='23505')throw new AuthHttpError(409,'This code already exists.');throw e;}
   await audit(session.user.id,'coupon:create:'+c.code);
  }else if(d.action==='toggle'){
   if(!uuid(d.id))throw new AuthHttpError(400,'Invalid coupon');
   const rows=await sql.query('UPDATE public.coupons SET active=$2 WHERE id=$1 RETURNING code',[d.id,d.active===true]);
   if(!rows.length)throw new AuthHttpError(404,'Coupon not found');
   await audit(session.user.id,'coupon:'+(d.active===true?'enable':'disable')+':'+rows[0].code);
  }else if(d.action==='delete'){
   if(!uuid(d.id))throw new AuthHttpError(400,'Invalid coupon');
   const rows=await sql.query('DELETE FROM public.coupons WHERE id=$1 RETURNING code',[d.id]);
   if(!rows.length)throw new AuthHttpError(404,'Coupon not found');
   await audit(session.user.id,'coupon:delete:'+rows[0].code);
  }else throw new AuthHttpError(400,'Invalid action');
  return json({ok:true});
 }catch(e){
  if(e instanceof AuthHttpError)return json({error:e.message},e.status);
  if(e instanceof Error&&e.name==='ZodError')return json({error:'Code: 3–40 letters, numbers, - or _. Percent: 1–100. Fixed: whole BDT.'},400);
  return json({error:'Could not save the coupon.'},500);
 }
}
