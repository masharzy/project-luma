// A stale Speaking job (queue message lost or pinned to an old deployment) is re-sent on the current deployment.
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const native=createRequire(import.meta.url);
function load(mocks){const m={exports:{}};const code=ts.transpileModule(readFileSync(new URL('../src/lib/products/speaking-jobs.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(p=>p==='server-only'?{}:Object.hasOwn(mocks,p)?mocks[p]:native(p),m,m.exports);return m.exports;}
test('stale pending and expired running jobs are re-queued with a fresh idempotency key',async()=>{
 const sent=[];let sql='';
 const api=load({'@vercel/queue':{send:async(...a)=>{sent.push(a);}},'@/lib/auth/db':{db:()=>({query:async(q)=>{sql=q;return [{id:'00000000-0000-4000-8000-000000000001',tries:0}];}})},'@/lib/auth/http':{AuthHttpError:class extends Error{}}});
 assert.equal(await api.requeueStaleSpeaking('u'),1);
 assert.match(sql,/status='pending' AND updated_at<now\(\)-interval '10 minutes'/);assert.match(sql,/status='running' AND lease_until<now\(\)/);
 assert.equal(sent[0][0],'luma-speaking-evaluation');assert.match(sent[0][2].idempotencyKey,/^speaking:00000000-0000-4000-8000-000000000001:requeue:\d+$/);
});
test('nothing stale: nothing is sent',async()=>{
 const sent=[];const api=load({'@vercel/queue':{send:async(...a)=>{sent.push(a);}},'@/lib/auth/db':{db:()=>({query:async()=>[]})},'@/lib/auth/http':{AuthHttpError:class extends Error{}}});
 assert.equal(await api.requeueStaleSpeaking('u'),0);assert.equal(sent.length,0);
});
