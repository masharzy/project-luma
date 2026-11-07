import {NextRequest} from "next/server";
import {requireSameOrigin,AuthHttpError} from "@/lib/auth/http";
import {readSession} from "@/lib/auth/session";
import {hasAdminRole} from "@/lib/auth/policy";
import {db} from "@/lib/auth/db";
import words from "@/data/vocabulary.json";
export const maxDuration=60;
type Row={position:number;word:string;pos:string[];tier:string;band:number;topics:string[];use:string[];meaning_en:string;meaning_bn:string;examples:unknown[];collocations:string[];word_family:string[];synonyms:string[];antonyms:string[];test:unknown};
// Replaces the whole vocabulary table with the bundled, validated word list (admin only).
export async function POST(request:NextRequest){
 const s=await readSession();
 if(!s?.user||!hasAdminRole(s.user))return Response.json({error:"Forbidden"},{status:403});
 try{requireSameOrigin(request);}catch(e){return Response.json({error:"Invalid request"},{status:e instanceof AuthHttpError?e.status:400});}
 const rows=words as Row[];
 await db().query("DELETE FROM public.vocab_words");
 for(let i=0;i<rows.length;i+=100){
  await db().query(`INSERT INTO public.vocab_words(position,word,pos,tier,band,topics,use_in,meaning_en,meaning_bn,examples,collocations,word_family,synonyms,antonyms,test)
   SELECT r.position,r.word,r.pos,r.tier,r.band,r.topics,r.use,r.meaning_en,r.meaning_bn,r.examples,r.collocations,r.word_family,r.synonyms,r.antonyms,r.test
   FROM jsonb_to_recordset($1::jsonb) AS r(position int,word text,pos text[],tier text,band smallint,topics text[],"use" text[],meaning_en text,meaning_bn text,examples jsonb,collocations text[],word_family text[],synonyms text[],antonyms text[],test jsonb)`,[JSON.stringify(rows.slice(i,i+100))]);
 }
 const [{n}]=await db().query("SELECT count(*)::int AS n FROM public.vocab_words");
 return Response.json({imported:Number(n)});
}
