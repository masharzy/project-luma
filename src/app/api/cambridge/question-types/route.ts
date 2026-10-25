import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { secureCookies } from '@/lib/auth/config';
import { readSession } from '@/lib/auth/session';
import { requireSameOrigin, readBody, json, AuthHttpError, limit, networkKey } from '@/lib/auth/http';
import { ownerCookie, newOwner } from '@/lib/exam/attempts';
import { loadQuestionIndex, publicQuestionCatalog, startQuestionTypeAttempt, startQuestionGroupAttempt, questionPreview } from '@/lib/exam/question-type-practice';
import { validPracticeModules, validPracticeTypes, type PracticeModule } from '@/lib/exam/question-types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function modulesFromQuery(value:string|null):PracticeModule[]{
  if(!value||value==='all')return ['listening','reading'];
  if(value==='listening'||value==='reading')return [value];
  throw new AuthHttpError(400,'Invalid module filter.');
}
function typesFromQuery(raw:string|null):string[]{
  const values=raw?raw.split(','):[];
  if(!validPracticeTypes(values))throw new AuthHttpError(400,'Invalid question types.');
  return values;
}
function fail(e:unknown){
  if(e instanceof AuthHttpError)return json({error:e.message,code:e.code},e.status);
  console.error('Question type practice failed',e);
  return json({error:'Question Type Practice is temporarily unavailable. Please retry.'},503);
}
export async function GET(req:NextRequest){
  try{
    const key=req.nextUrl.searchParams.get('preview');
    if(key){const match=key.match(/^(listening|reading):(\d{1,16}):.{1,150}$/);if(!match)throw new AuthHttpError(400,'Invalid preview');return json(questionPreview(await loadQuestionIndex({module:match[1] as PracticeModule,testId:match[2]}),key));}
    const modules=modulesFromQuery(req.nextUrl.searchParams.get('module'));
    const types=typesFromQuery(req.nextUrl.searchParams.get('types'));
    const raw=req.nextUrl.searchParams.get('page')||'0';
    if(!/^\d{1,3}$/.test(raw))throw new AuthHttpError(400,'Invalid page.');
    const page=Number(raw);
    return json(publicQuestionCatalog(await loadQuestionIndex(),modules,types,page));
  }catch(e){return fail(e);}
}
export async function POST(req:NextRequest){
  try{
    requireSameOrigin(req);
    await limit('question-type-practice:'+networkKey(req),20,3600);
    const input=await readBody(req,4096);
    if(!validPracticeModules(input.modules)||!validPracticeTypes(input.types)||
       (input.keys!==undefined&&(!Array.isArray(input.keys)||input.keys.length>40||input.keys.some(k=>typeof k!=='string'||k.length>180)))||
       !Number.isInteger(input.count)||Number(input.count)<1||Number(input.count)>40)
      throw new AuthHttpError(400,'Choose valid modules, question types and a count from 1 to 40.');
    const owner=newOwner((await cookies()).get(ownerCookie)?.value);
    const session=await readSession();
    if(input.selectionMode!==undefined&&input.selectionMode!=='groups')throw new AuthHttpError(400,'Invalid selection mode');
    const start=input.selectionMode==='groups'?startQuestionGroupAttempt:startQuestionTypeAttempt;
    const id=await start(await loadQuestionIndex(),input.modules,input.types,Number(input.count),owner,session?.user.id??null,input.keys as string[]|undefined);
    const response=json({id,url:'/exam/attempt/'+id},201);
    response.cookies.set(ownerCookie,owner,{httpOnly:true,secure:secureCookies(),sameSite:'lax',path:'/',maxAge:86400});
    return response;
  }catch(e){return fail(e);}
}
