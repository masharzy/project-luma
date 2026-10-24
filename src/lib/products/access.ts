import 'server-only';
import { db } from '@/lib/auth/db';
import { readSession } from '@/lib/auth/session';
import { AuthHttpError,json } from '@/lib/auth/http';
export async function productUser(){const s=await readSession();if(!s)throw new AuthHttpError(401,'Sign in with a verified account to continue.');return s.user;}
export async function productAccess(userId:string,product:string){const r=(await db().query('SELECT monthly_limit FROM public.evaluation_grants WHERE user_id=$1 AND product=$2 AND expires_at>now()',[userId,product]))[0];if(!r)throw new AuthHttpError(403,'This evaluation product is not included in your access.','EVALUATION_ACCESS_REQUIRED');return r;}
export function productError(e:unknown){return e instanceof AuthHttpError?json({error:e.message,code:e.code},e.status):json({error:'Unable to complete this request. Your saved work is unchanged.'},503);}
export const uuid=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id);
