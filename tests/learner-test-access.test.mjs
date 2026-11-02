import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(file,mocks){const mod={exports:{}};const js=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',js)(id=>{if(id in mocks)return mocks[id];throw Error('Unexpected dependency '+id)},mod,mod.exports);return mod.exports;}
test('Test access preserves guest free access, denies premium to guests, and binds active membership to account',async()=>{
 let calls=0;let active=false;const account='00000000-0000-4000-8000-000000000001';
 const a=load('src/lib/learner/test-access.ts',{'server-only':{},react:{cache:f=>f},'@/lib/auth/db':{db:()=>({query:async(sql,args)=>{calls++;assert.deepEqual(args,[account]);assert.match(sql,/status='active' AND starts_at<=now\(\) AND expires_at>now\(\)/);return [{allowed:active}];}})}});
 assert.equal(await a.canOpenTest('free',null),true);assert.equal(await a.canOpenTest('premium',null),false);assert.equal(calls,0);
 assert.equal(await a.canOpenTest('premium',account),false);active=true;assert.equal(await a.canOpenTest('premium',account),true);assert.equal(await a.canOpenTest('unknown',account),false);
});
test('Learner catalog separates free tests and excludes Premium tests from accounts without access',async()=>{
 let premium=false;const rows=[{id:'1',access:'free'},{id:'2',access:'premium'}];
 const a=load('src/lib/learner/catalog.ts',{'server-only':{},react:{cache:f=>f},'./test-access':{hasPremiumTests:async()=>premium},'@/lib/auth/db':{db:()=>({query:async()=>rows})}});
 let result=await a.learnerCatalog('account');assert.deepEqual(result.included,[]);assert.deepEqual(result.free,[rows[0]]);
 premium=true;result=await a.learnerCatalog('account');assert.deepEqual(result.included,[rows[1]]);assert.deepEqual(result.free,[rows[0]]);
});
