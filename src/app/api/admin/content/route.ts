import {registeredVolumeSlug} from "@/lib/other-books-registry";
import { NextRequest } from "next/server";
import { defaultDurations, validDurations } from "@/lib/cambridge-settings";
import { requireSameOrigin, readBody, AuthHttpError } from "@/lib/auth/http";
import { readSession } from "@/lib/auth/session";
import { hasAdminRole } from "@/lib/auth/policy";
import { db } from "@/lib/auth/db";
import { listContent, type ContentKind } from "@/lib/admin/content";
const kinds=["practice","mock","vocabulary"];
async function allowed(){const s=await readSession();return !!s?.user&&hasAdminRole(s.user);}
export async function GET(request:Request){
 if(!(await allowed()))return Response.json({error:"Forbidden"},{status:403});
 const kind=new URL(request.url).searchParams.get("kind");
 if(!kind||!kinds.includes(kind))return Response.json({error:"Invalid kind"},{status:400});
 return Response.json({items:await listContent(kind as ContentKind)},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest){
 if(!(await allowed()))return Response.json({error:"Forbidden"},{status:403});
 let data:Record<string,unknown>;
 try{requireSameOrigin(request);data=await readBody(request);}catch(e){return Response.json({error:"Invalid request"},{status:e instanceof AuthHttpError?e.status:400});}
 const {bookSlug,kind,title,description,access,status,sections,scheduledAt,durations}=data;
 if((bookSlug!=null&&(kind!=="practice"||typeof bookSlug!=="string"||!(await registeredVolumeSlug(bookSlug))))||(durations!==undefined&&!validDurations(durations))||!kinds.includes(String(kind))||typeof title!=="string"||!title.trim()||title.length>180||
 typeof description!=="string"||description.length>5000||
 (access!=="free"&&access!=="premium")||(status!=="draft"&&status!=="published")||
 !Array.isArray(sections)||sections.length>4||!sections.every(s=>["listening","reading","writing","speaking"].includes(s))||
 (kind==='practice'&&(sections.includes('speaking')||(durations!=null&&Object.hasOwn(durations as object,'speaking'))))||
 new Set(sections).size!==sections.length||
 (kind!=="vocabulary"&&sections.length===0)||
 (scheduledAt!==null&&scheduledAt!==undefined&&(typeof scheduledAt!=="string"||!Number.isFinite(Date.parse(scheduledAt)))))
 return Response.json({error:"Invalid content fields"},{status:400});
 const rows=await db().query(`INSERT INTO public.admin_content(kind,title,description,access,status,sections,scheduled_at,durations,book_slug)
 VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::timestamptz,$8::jsonb,$9) RETURNING id`,[kind,title.trim(),description,access,status,JSON.stringify(sections),scheduledAt||null,JSON.stringify({...(kind==='practice'?{listening:30,reading:60,writing:60}:defaultDurations),...(durations as object||{})}),bookSlug??null]);
 return Response.json({id:String(rows[0].id)},{status:201});
}
