import {NextRequest} from "next/server";
import {db} from "@/lib/auth/db";
import {readSession} from "@/lib/auth/session";
import {hasAdminRole} from "@/lib/auth/policy";
import {getPrivate,signedMedia,storageConfigured} from "@/lib/products/storage";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function GET(_:NextRequest,c:Context){
 const {id}=await c.params;if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id))return new Response("Not found",{status:404});
 try{
  const rows=await db().query("SELECT object_key,content_type,access,bytes FROM public.media_assets WHERE id=$1::uuid",[id]);
  if(!rows.length)return new Response("Not found",{status:404});
  const media=rows[0];
  if(media.access==="premium"){
   const session=await readSession();if(!session?.user)return new Response("Sign in required",{status:401});
   if(!hasAdminRole(session.user)){
    const grant=await db().query("SELECT 1 FROM public.evaluation_subscriptions WHERE user_id=$1::uuid AND status='active' AND starts_at<=now() AND expires_at>now() LIMIT 1",[session.user.id]);
    if(!grant.length)return new Response("Premium membership required",{status:403});
   }
  }
  if(!storageConfigured())return new Response("Media unavailable",{status:503});
  // Audio (often 10–60 MB) and large images go straight to R2 via a signed URL: R2 answers Range requests, so players can seek,
  // and the bytes never pass through the function (Vercel caps function responses at 4.5 MB). The signature outlives the cache by hours.
  if(String(media.content_type).startsWith("audio/")||Number(media.bytes)>4000000){
   const free=media.access==="free";
   const url=await signedMedia(String(media.object_key),free?86400:21600);
   return new Response(null,{status:302,headers:{Location:url,"Cache-Control":free?"public, max-age=3600, s-maxage=3600":"private, no-store"}});
  }
  const bytes=await getPrivate(String(media.object_key));
  return new Response(new Uint8Array(bytes),{headers:{"Content-Type":String(media.content_type),"X-Content-Type-Options":"nosniff","Cache-Control":media.access==="free"?"public, max-age=300":"private, no-store"}});
 }catch{return new Response("Media unavailable",{status:503});}
}
