import {NextRequest} from 'next/server';
import {requireSameOrigin,readBody,AuthHttpError} from '@/lib/auth/http';
import {readSession} from '@/lib/auth/session';
import {hasAdminRole} from '@/lib/auth/policy';
import {db} from '@/lib/auth/db';
import {wordSchema,columns,toRow,exampleJson} from '@/lib/vocab-admin';
async function allowed(){const s=await readSession();return !!s?.user&&hasAdminRole(s.user);}
const idOf=async(ctx:{params:Promise<{id:string}>})=>{const n=Number((await ctx.params).id);return Number.isInteger(n)&&n>0?n:null;};
export async function PATCH(request:NextRequest,ctx:{params:Promise<{id:string}>}){
 if(!(await allowed()))return Response.json({error:'Forbidden'},{status:403});
 const id=await idOf(ctx);if(!id)return Response.json({error:'Invalid id'},{status:400});
 let body:Record<string,unknown>;try{requireSameOrigin(request);body=await readBody(request);}catch(e){return Response.json({error:'Invalid request'},{status:e instanceof AuthHttpError?e.status:400});}
 // Quick toggle of the published flag only.
 if(Object.keys(body).length===1&&typeof body.published==='boolean'){
  const r=await db().query(`UPDATE public.vocab_words SET published=$2 WHERE id=$1 RETURNING ${columns}`,[id,body.published]);
  return r[0]?Response.json({item:toRow(r[0])}):Response.json({error:'Not found'},{status:404});
 }
 const p=wordSchema.safeParse(body);
 if(!p.success)return Response.json({error:p.error.issues[0]?.message||'Invalid fields'},{status:400});
 const w=p.data;
 try{
  const r=await db().query(`UPDATE public.vocab_words SET word=$2,pos=$3,tier=$4,band=$5,topics=$6,use_in=$7,meaning_en=$8,meaning_bn=$9,examples=$10::jsonb,collocations=$11,word_family=$12,synonyms=$13,antonyms=$14,test=$15::jsonb,published=$16 WHERE id=$1 RETURNING ${columns}`,
   [id,w.word,w.pos,w.tier,w.band,w.topics,w.use,w.meaningEn,w.meaningBn,exampleJson(w.examples),w.collocations,w.wordFamily,w.synonyms,w.antonyms,JSON.stringify(w.test),w.published]);
  if(!r[0])return Response.json({error:'Not found'},{status:404});
  // Move to another position: shift the words in between by one (deferred unique check).
  if(w.position&&w.position!==Number(r[0].position)){
   const [{n}]=await db().query('SELECT count(*)::int AS n FROM public.vocab_words');
   const to=Math.min(w.position,Number(n)),from=Number(r[0].position);
   await db().query(`UPDATE public.vocab_words SET position=CASE WHEN id=$1 THEN $2::int WHEN $2::int<$3::int THEN position+1 ELSE position-1 END WHERE id=$1 OR position BETWEEN least($2::int,$3::int) AND greatest($2::int,$3::int)`,[id,to,from]);
  }
  const f=await db().query(`SELECT ${columns} FROM public.vocab_words WHERE id=$1`,[id]);
  return Response.json({item:toRow(f[0])});
 }catch(e){return Response.json({error:String(e).includes('vocab_words_word_key')?'This word already exists':'Could not save'},{status:409});}
}
export async function DELETE(request:NextRequest,ctx:{params:Promise<{id:string}>}){
 if(!(await allowed()))return Response.json({error:'Forbidden'},{status:403});
 const id=await idOf(ctx);if(!id)return Response.json({error:'Invalid id'},{status:400});
 try{requireSameOrigin(request);}catch(e){return Response.json({error:'Invalid request'},{status:e instanceof AuthHttpError?e.status:400});}
 await db().query('DELETE FROM public.vocab_words WHERE id=$1',[id]);
 // Close the gap so the free boundary stays exactly 100 words.
 await db().query('UPDATE public.vocab_words w SET position=r.rn FROM (SELECT id,row_number() OVER (ORDER BY position)::int AS rn FROM public.vocab_words) r WHERE r.id=w.id AND w.position<>r.rn');
 return Response.json({ok:true});
}
