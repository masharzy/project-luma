import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { secureCookies } from '@/lib/auth/config';
import { readSession } from '@/lib/auth/session';
import { requireSameOrigin,readBody,json,AuthHttpError,limit,networkKey } from '@/lib/auth/http';
import { ownerCookie,newOwner } from '@/lib/exam/attempts';
import { publicQuestionCatalog,startQuestionGroupAttempt,questionPreview } from '@/lib/exam/question-type-practice';
import { loadSharedQuestionIndex,parseGroupKey,type BankScope } from '@/lib/exam/shared-question-bank';
import { validPracticeModules,validPracticeTypes,type PracticeModule } from '@/lib/exam/question-types';
import { validBookSlug,otherBookSeries } from '@/lib/other-books';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function fail(e:unknown){if(e instanceof AuthHttpError)return json({error:e.message},e.status);console.error('Shared question practice failed',e);return json({error:'Practice is temporarily unavailable. Please retry.'},503);}
function scopeFrom(input:Record<string,unknown>):BankScope{
 const collection=input.collection||'all',book=input.book||undefined,series=input.series||undefined;
 if(!['all','cambridge','other-books','practice'].includes(String(collection)))throw new AuthHttpError(400,'Invalid collection.');
 if(book!==undefined&&(typeof book!=='string'||(collection==='cambridge'?!/^\d{1,4}$/.test(book):collection==='other-books'?!validBookSlug(book):true)))throw new AuthHttpError(400,'Invalid book.');
 if(series!==undefined&&(collection!=='other-books'||!otherBookSeries.some(s=>s.slug===series)))throw new AuthHttpError(400,'Invalid series.');
 return {collection:collection as BankScope['collection'],book:book as string|undefined,series:series as string|undefined};
}
export async function GET(req:NextRequest){try{
 const params=req.nextUrl.searchParams,scope=scopeFrom(Object.fromEntries(params));
 const preview=params.get('preview');
 if(preview){parseGroupKey(preview);return json(questionPreview(await loadSharedQuestionIndex({...scope,keys:[preview]}),preview));}
 const module=params.get('module')||'all';if(!['all','listening','reading'].includes(module))throw new AuthHttpError(400,'Invalid module.');
 const types=params.get('types')?.split(',')||[],page=params.get('page')||'0';
 if(!validPracticeTypes(types)||!/^\d{1,3}$/.test(page))throw new AuthHttpError(400,'Invalid filters.');
 return json(publicQuestionCatalog(await loadSharedQuestionIndex(scope),module==='all'?['listening','reading']:[module as PracticeModule],types,Number(page)));
 }catch(e){return fail(e);}}
export async function POST(req:NextRequest){try{
 requireSameOrigin(req);await limit('question-type-practice:'+networkKey(req),20,3600);
 const input=await readBody(req,8192);
 if(!validPracticeModules(input.modules)||!validPracticeTypes(input.types)||!Number.isInteger(input.count)||Number(input.count)<1||Number(input.count)>10||input.selectionMode!=='groups')throw new AuthHttpError(400,'Choose 1–10 complete question groups.');
 if(input.keys!==undefined&&(!Array.isArray(input.keys)||input.keys.length!==input.count||input.keys.some(k=>typeof k!=='string'||k.length>180)||new Set(input.keys).size!==input.keys.length))throw new AuthHttpError(400,'Invalid selection.');
 const scope=input.keys?{collection:'all' as const,keys:input.keys as string[]}:scopeFrom(input);
 const owner=newOwner((await cookies()).get(ownerCookie)?.value),session=await readSession();
 const id=await startQuestionGroupAttempt(await loadSharedQuestionIndex(scope),input.modules,input.keys?[]:input.types,Number(input.count),owner,session?.user.id??null,input.keys as string[]|undefined);
 const response=json({id,url:'/exam/attempt/'+id},201);response.cookies.set(ownerCookie,owner,{httpOnly:true,secure:secureCookies(),sameSite:'lax',path:'/',maxAge:86400});return response;
 }catch(e){return fail(e);}}
