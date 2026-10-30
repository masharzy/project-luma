import {NextRequest} from "next/server";
import {db} from "@/lib/auth/db";
import {readSession} from "@/lib/auth/session";
import {hasAdminRole} from "@/lib/auth/policy";
import {AuthHttpError,requireSameOrigin,readBody,json,audit} from "@/lib/auth/http";
import {listCatalogSeries,listCatalogVolumes} from "@/lib/other-books-registry";
export const runtime="nodejs";
const slug=(v:unknown)=>typeof v==="string"&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)&&v.length<=80;
const cover=(v:unknown)=>{
 if(typeof v!=="string"||v.length>2000)return false;
 if(!v)return true;
 if(/^\/images\/books\/[a-z0-9-]+\.(png|jpg|jpeg|webp)$/.test(v))return true;
 try{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password;}catch{return false;}
};
async function admin(){const s=await readSession();if(!s?.user||!hasAdminRole(s.user))throw new AuthHttpError(403,"Forbidden");return s.user;}
const fail=(e:unknown)=>e instanceof AuthHttpError?json({error:e.message},e.status):json({error:"Unable to manage catalog"},503);
export async function GET(){try{await admin();const [series,volumes]=await Promise.all([listCatalogSeries(false),listCatalogVolumes(false)]);return json({series,volumes});}catch(e){return fail(e);}}
export async function POST(req:NextRequest){try{
 const user=await admin();requireSameOrigin(req);const d=await readBody(req);
 const type=String(d.type),status=String(d.status),path=String(d.slug||""),image=String(d.cover||"");
 if(!slug(path)||!cover(image)||!["draft","published"].includes(status))throw new AuthHttpError(400,"Invalid slug, cover or status");
 const editing=d.edit===true;
 if(type==="series"){
  const name=String(d.name||"").trim();
  if(name.length<2||name.length>120)throw new AuthHttpError(400,"Invalid series name");
  if(editing){
   const rows=await db().query("UPDATE public.book_series SET name=$2,cover=$3,status=$4,updated_at=now() WHERE slug=$1 RETURNING slug",[path,name,image,status]);
   if(!rows.length)throw new AuthHttpError(404,"Series not found");
  }else await db().query("INSERT INTO public.book_series(slug,name,cover,status) VALUES($1,$2,$3,$4)",[path,name,image,status]);
 }else if(type==="volume"){
  const seriesSlug=String(d.seriesSlug||""),title=String(d.title||"").trim(),volume=String(d.volume||"").trim(),isbn=String(d.isbn||"").trim();
  if(!slug(seriesSlug)||title.length<2||title.length>180||volume.length<1||volume.length>80||isbn.length>50)throw new AuthHttpError(400,"Invalid volume details");
  if(editing){
   const rows=await db().query("UPDATE public.book_volumes SET series_slug=$2,title=$3,volume=$4,isbn=$5,cover=$6,status=$7,updated_at=now() WHERE slug=$1 RETURNING slug",[path,seriesSlug,title,volume,isbn,image,status]);
   if(!rows.length)throw new AuthHttpError(404,"Volume not found");
  }else await db().query("INSERT INTO public.book_volumes(slug,series_slug,title,volume,isbn,cover,status) VALUES($1,$2,$3,$4,$5,$6,$7)",[path,seriesSlug,title,volume,isbn,image,status]);
 }else throw new AuthHttpError(400,"Unknown catalog type");
 await audit(user.id,"book_catalog:"+type+":"+(editing?"updated:":"created:")+path);
 return json({ok:true});
 }catch(e){if((e as {code?:string}).code==="23505")return json({error:"Slug already exists"},409);if((e as {code?:string}).code==="23503")return json({error:"Choose an existing book series"},400);return fail(e);}
}
