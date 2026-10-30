import {NextRequest} from "next/server";
import {readSession} from "@/lib/auth/session";
import {hasAdminRole} from "@/lib/auth/policy";
import {requireSameOrigin,readBody,json,AuthHttpError,audit,limit} from "@/lib/auth/http";
import {db} from "@/lib/auth/db";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
export async function POST(req:NextRequest,context:Context){
 try{
  const session=await readSession();
  if(!session?.user||!hasAdminRole(session.user))throw new AuthHttpError(403,"Administrator access required");
  requireSameOrigin(req);
  await limit("admin-user-action:"+session.user.id,40,3600);
  const {id}=await context.params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new AuthHttpError(400,"Invalid user");
  if(id===session.user.id)throw new AuthHttpError(409,"You cannot change your own account from this panel.");
  const body=await readBody(req);
  const action=body.action;
  if(!["ban","unban","revoke_sessions","role"].includes(action))throw new AuthHttpError(400,"Invalid action");
  let rows;
  if(action==="ban"||action==="unban"||action==="revoke_sessions"){
   if(action==="ban"||action==="unban"){
    rows=await db().query("UPDATE app_auth.users SET banned=$2,session_version=session_version+1,updated_at=now() WHERE id=$1::uuid RETURNING id",[id,action==="ban"]);
   }else rows=await db().query("UPDATE app_auth.users SET session_version=session_version+1,updated_at=now() WHERE id=$1::uuid RETURNING id",[id]);
  }else{
   if(!["user","admin"].includes(String(body.role)))throw new AuthHttpError(400,"Invalid role");
   rows=await db().query("UPDATE app_auth.users SET role=$2,session_version=session_version+1,updated_at=now() WHERE id=$1::uuid RETURNING id",[id,body.role]);
  }
  if(!rows.length)throw new AuthHttpError(404,"Account not found");
  await audit(session.user.id,"admin_user:"+action+":"+id+(action==="role"?":"+body.role:""));
  return json({ok:true});
 }catch(error){
  if(error instanceof AuthHttpError)return json({error:error.message},error.status);
  return json({error:"Unable to update this account"},503);
 }
}
