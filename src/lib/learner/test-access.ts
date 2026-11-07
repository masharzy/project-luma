import 'server-only';
import {cache} from 'react';
import {db} from '@/lib/auth/db';
import {grantCovers,type ContentGrant,type TestPlace} from './content-grants';

// Use the same active subscription window as Premium mock registration.
export const hasPremiumTests=cache(async(userId:string|null)=>{
 if(!userId)return false;
 const rows=await db().query(`SELECT EXISTS(SELECT 1 FROM public.evaluation_subscriptions
 WHERE user_id=$1::uuid AND status='active' AND starts_at<=now() AND expires_at>now()) AS allowed`,[userId]);
 return rows[0]?.allowed===true;
});
// Grants given by an admin to one account. A missing table (migration not applied yet) means no grants.
export const activeGrants=cache(async(userId:string|null):Promise<ContentGrant[]>=>{
 if(!userId)return [];
 try{return (await db().query(`SELECT scope,ref FROM public.user_content_grants WHERE user_id=$1::uuid AND (expires_at IS NULL OR expires_at>now())`,[userId])) as ContentGrant[];}catch{return [];}
});
export async function canOpenTest(access:string,userId:string|null,test?:Pick<TestPlace,'kind'|'id'>){
 if(access==='free')return true;
 if(access!=='premium'||!userId)return false;
 if(await hasPremiumTests(userId))return true;
 if(!test)return false;
 const grants=await activeGrants(userId);
 if(!grants.length)return false;
 const rows=test.kind==='cambridge'
  ?await db().query('SELECT book_number::text AS book FROM public.cambridge_tests WHERE id=$1::bigint',[test.id])
  :await db().query("SELECT book_slug AS book FROM public.admin_content WHERE id=$1::bigint AND kind='practice'",[test.id]);
 return grantCovers(grants,{...test,book:(rows[0]?.book as string|null)??null});
}
