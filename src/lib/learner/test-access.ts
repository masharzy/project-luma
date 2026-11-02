import 'server-only';
import {cache} from 'react';
import {db} from '@/lib/auth/db';

// Use the same active subscription window as Premium mock registration.
export const hasPremiumTests=cache(async(userId:string|null)=>{
 if(!userId)return false;
 const rows=await db().query(`SELECT EXISTS(SELECT 1 FROM public.evaluation_subscriptions
 WHERE user_id=$1::uuid AND status='active' AND starts_at<=now() AND expires_at>now()) AS allowed`,[userId]);
 return rows[0]?.allowed===true;
});
export async function canOpenTest(access:string,userId:string|null){
 return access==='free'||(access==='premium'&&await hasPremiumTests(userId));
}
