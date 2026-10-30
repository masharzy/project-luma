import "server-only";
import {db} from "@/lib/auth/db";
export type CatalogSeries={slug:string;name:string;cover:string;status:"draft"|"published"};
export type CatalogVolume={slug:string;seriesSlug:string;series:string;title:string;volume:string;isbn:string;cover:string;status:"draft"|"published"};
export async function listCatalogSeries(publishedOnly=true):Promise<CatalogSeries[]>{
 const rows=await db().query("SELECT slug,name,cover,status FROM public.book_series WHERE ($1::boolean=false OR status='published') ORDER BY created_at,slug",[publishedOnly]);
 return rows.map(r=>({slug:String(r.slug),name:String(r.name),cover:String(r.cover||""),status:r.status}));
}
export async function listCatalogVolumes(publishedOnly=true,seriesSlug?:string):Promise<CatalogVolume[]>{
 const rows=await db().query(`SELECT v.slug,v.series_slug,s.name AS series,v.title,v.volume,v.isbn,v.cover,v.status
 FROM public.book_volumes v JOIN public.book_series s ON s.slug=v.series_slug
 WHERE ($1::boolean=false OR (v.status='published' AND s.status='published'))
 AND ($2::text IS NULL OR v.series_slug=$2) ORDER BY v.created_at,v.slug`,[publishedOnly,seriesSlug||null]);
 return rows.map(r=>({slug:String(r.slug),seriesSlug:String(r.series_slug),series:String(r.series),title:String(r.title),volume:String(r.volume),isbn:String(r.isbn||""),cover:String(r.cover||""),status:r.status}));
}
export async function registeredVolumeSlug(slug:string):Promise<boolean>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return false;
 return (await db().query("SELECT 1 FROM public.book_volumes WHERE slug=$1 LIMIT 1",[slug])).length>0;
}
