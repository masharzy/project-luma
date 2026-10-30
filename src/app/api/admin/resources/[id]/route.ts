import {NextRequest} from "next/server";
import {db} from "@/lib/auth/db";
import {readSession} from "@/lib/auth/session";
import {hasAdminRole} from "@/lib/auth/policy";
import {AuthHttpError,readBody,requireSameOrigin,json,audit} from "@/lib/auth/http";
import {validateResource} from "@/lib/admin/resource-validation";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
async function admin(req:NextRequest,c:Context){const s=await readSession();if(!s?.user||!hasAdminRole(s.user))throw new AuthHttpError(403,"Forbidden");requireSameOrigin(req);const {id}=await c.params;if(!/^\d{1,16}$/.test(id))throw new AuthHttpError(400,"Invalid resource");return {user:s.user,id};}
function errorResponse(e:unknown){return e instanceof AuthHttpError?json({error:e.message},e.status):json({error:"Unable to update resource"},503);}
export async function PATCH(req:NextRequest,c:Context){try{const {user,id}=await admin(req,c),d=validateResource(await readBody(req));const rows=await db().query("UPDATE public.learning_resources SET title=$2,category=$3,body=$4,source_url=$5,access=$6,status=$7,updated_at=now() WHERE id=$1 RETURNING id",[id,d.title,d.category,d.body,d.sourceUrl,d.access,d.status]);if(!rows.length)throw new AuthHttpError(404,"Not found");await audit(user.id,"resource_updated:"+id);return json({ok:true});}catch(e){return errorResponse(e);}}
export async function DELETE(req:NextRequest,c:Context){try{const {user,id}=await admin(req,c);const rows=await db().query("DELETE FROM public.learning_resources WHERE id=$1 RETURNING id",[id]);if(!rows.length)throw new AuthHttpError(404,"Not found");await audit(user.id,"resource_deleted:"+id);return json({ok:true});}catch(e){return errorResponse(e);}}
