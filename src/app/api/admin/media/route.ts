import {NextRequest} from "next/server";
import {randomUUID} from "node:crypto";
import {db} from "@/lib/auth/db";
import {readSession} from "@/lib/auth/session";
import {hasAdminRole} from "@/lib/auth/policy";
import {requireSameOrigin,AuthHttpError,json,audit,limit} from "@/lib/auth/http";
import {putPrivate,storageConfigured} from "@/lib/products/storage";
export const runtime="nodejs";
const formats:Record<string,string>={"audio/mpeg":"mp3","audio/mp4":"m4a","audio/wav":"wav","image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
function signature(type:string,d:Uint8Array){
 if(type==="image/png")return d.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>d[i]===n);
 if(type==="image/jpeg")return d.length>=3&&d[0]===255&&d[1]===216&&d[2]===255;
 if(type==="image/webp")return d.length>=12&&String.fromCharCode(...d.slice(0,4))==="RIFF"&&String.fromCharCode(...d.slice(8,12))==="WEBP";
 if(type==="audio/wav")return d.length>=12&&String.fromCharCode(...d.slice(0,4))==="RIFF"&&String.fromCharCode(...d.slice(8,12))==="WAVE";
 if(type==="audio/mp4")return d.length>=12&&String.fromCharCode(...d.slice(4,8))==="ftyp";
 if(type==="audio/mpeg")return d.length>=3&&(String.fromCharCode(...d.slice(0,3))==="ID3"||(d[0]===255&&(d[1]&224)===224));
 return false;
}
async function admin(){const s=await readSession();if(!s?.user||!hasAdminRole(s.user))throw new AuthHttpError(403,"Forbidden");return s.user;}
function fail(e:unknown){return e instanceof AuthHttpError?json({error:e.message},e.status):json({error:"Media storage unavailable. Check R2 configuration."},503);}
export async function GET(){try{await admin();const assets=await db().query("SELECT id::text,original_name,content_type,bytes,access,created_at FROM public.media_assets ORDER BY created_at DESC LIMIT 200");return json({configured:storageConfigured(),assets});}catch(e){return fail(e);}}
export async function POST(req:NextRequest){try{
 const user=await admin();requireSameOrigin(req);await limit("admin-media:"+user.id,30,3600);
 if(!storageConfigured())throw new AuthHttpError(503,"R2 is not configured");
 const size=Number(req.headers.get("content-length")||0);if(size>3000000)throw new AuthHttpError(413,"Upload files smaller than 2.5 MB");
 const form=await req.formData(),file=form.get("file"),access=form.get("access");
 if(!(file instanceof File))throw new AuthHttpError(400,"Choose a file");
 const type=file.type==="audio/mp3"?"audio/mpeg":file.type;
 if(!formats[type]||file.size<1||file.size>2500000||!["free","premium"].includes(String(access)))throw new AuthHttpError(400,"Use an MP3, M4A, WAV, JPEG, PNG or WebP under 2.5 MB");
 const bytes=new Uint8Array(await file.arrayBuffer());if(!signature(type,bytes))throw new AuthHttpError(400,"File content does not match its type");
 const id=randomUUID(),key="admin-media/"+id+"."+formats[type];
 await putPrivate(key,bytes,type);
 await db().query("INSERT INTO public.media_assets(id,object_key,content_type,original_name,bytes,access,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7::uuid)",[id,key,type,file.name.slice(0,200),file.size,access,user.id]);
 await audit(user.id,"media_uploaded:"+id);
 return json({id,url:"/api/media/"+id},201);
 }catch(e){return fail(e);}
}
