import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validToken, randomToken, digest } from '../src/lib/auth/crypto.ts';
function load(path,mocks) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>mocks[n]??{},console,Date});
  return exports;
}
test('pending credentials never satisfy a verified session read',async()=>{
  let verified=false;const token=randomToken();const queries=[];
  const session=load('src/lib/auth/session.ts',{
    './config':{sessionCookieName:()=> 'session'},
    './crypto':{validToken,randomToken,digest},
    'next/headers':{cookies:async()=>({get:()=>({value:token})})},
    './db':{db:()=>({query:async(sql,args)=>{queries.push({sql,args});return [{id:'owner',email:'owner@example.invalid',name:'Owner',email_verified:verified,role:'user'}];}})},
  });
  assert.equal((await session.readAccountSession()).user.emailVerified,false);
  assert.equal(await session.readSession(),null);
  await session.createPendingSession('owner');
  assert.equal(queries.at(-1).args[2],86400);assert.equal(queries.at(-1).args[3],true);
  verified=true;assert.equal((await session.readSession()).user.id,'owner');
  assert.equal(await session.readAccountSession('invalid'),null);
});
test('both learner and admin guards redirect pending accounts to verification',async()=>{
  let user={id:'owner',emailVerified:false,role:'admin'};
  const guards=load('src/lib/auth/guards.ts',{
    react:{cache:fn=>fn},'./session':{readAccountSession:async()=>user?{user}:null},
    './policy':{hasAdminRole:u=>u.role==='admin'},
    'next/navigation':{redirect:path=>{throw Error(path);},notFound:()=>{throw Error('404');}},
  });
  for(const guard of [guards.requireUser,guards.requireAdmin])await assert.rejects(guard(),{message:'/auth/verify-email'});
  user.emailVerified=true;assert.equal((await guards.requireUser()).id,'owner');
  user=null;await assert.rejects(guards.requireUser(),{message:'/auth/sign-in'});
});
test('verification resend derives recipient exclusively from an authenticated account',async()=>{
  let account=null,blocked=false,sends=[];const claims=[];
  class AuthHttpError extends Error {constructor(status,message,code){super(message);Object.assign(this,{status,code});}}
  class MailUnavailable extends Error {}
  const route=load('src/app/api/auth/[...path]/route.ts',{
    '@/lib/auth/config':{sessionCookieName:()=> 'session'},
    '@/lib/auth/session':{readAccountSession:async()=>account},
    '@/lib/auth/db':{db:()=>({query:async()=>[]})},
    '@/lib/auth/crypto':{randomToken,digest},
    '@/lib/auth/http':{AuthHttpError,requireSameOrigin:()=>{},readBody:r=>r.json(),networkKey:()=> 'ip',json:(x,status=200)=>Response.json(x,{status})},
    '@/lib/auth/mail':{MailUnavailable,assertMailReady:()=>{},sendAuthMail:async(...args)=>sends.push(args)},
    '@/lib/auth/verification':{claimVerificationDelivery:async(...args)=>{claims.push(args);if(blocked)throw new AuthHttpError(429,'Wait');return 999999;}},
  });
  const call=body=>route.POST({nextUrl:{pathname:'/api/auth/resend-verification'},json:async()=>body,cookies:{get:()=>({value:'session'})}});
  assert.equal((await call({email:'victim@example.invalid'})).status,401);assert.equal(sends.length,0);
  account={user:{id:'owner',email:'owner@example.invalid',emailVerified:false}};
  assert.equal((await call({email:'victim@example.invalid'})).status,400);assert.equal(claims.length,0);
  blocked=true;assert.equal((await call({})).status,429);assert.equal(sends.length,0);
  blocked=false;assert.equal((await call({})).status,200);assert.equal(sends[0][0],'owner@example.invalid');
  account.user.emailVerified=true;assert.equal((await call({})).status,400);assert.equal(sends.length,1);
});
