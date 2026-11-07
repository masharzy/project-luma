import {NextRequest} from 'next/server';
import {randomUUID} from 'node:crypto';
import {readSession} from '@/lib/auth/session';
import {hasAdminRole} from '@/lib/auth/policy';
import {requireSameOrigin,readBody,json,AuthHttpError,audit,limit} from '@/lib/auth/http';
import {db} from '@/lib/auth/db';
import {uuid} from '@/lib/products/access';
import {grantScopes} from '@/lib/learner/content-grants';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
const products=['writing_product','speaking_product'];
const future=(v:unknown)=>{if(v===null||v===undefined||v==='')return null;const t=typeof v==='string'?Date.parse(v):NaN;if(!Number.isFinite(t)||t<=Date.now())throw new AuthHttpError(400,'Choose an end date in the future.');return new Date(t).toISOString();};
const quota=(v:unknown)=>{if(v===null)return null;if(typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<=10000)return v;throw new AuthHttpError(400,'Limit must be 0 to 10,000, or unlimited.');};
export async function POST(req:NextRequest,context:Context){
 try{
  const session=await readSession();
  if(!session?.user||!hasAdminRole(session.user))throw new AuthHttpError(403,'Administrator access required');
  requireSameOrigin(req);
  await limit('admin-access:'+session.user.id,120,3600);
  const {id}=await context.params;
  if(!uuid(id))throw new AuthHttpError(400,'Invalid user');
  const admin=session.user.id,d=await readBody(req),sql=db();
  const exists=(await sql.query('SELECT 1 FROM app_auth.users WHERE id=$1::uuid',[id])).length>0;
  if(!exists)throw new AuthHttpError(404,'Account not found');
  const action=String(d.action);
  if(action==='assign_plan'){
   if(!uuid(d.planId))throw new AuthHttpError(400,'Choose a plan');
   const days=Number(d.days);if(!Number.isInteger(days)||days<1||days>3660)throw new AuthHttpError(400,'Choose 1 to 3660 days.');
   const rows=await sql.query(`WITH target AS (SELECT u.id user_id,p.* FROM app_auth.users u CROSS JOIN public.evaluation_plans p WHERE u.id=$1::uuid AND u.banned=false AND p.id=$2),
    closed AS (UPDATE public.evaluation_subscriptions SET status='cancelled',updated_at=now(),updated_by=$4 WHERE status IN('active','pending') AND user_id IN(SELECT user_id FROM target) RETURNING id)
    INSERT INTO public.evaluation_subscriptions(id,user_id,plan_id,plan_name,price_bdt,writing_limit,speaking_limit,status,starts_at,expires_at,updated_by,duration_days,access)
    SELECT $3,user_id,id,name,price_bdt,writing_limit,speaking_limit,'active',now(),now()+($5::integer*interval '1 day'),$4,$5::integer,access FROM target WHERE (SELECT count(*) FROM closed)>=0 RETURNING id`,[id,d.planId,randomUUID(),admin,days]);
   if(!rows.length)throw new AuthHttpError(404,'Plan not found, or the account is blocked.');
   await audit(admin,'user_access:plan:'+id+':'+rows[0].id);
  }else if(action==='end_subscription'){
   if(!uuid(d.subscriptionId))throw new AuthHttpError(400,'Invalid subscription');
   const rows=await sql.query(`UPDATE public.evaluation_subscriptions SET status='cancelled',updated_at=now(),updated_by=$3 WHERE id=$1 AND user_id=$2::uuid AND status IN('active','pending') RETURNING id`,[d.subscriptionId,id,admin]);
   if(!rows.length)throw new AuthHttpError(409,'This subscription is already closed.');
   await audit(admin,'user_access:end_plan:'+id);
  }else if(action==='set_limit'){
   if(!products.includes(String(d.product)))throw new AuthHttpError(400,'Choose Writing or Speaking.');
   const monthly=quota(d.monthlyLimit),until=future(d.expiresAt);
   if(!until)throw new AuthHttpError(400,'Choose an end date for the override.');
   await sql.query('INSERT INTO public.evaluation_grants(user_id,product,monthly_limit,expires_at,updated_by) VALUES($1::uuid,$2,$3,$4::timestamptz,$5) ON CONFLICT(user_id,product) DO UPDATE SET monthly_limit=excluded.monthly_limit,expires_at=excluded.expires_at,updated_by=excluded.updated_by,updated_at=now()',[id,d.product,monthly,until,admin]);
   await audit(admin,'user_access:limit:'+id+':'+d.product);
  }else if(action==='clear_limit'){
   if(!products.includes(String(d.product)))throw new AuthHttpError(400,'Choose Writing or Speaking.');
   await sql.query('DELETE FROM public.evaluation_grants WHERE user_id=$1::uuid AND product=$2',[id,d.product]);
   await audit(admin,'user_access:clear_limit:'+id+':'+d.product);
  }else if(action==='reset_usage'){
   await sql.query(`DELETE FROM public.evaluation_usage WHERE user_id=$1::uuid AND period=date_trunc('month',now() AT TIME ZONE 'UTC')::date`,[id]);
   await audit(admin,'user_access:reset_usage:'+id);
  }else if(action==='grant_content'){
   if(!(grantScopes as readonly string[]).includes(String(d.scope)))throw new AuthHttpError(400,'Choose what to unlock.');
   const open=['all_premium','recent_all','more_books_all'].includes(String(d.scope));
   const ref=open?null:String(d.ref??'').trim().slice(0,120);
   if(!open&&!ref)throw new AuthHttpError(400,'Choose the item to unlock.');
   const until=future(d.expiresAt),note=typeof d.note==='string'&&d.note.trim()?d.note.trim().slice(0,200):null;
   await sql.query(`INSERT INTO public.user_content_grants(id,user_id,scope,ref,note,expires_at,created_by) VALUES($1,$2::uuid,$3,$4,$5,$6::timestamptz,$7)
    ON CONFLICT(user_id,scope,coalesce(ref,'')) DO UPDATE SET note=excluded.note,expires_at=excluded.expires_at,created_by=excluded.created_by,created_at=now()`,[randomUUID(),id,d.scope,ref,note,until,admin]);
   await audit(admin,'user_access:content:'+id+':'+d.scope+(ref?':'+ref:''));
  }else if(action==='revoke_content'){
   if(!uuid(d.grantId))throw new AuthHttpError(400,'Invalid grant');
   await sql.query('DELETE FROM public.user_content_grants WHERE id=$1 AND user_id=$2::uuid',[d.grantId,id]);
   await audit(admin,'user_access:revoke_content:'+id);
  }else if(action==='set_device_limit'){
   const n=d.deviceLimit===null?null:Number(d.deviceLimit);
   if(n!==null&&(!Number.isInteger(n)||n<1||n>20))throw new AuthHttpError(400,'Device limit must be 1 to 20, or the platform default.');
   await sql.query('UPDATE app_auth.users SET device_limit=$2,updated_at=now() WHERE id=$1::uuid',[id,n]);
   if(n!==null)await sql.query(`DELETE FROM app_auth.sessions WHERE user_id=$1::uuid AND token_hash IN(SELECT token_hash FROM app_auth.sessions WHERE user_id=$1::uuid AND expires_at>now() ORDER BY last_seen_at DESC OFFSET $2::integer)`,[id,n]);
   await audit(admin,'user_access:device_limit:'+id+':'+(n??'default'));
  }else if(action==='revoke_device'){
   if(typeof d.deviceId!=='string'||!/^[a-f0-9]{64}$/.test(d.deviceId))throw new AuthHttpError(400,'Invalid device');
   await sql.query("DELETE FROM app_auth.sessions WHERE user_id=$2::uuid AND encode(sha256(convert_to(token_hash,'UTF8')),'hex')=$1",[d.deviceId,id]);
   await audit(admin,'user_access:revoke_device:'+id);
  }else throw new AuthHttpError(400,'Invalid action');
  return json({ok:true});
 }catch(e){
  if(e instanceof AuthHttpError)return json({error:e.message},e.status);
  if((e as {code?:string}).code==='42P01'||(e as {code?:string}).code==='42703')return json({error:'The access tables are not set up yet. Run migration 036 first.'},503);
  return json({error:'Unable to update access'},503);
 }
}
