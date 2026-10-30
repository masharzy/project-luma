import {NextRequest} from "next/server";
import {db} from "@/lib/auth/db";
import {readSession} from "@/lib/auth/session";
import {hasAdminRole} from "@/lib/auth/policy";
import {AuthHttpError,requireSameOrigin,readBody,json,audit} from "@/lib/auth/http";
export const runtime="nodejs";
export async function POST(req:NextRequest){
 try{
  const session=await readSession();
  if(!session?.user||!hasAdminRole(session.user))throw new AuthHttpError(403,"Forbidden");
  requireSameOrigin(req);
  const d=await readBody(req),kind=d.kind,status=d.status,ids=d.ids;
  if(!["practice","vocabulary"].includes(kind)||!["draft","published","archived"].includes(status)||
   !Array.isArray(ids)||ids.length<1||ids.length>50||new Set(ids).size!==ids.length||
   !ids.every((s:unknown)=>typeof s==="string"&&/^\d{1,16}$/.test(s)))
   throw new AuthHttpError(400,"Select up to 50 valid records.");
  const result=await db().query(`WITH target AS (
   SELECT id FROM public.admin_content WHERE kind=$1 AND id=ANY($3::bigint[]) FOR UPDATE
  ), eligible AS (
   SELECT t.id FROM target t WHERE $2::text<>'published' OR $1::text='vocabulary' OR (
    SELECT count(*) FROM public.exam_modules e WHERE e.kind='practice' AND e.parent_id=t.id
      AND e.module IN ('listening','reading','writing') AND e.revision>0
      AND jsonb_typeof(e.document->'parts')='array' AND jsonb_array_length(e.document->'parts')>0
      AND (e.module='writing' OR (jsonb_typeof(e.document->'questions')='array' AND jsonb_array_length(e.document->'questions')>0))
   )=3
  ), changed AS (
   UPDATE public.admin_content SET status=$2,updated_at=now()
   WHERE id IN (SELECT id FROM eligible) AND (SELECT count(*) FROM target)=$4::int
   AND (SELECT count(*) FROM eligible)=$4::int RETURNING id
  ) SELECT count(*)::int AS updated FROM changed`,[kind,status,ids,ids.length]);
  if(Number(result[0]?.updated)!==ids.length)throw new AuthHttpError(409,"One or more tests are missing or incomplete; no changes were made.");
  await audit(session.user.id,"admin_bulk:"+kind+":"+status+":"+ids.length);
  return json({updated:ids.length});
 }catch(e){return e instanceof AuthHttpError?json({error:e.message},e.status):json({error:"Unable to update records"},503);}
}
