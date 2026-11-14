import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const load=processSpeaking=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(new URL('../src/app/api/queues/speaking-evaluation/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(id=>id==='@vercel/queue'?{handleCallback:f=>f}:{processSpeaking},m,m.exports);return m.exports;};
const id='12345678-1234-4234-8234-123456789002';
test('external mode hands off only a job ID and never runs the model inside Vercel',async()=>{
 const oldUrl=process.env.SPEAKING_WORKER_URL,oldToken=process.env.SPEAKING_WORKER_TOKEN,oldFetch=globalThis.fetch;
 let calls=0,sent;process.env.SPEAKING_WORKER_URL='https://speaking.example.com';process.env.SPEAKING_WORKER_TOKEN='x'.repeat(48);
 globalThis.fetch=async(url,opts)=>{sent={url:String(url),...opts};return new Response('{}',{status:202});};
 try{await load(async()=>calls++).POST({id});assert.equal(calls,0);assert.equal(sent.url,'https://speaking.example.com/jobs');assert.deepEqual(JSON.parse(sent.body),{id});assert.equal(sent.headers.Authorization,'Bearer '+'x'.repeat(48));assert.ok(sent.signal,'handoff has a timeout');}finally{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SPEAKING_WORKER_URL;else process.env.SPEAKING_WORKER_URL=oldUrl;if(oldToken===undefined)delete process.env.SPEAKING_WORKER_TOKEN;else process.env.SPEAKING_WORKER_TOKEN=oldToken;}
});
const env=async(vars,fn)=>{const old={url:process.env.SPEAKING_WORKER_URL,token:process.env.SPEAKING_WORKER_TOKEN},oldFetch=globalThis.fetch;for(const [k,v] of Object.entries(vars))if(v===undefined)delete process.env[k];else process.env[k]=v;try{await fn();}finally{globalThis.fetch=oldFetch;for(const [k,v] of [['SPEAKING_WORKER_URL',old.url],['SPEAKING_WORKER_TOKEN',old.token]])if(v===undefined)delete process.env[k];else process.env[k]=v;}};
// The in-process path claims the job atomically (status pending → running), so a job the worker did take is
// never evaluated twice; falling back keeps jobs from waiting forever when the worker is down or misconfigured.
test('a refused handoff falls back to the in-process evaluation instead of leaving the job pending',async()=>{
 await env({SPEAKING_WORKER_URL:'https://speaking.example.com',SPEAKING_WORKER_TOKEN:'x'.repeat(48)},async()=>{let calls=0;globalThis.fetch=async()=>new Response('{}',{status:503});await load(async()=>calls++).POST({id});assert.equal(calls,1);});
});
test('a worker URL without a token (production misconfiguration) evaluates in-process without calling out',async()=>{
 await env({SPEAKING_WORKER_URL:'https://speaking.example.com',SPEAKING_WORKER_TOKEN:undefined},async()=>{let calls=0,fetched=0;globalThis.fetch=async()=>{fetched++;return new Response('{}');};await load(async()=>calls++).POST({id});assert.equal(calls,1);assert.equal(fetched,0);});
});
test('an unreachable worker (network error or timeout) also falls back',async()=>{
 await env({SPEAKING_WORKER_URL:'https://speaking.example.com',SPEAKING_WORKER_TOKEN:'x'.repeat(48)},async()=>{let calls=0;globalThis.fetch=async()=>{throw Object.assign(Error('timeout'),{name:'TimeoutError'});};await load(async()=>calls++).POST({id});assert.equal(calls,1);});
});
test('no worker configured: evaluates in-process',async()=>{
 await env({SPEAKING_WORKER_URL:undefined,SPEAKING_WORKER_TOKEN:undefined},async()=>{let calls=0;await load(async()=>calls++).POST({id});assert.equal(calls,1);});
});
