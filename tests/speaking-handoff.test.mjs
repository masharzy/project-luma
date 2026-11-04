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
 try{await load(async()=>calls++).POST({id});assert.equal(calls,0);assert.equal(sent.url,'https://speaking.example.com/jobs');assert.deepEqual(JSON.parse(sent.body),{id});assert.equal(sent.headers.Authorization,'Bearer '+'x'.repeat(48));assert.equal(sent.signal,undefined);}finally{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SPEAKING_WORKER_URL;else process.env.SPEAKING_WORKER_URL=oldUrl;if(oldToken===undefined)delete process.env.SPEAKING_WORKER_TOKEN;else process.env.SPEAKING_WORKER_TOKEN=oldToken;}
});
test('a refused handoff never falls back to a second paid model invocation',async()=>{
 const oldUrl=process.env.SPEAKING_WORKER_URL,oldToken=process.env.SPEAKING_WORKER_TOKEN,oldFetch=globalThis.fetch;
 let calls=0;process.env.SPEAKING_WORKER_URL='https://speaking.example.com';process.env.SPEAKING_WORKER_TOKEN='x'.repeat(48);globalThis.fetch=async()=>new Response('{}',{status:503});
 try{await assert.rejects(load(async()=>calls++).POST({id}),/handoff failed/);assert.equal(calls,0);}finally{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SPEAKING_WORKER_URL;else process.env.SPEAKING_WORKER_URL=oldUrl;if(oldToken===undefined)delete process.env.SPEAKING_WORKER_TOKEN;else process.env.SPEAKING_WORKER_TOKEN=oldToken;}
});
