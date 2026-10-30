import {NextRequest} from "next/server";
import {createHash} from "node:crypto";
import {db} from "@/lib/auth/db";
import {readSession} from "@/lib/auth/session";
import {hasAdminRole} from "@/lib/auth/policy";
import {requireSameOrigin,readBody,AuthHttpError,json,audit} from "@/lib/auth/http";
import {normalizeDocument} from "@/lib/exam/document";
export const runtime="nodejs";
type Module="listening"|"reading"|"writing";
const kinds=["listening","reading","writing"] as const;
const hash=(s:string)=>createHash("md5").update(s.toLowerCase().replace(/\s+/g,"")).digest("hex");
function validated(value:unknown){
 if(!value||typeof value!=="object"||Array.isArray(value))throw new AuthHttpError(400,"Invalid test record");
 const raw=value as Record<string,any>;
 const docs={} as Record<Module,ReturnType<typeof normalizeDocument>>;
 for(const module of kinds){
  try{docs[module]=normalizeDocument(raw.docs?.[module],module);}
  catch(e){throw new AuthHttpError(400,module+": "+(e instanceof Error?e.message:"Invalid document"));}
  const count=docs[module].parts.length;
  if(count!==(module==="listening"?4:module==="reading"?3:2))throw new AuthHttpError(400,module+" must have complete parts");
  if(module!=="writing"&&!docs[module].questions.length)throw new AuthHttpError(400,module+" has no questions");
 }
 const rawSource=String(raw.sourceKey||"");
 if(rawSource&&!/^[a-zA-Z0-9_.:-]{1,160}$/.test(rawSource))throw new AuthHttpError(400,"Invalid source key");
 const fingerprint=hash(docs.reading.parts.map(p=>String(p.passage_text||"")).join("|"));
 const sourceKey=rawSource||"admin-json-"+fingerprint;
 const passageHash=hash(String(docs.reading.parts[0].passage_text||""));
 return {sourceKey,fingerprint,passageHash,docs,title:String(raw.title||"Imported Full Test").slice(0,180)};
}
export async function POST(req:NextRequest){
 try{
  const s=await readSession();if(!s?.user||!hasAdminRole(s.user))throw new AuthHttpError(403,"Forbidden");
  requireSameOrigin(req);
  const body=await readBody(req,2800000),mode=String(body.mode),values=body.records;
  if(!["preview","apply"].includes(mode)||!Array.isArray(values)||values.length<1||values.length>12)throw new AuthHttpError(400,"Upload 1–12 JSON Full Test records per batch");
  const records=values.map(validated);
  if(new Set(records.map(r=>r.sourceKey)).size!==records.length)throw new AuthHttpError(400,"Repeated source keys inside file");
  const existing=await db().query(`SELECT c.import_source_key FROM public.admin_content c WHERE c.kind='practice' AND c.import_source_key=ANY($1::text[])`,[records.map(r=>r.sourceKey)]);
  const known=new Set(existing.map(r=>String(r.import_source_key)));
  const hashes=await db().query(`SELECT DISTINCT md5(regexp_replace(lower(coalesce(e.document->'parts'->0->>'passage_text','')),'[[:space:]]+','','g')) AS passage_hash FROM public.exam_modules e
   JOIN public.admin_content c ON c.id=e.parent_id AND c.kind='practice'
   WHERE e.kind='practice' AND e.module='reading' AND jsonb_array_length(e.document->'parts')>0`);
  const used=new Set(hashes.map(r=>String(r.passage_hash)));
  const summary=records.map(r=>({sourceKey:r.sourceKey,title:r.title,duplicate:known.has(r.sourceKey)||used.has(r.passageHash),reason:known.has(r.sourceKey)?"Existing source":used.has(r.passageHash)?"Matching first Reading passage":null}));
  if(mode==="preview")return json({summary,ready:summary.filter(r=>!r.duplicate).length});
  let inserted=0,skipped=0;const errors:string[]=[];
  for(let i=0;i<records.length;i++){
   const r=records[i];if(summary[i].duplicate){skipped++;continue;}
   try{
    const insertedRows=await db().query(`WITH gate AS (SELECT pg_advisory_xact_lock(94731891)),
    name AS (SELECT 'Test - '||(coalesce((SELECT max(substring(title FROM '[0-9]+$')::int) FROM public.admin_content
       WHERE kind='practice' AND book_slug IS NULL AND title ~ '^Test - [0-9]+$'),0)+1)::text AS title FROM gate),
    created AS (INSERT INTO public.admin_content(kind,title,description,sections,access,status,durations,book_slug,import_source_key)
     SELECT 'practice',name.title,$2,'["listening","reading","writing"]'::jsonb,'free','draft',
     '{"listening":30,"reading":60,"writing":60}'::jsonb,NULL,$1 FROM name
     WHERE NOT EXISTS(SELECT 1 FROM public.admin_content WHERE import_source_key=$1)
     ON CONFLICT(import_source_key) DO NOTHING RETURNING id),
    modules AS (INSERT INTO public.exam_modules(kind,parent_id,module,content_id,document)
     SELECT 'practice',created.id,x.key,created.id,x.value FROM created CROSS JOIN LATERAL jsonb_each($3::jsonb) x
     RETURNING module)
    SELECT (SELECT id::text FROM created) AS id,(SELECT count(*)::int FROM modules) AS module_count`,[r.sourceKey,"Imported from admin JSON: "+r.title,JSON.stringify(r.docs)]);
    if(insertedRows[0]?.id&&Number(insertedRows[0].module_count)===3){inserted++;used.add(r.passageHash);}else skipped++;
   }catch(e){errors.push(r.sourceKey+": "+(e instanceof Error?e.message:"Unable to import"));}
  }
  await audit(s.user.id,"practice_json_import:"+inserted);
  return json({inserted,skipped,errors,allDraft:true});
 }catch(e){return e instanceof AuthHttpError?json({error:e.message},e.status):json({error:"Import unavailable. No existing tests were modified."},503);}
}
