import "server-only";
import { db } from "@/lib/auth/db";
export type CambridgeSection="listening"|"reading"|"writing";
export type CambridgeTest={id:string;bookNumber:number;testNumber:number;title:string;access:"free"|"premium";status:"draft"|"published"|"archived";sections:CambridgeSection[]};
export async function listCambridgeTests(publishedOnly=true):Promise<CambridgeTest[]>{
 const rows=await db().query(`SELECT id,book_number,test_number,title,access,status,sections FROM public.cambridge_tests WHERE ($1::boolean=false OR status='published') ORDER BY book_number,test_number`,[publishedOnly]);
 return rows.map(r=>({id:String(r.id),bookNumber:Number(r.book_number),testNumber:Number(r.test_number),title:String(r.title),access:r.access==="premium"?"premium":"free",status:r.status==="published"?"published":r.status==="archived"?"archived":"draft",sections:Array.isArray(r.sections)?r.sections.filter((s:unknown):s is CambridgeSection=>s==="listening"||s==="reading"||s==="writing"):[]}));
}
