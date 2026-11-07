import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const zod=createRequire(import.meta.url)('zod');
function load(file,mocks){const mod={exports:{}};const js=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',js)(id=>{if(id in mocks)return mocks[id];throw Error('Unexpected dependency '+id)},mod,mod.exports);return mod.exports;}
test('Test access preserves guest free access, denies premium to guests, and binds active membership to account',async()=>{
 let calls=0;let active=false;const account='00000000-0000-4000-8000-000000000001';
 const a=load('src/lib/learner/test-access.ts',{'server-only':{},react:{cache:f=>f},'./content-grants':load('src/lib/learner/content-grants.ts',{}),'@/lib/plan-access':{planCoversTest:()=>false},'./member-access':{memberPlan:async()=>null,attemptedRecent:async()=>new Set()},'@/lib/auth/db':{db:()=>({query:async(sql,args)=>{calls++;assert.deepEqual(args,[account]);assert.match(sql,/status='active' AND starts_at<=now\(\) AND expires_at>now\(\)/);return [{allowed:active}];}})}});
 assert.equal(await a.canOpenTest('free',null),true);assert.equal(await a.canOpenTest('premium',null),false);assert.equal(calls,0);
 assert.equal(await a.canOpenTest('premium',account),false);active=true;assert.equal(await a.canOpenTest('premium',account),true);assert.equal(await a.canOpenTest('unknown',account),false);
});
test('Learner catalog separates free tests and excludes Premium tests from accounts without access',async()=>{
 let premium=false,grants=[],plan=null;const pa=load('src/lib/plan-access.ts',{zod});const rows=[{id:'1',access:'free'},{id:'2',access:'premium',kind:'cambridge',grp:'21'},{id:'3',access:'premium',kind:'practice',grp:null}];
 const a=load('src/lib/learner/catalog.ts',{'server-only':{},react:{cache:f=>f},'./test-access':{hasPremiumTests:async()=>premium,activeGrants:async()=>grants},'@/lib/plan-access':pa,'./member-access':{memberPlan:async()=>plan,attemptedRecent:async()=>new Set()},'./content-grants':load('src/lib/learner/content-grants.ts',{}),'@/lib/auth/db':{db:()=>({query:async()=>rows})}});
 let result=await a.learnerCatalog('account');assert.deepEqual(result.included,[]);assert.deepEqual(result.free,[rows[0]]);
 premium=true;plan={access:null,startsAt:'2026-01-01'};result=await a.learnerCatalog('account');assert.deepEqual(result.included,[rows[1],rows[2]]);assert.deepEqual(result.free,[rows[0]]);
 plan={access:{...pa.nothing,cambridge:{mode:'some',items:['21']}},startsAt:'2026-01-01'};result=await a.learnerCatalog('account');assert.deepEqual(result.included,[rows[1]]);
 plan={access:{...pa.nothing,recent:{mode:'all'}},startsAt:'2026-01-01'};result=await a.learnerCatalog('account');assert.deepEqual(result.included,[rows[2]]);plan=null;
 premium=false;grants=[{scope:'cambridge_book',ref:'21'}];result=await a.learnerCatalog('account');assert.deepEqual(result.included,[rows[1]]);
 grants=[{scope:'recent_test',ref:'3'}];result=await a.learnerCatalog('account');assert.deepEqual(result.included,[rows[2]]);
});

test('Content grants cover only the items an admin chose',()=>{
 const g=load('src/lib/learner/content-grants.ts',{});
 const book=[{scope:'cambridge_book',ref:'21'}];
 assert.equal(g.grantCovers(book,{kind:'cambridge',id:'9',book:'21'}),true);
 assert.equal(g.grantCovers(book,{kind:'cambridge',id:'9',book:'20'}),false);
 assert.equal(g.grantCovers(book,{kind:'practice',id:'9',book:null}),false);
 assert.equal(g.grantCovers([{scope:'recent_all',ref:null}],{kind:'practice',id:'5',book:null}),true);
 assert.equal(g.grantCovers([{scope:'recent_all',ref:null}],{kind:'practice',id:'5',book:'collins-1'}),false);
 assert.equal(g.grantCovers([{scope:'more_books_volume',ref:'collins-1'}],{kind:'practice',id:'5',book:'collins-1'}),true);
 assert.equal(g.grantCovers([{scope:'recent_test',ref:'5'}],{kind:'practice',id:'6',book:null}),false);
 assert.equal(g.grantCovers([{scope:'all_premium',ref:null}],{kind:'cambridge',id:'1',book:'3'}),true);
 assert.equal(g.grantCovers([],{kind:'cambridge',id:'1',book:'3'}),false);
});
test('Exam entry requests the exam document policy while dashboard navigation stays prefetched',()=>{
 const library=readFileSync('src/components/learner-test-library.tsx','utf8');
 assert.match(library,/<a key=\{module\} href=\{`\/exam\//);
 assert.match(library,/<a className="student-full-test"/);
 const launcher=readFileSync('src/components/exam/attempt-launcher.tsx','utf8');
 assert.match(launcher,/window\.location\.assign\('\/exam\/attempt\//);
 const shell=readFileSync('src/components/learner-shell.tsx','utf8');assert.match(shell,/prefetch=\{true\}/);
});
