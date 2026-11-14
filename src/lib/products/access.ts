import 'server-only';
import { db } from '@/lib/auth/db';
import { readSession } from '@/lib/auth/session';
import { AuthHttpError,json } from '@/lib/auth/http';
export async function productUser(){const s=await readSession();if(!s)throw new AuthHttpError(401,'Sign in with a verified account to continue.');return s.user;}
export async function productAccess(userId:string,product:string){const r=(await db().query('SELECT monthly_limit FROM public.evaluation_allowance($1::uuid,$2::text)',[userId,product]))[0];if(!r||r.monthly_limit===0)throw new AuthHttpError(403,'This evaluation product is not included in your access.','EVALUATION_ACCESS_REQUIRED');return r;}
export function productError(e:unknown){if(e instanceof AuthHttpError)return json({error:e.message,code:e.code},e.status);
 // Unexpected failures were silent before; log the kind of failure (no request data, no secrets) so uploads and evaluations can be diagnosed.
 const err=e as {name?:string;message?:string;code?:string;$metadata?:{httpStatusCode?:number}};console.error('Product request failed',{name:err?.name,code:err?.code,status:err?.$metadata?.httpStatusCode,message:String(err?.message||'').slice(0,200)});
 return json({error:'Unable to complete this request. Your saved work is unchanged.'},503);}
export const uuid=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
