import {NextRequest} from 'next/server';
import {requireSameOrigin,readBody,AuthHttpError} from '@/lib/auth/http';
import {readSession} from '@/lib/auth/session';
import {hasAdminRole} from '@/lib/auth/policy';
import {db} from '@/lib/auth/db';
import {wordSchema,columns,toRow,exampleJson} from '@/lib/vocab-admin';
async function allowed(){const s=await readSession();return !!s?.user&&hasAdminRole(s.user);}
const PAGE=30;
export async function GET(request:Request){
 if(!(await allowed()))return Response.json({error:'Forbidden'},{status:403});
 const u=new URL(request.url).searchParams;
 const q=(u.get('q')||'').trim().toLowerCase().slice(0,40);
 const page=Math.max(1,Number(u.get('page'))||1);
 const args=[q?`%${q}%`:null,u.get('tier')||null,u.get('topic')||null,u.get('status')||null,Number(u.get('band'))||null];
 const where=`($1::text IS NULL OR word LIKE $1 OR lower(meaning_en) LIKE $1) AND ($2::text IS NULL OR tier=$2) AND ($3::text IS NULL OR $3=ANY(topics)) AND ($4::text IS NULL OR ($4='published')=published) AND ($5::int IS NULL OR band=$5)`;
 const [{n}]=await db().query(`SELECT count(*)::int AS n FROM public.vocab_words WHERE ${where}`,args);
 const rows=await db().query(`SELECT ${columns} FROM public.vocab_words WHERE ${where} ORDER BY position LIMIT ${PAGE} OFFSET ${(page-1)*PAGE}`,args);
 const [{total}]=await db().query('SELECT count(*)::int AS total FROM public.vocab_words');
 return Response.json({items:rows.map(toRow),total:Number(n),all:Number(total),pages:Math.max(1,Math.ceil(Number(n)/PAGE))},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:NextRequest){
 if(!(await allowed()))return Response.json({error:'Forbidden'},{status:403});
 let body;try{requireSameOrigin(request);body=await readBody(request);}catch(e){return Response.json({error:'Invalid request'},{status:e instanceof AuthHttpError?e.status:400});}
 const p=wordSchema.safeParse(body);
 if(!p.success)return Response.json({error:p.error.issues[0]?.message||'Invalid fields'},{status:400});
 const w=p.data;
 try{
  const rows=await db().query(`INSERT INTO public.vocab_words(position,word,pos,tier,band,topics,use_in,meaning_en,meaning_bn,examples,collocations,word_family,synonyms,antonyms,test,published)
   VALUES((SELECT COALESCE(max(position),0)+1 FROM public.vocab_words),$1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14::jsonb,$15) RETURNING ${columns}`,
   [w.word,w.pos,w.tier,w.band,w.topics,w.use,w.meaningEn,w.meaningBn,exampleJson(w.examples),w.collocations,w.wordFamily,w.synonyms,w.antonyms,JSON.stringify(w.test),w.published]);
  return Response.json({item:toRow(rows[0])});
 }catch(e){return Response.json({error:String(e).includes('vocab_words_word_key')?'This word already exists':'Could not save'},{status:409});}
}
