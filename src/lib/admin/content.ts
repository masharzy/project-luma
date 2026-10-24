import "server-only";
import { db } from "@/lib/auth/db";
export type ContentKind="practice"|"mock"|"vocabulary";
export type ContentItem={id:string;kind:ContentKind;title:string;description:string;sections:string[];durations:Record<string,number>;access:"free"|"premium";status:"draft"|"published"|"archived";scheduledAt:string|null};
export async function listContent(kind:ContentKind):Promise<ContentItem[]>{
 const rows=await db().query("SELECT id,kind,title,description,sections,access,status,scheduled_at,durations FROM public.admin_content WHERE kind=$1 ORDER BY created_at DESC,id DESC",[kind]);
 return rows.map(r=>({id:String(r.id),kind:r.kind as ContentKind,title:String(r.title),description:String(r.description),sections:Array.isArray(r.sections)?r.sections:[],durations:{listening:30,reading:60,writing:60,speaking:15,...(r.durations as object||{})},access:r.access==="premium"?"premium":"free",status:r.status==="published"?"published":r.status==="archived"?"archived":"draft",scheduledAt:r.scheduled_at?new Date(String(r.scheduled_at)).toISOString():null}));
}
