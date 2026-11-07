import {NextRequest} from 'next/server';
import {readSession} from '@/lib/auth/session';
import {hasAdminRole} from '@/lib/auth/policy';
import {requireSameOrigin,readBody,json,AuthHttpError,audit,limit} from '@/lib/auth/http';
import {db} from '@/lib/auth/db';
export const runtime='nodejs';
// Platform default for how many devices one account can stay signed in on. null = unlimited.
export async function POST(req:NextRequest){
 try{
  const session=await readSession();
  if(!session?.user||!hasAdminRole(session.user))throw new AuthHttpError(403,'Administrator access required');
  requireSameOrigin(req);
  await limit('admin-settings:'+session.user.id,60,3600);
  const d=await readBody(req);
  const v=d.deviceLimit;
  if(v!==null&&!(typeof v==='number'&&Number.isInteger(v)&&v>=1&&v<=20))throw new AuthHttpError(400,'Choose 1 to 20 devices, or unlimited.');
  await db().query(`INSERT INTO public.evaluation_policy(id,default_device_limit,updated_at) VALUES(true,$1,now()) ON CONFLICT(id) DO UPDATE SET default_device_limit=excluded.default_device_limit,updated_at=now()`,[v]);
  await audit(session.user.id,'settings:default_devices:'+(v===null?'unlimited':v));
  return json({ok:true});
 }catch(e){
  if(e instanceof AuthHttpError)return json({error:e.message},e.status);
  return json({error:'Could not save this setting.'},500);
 }
}
