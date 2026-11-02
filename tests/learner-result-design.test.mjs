import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const mod={exports:{}};new Function('module','exports',ts.transpileModule(readFileSync('src/lib/learner/results.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod,mod.exports);const{resultBadge,retakePath,speakingGroup,speakingBook}=mod.exports;
const attempt={id:'a',parentId:'12',kind:'cambridge',title:'Test',created_at:'2026-01-01',complete:true,available:true,published:true,modules:['reading'],results:[{module:'reading',bandScore:7,total:40}]};
test('Result cards preserve zero bands, hide unpublished scores and never invent a band for short practice',()=>{
 assert.equal(resultBadge({...attempt,results:[{module:'reading',bandScore:0,total:40}]}).band,0);
 assert.equal(resultBadge({...attempt,published:false}).band,null);
 assert.equal(resultBadge({...attempt,notStarted:true}).band,null);assert.match(resultBadge({...attempt,notStarted:true}).reason,/not submitted/);
 assert.match(resultBadge({...attempt,published:false}).reason,/not been published/);
 assert.equal(resultBadge({...attempt,results:[{module:'reading',bandScore:null,total:10}]}).band,null);
 assert.match(resultBadge({...attempt,results:[{module:'reading',bandScore:null,total:10}]}).reason,/40-question/);
 assert.match(resultBadge({...attempt,modules:['writing'],results:[{module:'writing',bandScore:null,status:'failed'}]}).reason,/could not be completed/);
});
test('Only four complete skill bands produce an overall band; incomplete modules keep a skill label',()=>{
 const a={...attempt,modules:['listening','reading','writing','speaking'],results:[['listening',7],['reading',7],['writing',6.5],['speaking',6.5]].map(([module,bandScore])=>({module,bandScore}))};
 assert.equal(resultBadge(a).label,'Overall band');assert.equal(resultBadge(a).band,7);
 const incomplete={...a,results:a.results.slice(0,2)};assert.equal(resultBadge(incomplete).label,'Listening band');assert.match(resultBadge(incomplete).reason,/Writing, Speaking/);
});
test('Retakes use the original parent and selection, never a previous attempt or a scheduled mock',()=>{
 assert.equal(retakePath(attempt),'/exam/cambridge/12/reading');assert.equal(retakePath({...attempt,modules:['listening','reading','writing']}),'/exam/cambridge/12/full');assert.equal(retakePath({...attempt,kind:'mock'}),null);assert.equal(retakePath({...attempt,parentId:undefined}),null);
});
test('Speaking collections follow the requested priority and book grouping strips only the test suffix',()=>{
 assert.deepEqual(['Collins 1 · Test 1','Practice Tests Plus 1 · Test 1','The Official Cambridge Guide · Test 1','Cambridge 12 · Test 2'].sort((a,b)=>speakingGroup(a).order-speakingGroup(b).order).map(t=>speakingGroup(t).key),['cambridge','official','plus','collins']);
 assert.equal(speakingBook('Cambridge 12 · Test 2 · Speaking'),'Cambridge 12');assert.equal(speakingBook('Practice Tests Plus 1 · Test 1 · Speaking'),'Practice Tests Plus 1');
});
