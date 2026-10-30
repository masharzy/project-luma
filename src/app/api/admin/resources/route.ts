import {NextRequest} from "next/server";
import {db} from "@/lib/auth/db";
import {validateResource} from "@/lib/admin/resource-validation";
import {readSession} from "@/lib/auth/session";
import {hasAdminRole} from "@/lib/auth/policy";
import {AuthHttpError,readBody,requireSameOrigin,json,audit} from "@/lib/auth/http";
export const runtime="nodejs";
async function admin(){const s=await readSession();if(!s?.user||!hasAdminRole(s.user))throw new AuthHttpError(403,"Forbidden");return s.user;}

export async function GET(){try{await admin();const rows=await db().query("SELECT id::text,title,category,body,source_url,access,status,created_at,updated_at FROM public.learning_resources ORDER BY updated_at DESC,id DESC LIMIT 500");return json({items:rows});}catch(e){return e instanceof AuthHttpError?json({error:e.message},e.status):json({error:"Unable to load resources"},503);}}
export async function POST(req:NextRequest){try{const user=await admin();requireSameOrigin(req);const d=validateResource(await readBody(req));const rows=await db().query("INSERT INTO public.learning_resources(title,category,body,source_url,access,status) VALUES($1,$2,$3,$4,$5,$6) RETURNING id::text",[d.title,d.category,d.body,d.sourceUrl,d.access,d.status]);await audit(user.id,"resource_created:"+rows[0].id);return json({id:rows[0].id},201);}catch(e){return e instanceof AuthHttpError?json({error:e.message},e.status):json({error:"Unable to create resource"},503);}}
