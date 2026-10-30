import { validBookSlug } from "@/lib/other-books";
import { validDurations } from "@/lib/cambridge-settings";
import { NextRequest } from "next/server";
import { readSession } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/policy";
import { requireSameOrigin, readBody, AuthHttpError } from "@/lib/auth/http";
import { db } from "@/lib/auth/db";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
type Context={params:Promise<{id:string}>};
async function authorize(request:NextRequest,c:Context){const s=await readSession();if(!s||!hasAdminRole(s.user))throw new AuthHttpError(403,"Forbidden");requireSameOrigin(request);const {id}=await c.params;if(!/^\d{1,16}$/.test(id))throw new AuthHttpError(400,"Invalid ID");return id;}
export async function PATCH(request:NextRequest,c:Context){try{
 const id=await authorize(request,c),d=await readBody(request);
 const rows=await db().query("SELECT kind,sections FROM public.admin_content WHERE id=$1",[id]);if(!rows[0])return reply({error:"Not found"},404);
 const allowed=["bookSlug","kind","title","description","sections","access","status","scheduledAt","durations"];
 if((d.bookSlug!==undefined&&d.bookSlug!==null&&(rows[0].kind!=="practice"||!validBookSlug(d.bookSlug)))||(d.durations!==undefined&&!validDurations(d.durations))||!Object.keys(d).length||Object.keys(d).some(k=>!allowed.includes(k))||
 (d.kind!==undefined&&d.kind!==rows[0].kind)||
 (rows[0].kind==='practice'&&((Array.isArray(d.sections)&&d.sections.includes('speaking'))||(d.durations!=null&&Object.hasOwn(d.durations as object,'speaking'))))||
 (d.title!==undefined&&(typeof d.title!=="string"||!d.title.trim()||d.title.length>180))||
 (d.description!==undefined&&(typeof d.description!=="string"||d.description.length>5000))||
 (d.access!==undefined&&!['free','premium'].includes(String(d.access)))||
 (d.status!==undefined&&!['draft','published','archived'].includes(String(d.status)))||
 (d.sections!==undefined&&(!Array.isArray(d.sections)||d.sections.length>4||(rows[0].kind!=='vocabulary'&&d.sections.length===0)||!d.sections.every(x=>['listening','reading','writing','speaking'].includes(x))||new Set(d.sections).size!==d.sections.length))||
 (d.scheduledAt!==undefined&&d.scheduledAt!==null&&(typeof d.scheduledAt!=="string"||!Number.isFinite(Date.parse(d.scheduledAt)))))return reply({error:"Invalid content fields"},400);
 await db().query("UPDATE public.admin_content SET title=coalesce($2,title),description=coalesce($3,description),sections=coalesce($4::jsonb,sections),access=coalesce($5,access),status=coalesce($6,status),scheduled_at=CASE WHEN $7::boolean THEN $8::timestamptz ELSE scheduled_at END,durations=durations||coalesce($9::jsonb,'{}'::jsonb),book_slug=CASE WHEN $10::boolean THEN $11::text ELSE book_slug END,updated_at=now() WHERE id=$1",[id,typeof d.title==='string'?d.title.trim():null,d.description??null,d.sections===undefined?null:JSON.stringify(d.sections),d.access??null,d.status??null,Object.hasOwn(d,'scheduledAt'),d.scheduledAt??null,d.durations===undefined?null:JSON.stringify(d.durations),Object.hasOwn(d,"bookSlug"),d.bookSlug??null]);return reply({ok:true});
 }catch(e){return e instanceof AuthHttpError?reply({error:e.message},e.status):reply({error:"Unable to update content"},503);}}
export async function DELETE(request:NextRequest,c:Context){try{const id=await authorize(request,c);const rows=await db().query("DELETE FROM public.admin_content WHERE id=$1 RETURNING id",[id]);return rows[0]?reply({ok:true}):reply({error:"Not found"},404);}catch(e){return e instanceof AuthHttpError?reply({error:e.message},e.status):reply({error:"Unable to delete content"},503);}}
