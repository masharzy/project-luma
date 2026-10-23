import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validToken, digest, randomToken } from '../src/lib/auth/crypto.ts';

test('verification requires a valid single-use token and never grants a session',async()=>{
  const token=randomToken();let used=false;let sessionCalls=0;const queries=[];
  class AuthHttpError extends Error {constructor(status,message,code){super(message);Object.assign(this,{status,code});}}
  class MailUnavailable extends Error {}
  const mocks={
    '@/lib/auth/db':{db:()=>({query:async(sql,params)=>{queries.push({sql,params});if(params[0]!==digest(token)||used)return [];used=true;return [{id:'user-1'}];}})},
    '@/lib/auth/config':{},
    '@/lib/auth/crypto':{validToken,digest},
    '@/lib/auth/session':{createSession:()=>{sessionCalls++;throw Error('Must not create a session');}},
    '@/lib/auth/mail':{MailUnavailable},
    '@/lib/auth/http':{AuthHttpError,json:(body,status=200)=>Response.json(body,{status}),requireSameOrigin:()=>{},readBody:r=>r.json(),networkKey:()=> 'test',limit:async()=>{},audit:async()=>{}},
    '@/lib/auth/google':{},
  };
  const exports={};const output=ts.transpileModule(readFileSync('src/app/api/auth/[...path]/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(output,{exports,require:name=>mocks[name]??{},console});
  const send=token=>exports.POST({nextUrl:{pathname:'/api/auth/verify-email'},json:async()=>({token}),cookies:{get:()=>undefined}});
  let r=await send('bad');assert.equal(r.status,400);assert.equal(queries.length,0);
  r=await send(token);assert.equal(r.status,200);assert.deepEqual(await r.json(),{verified:true});assert.equal(r.headers.get('set-cookie'),null);assert.equal(sessionCalls,0);
  r=await send(token);assert.equal(r.status,400);assert.equal(sessionCalls,0);
});

test('only a Google-verified identity gets a dashboard session without inbox verification',async()=>{
  let verified=true,sessions=0,updates=0;
  const state=randomToken();
  const cookieChanges=[];
  const response=url=>({url:String(url),headers:new Headers(),cookies:{set:(...args)=>cookieChanges.push(args)}});
  const mocks={
    'jose':{createRemoteJWKSet:()=>({}),jwtVerify:async()=>({payload:{email_verified:verified,sub:'google-subject',email:'verified@example.test',nonce:'nonce'}})},
    'node:crypto':{},
    'next/server':{NextResponse:{redirect:response}},
    './config':{appOrigin:()=> 'https://app.example.test',googleReady:()=>true,oauthCookieName:()=> 'oauth',sessionCookieName:()=> 'session',secureCookies:()=>true},
    './crypto':{validToken,digest,sameSecret:(a,b)=>a===b},
    './db':{db:()=>({query:async(sql)=>{
      if(sql.includes('DELETE FROM app_auth.oauth_flows'))return [{verifier:'pkce',nonce:'nonce'}];
      if(sql.includes('SELECT u.id,u.banned'))return [{id:'google-user',banned:false}];
      if(sql.includes('UPDATE app_auth.users')){updates++;return [];}
      throw Error('Unexpected query');
    }})},
    './session':{createSession:async()=>{sessions++;return 'opaque-session';},sessionCookieOptions:()=>({httpOnly:true})},
    './http':{limit:async()=>{},networkKey:()=> 'test',parseEmail:x=>x,audit:async()=>{}},
  };
  const exports={};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/auth/google.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
    exports,require:name=>mocks[name]??{},URL,URLSearchParams,AbortSignal,process:{env:{GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret'}},fetch:async()=>({ok:true,json:async()=>({id_token:'signed-token'})}),
  });
  const request={nextUrl:new URL('https://app.example.test/api/auth/google/callback?state='+state+'&code=code'),cookies:{get:()=>({value:state})}};
  let r=await exports.finishGoogle(request);assert.equal(r.url,'https://app.example.test/dashboard');assert.equal(sessions,1);assert.equal(updates,1);assert.ok(cookieChanges.some(c=>c[0]==='session'));
  verified=false;r=await exports.finishGoogle(request);assert.match(r.url,/sign-in\?error=oauth/);assert.equal(sessions,1);
});
