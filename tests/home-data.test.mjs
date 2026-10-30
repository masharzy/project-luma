import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function loadData(){
 const source=fs.readFileSync('src/lib/home-data.ts','utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 vm.runInNewContext(compiled,{exports:module.exports,module,require:(name)=>name==='next/cache'?{unstable_cache:fn=>fn}:name==='server-only'?{}:name==='@/lib/auth/db'?{db:()=>({query:async()=>[]})}:{freePolicy:async()=>({free_writing:5,free_speaking:2})}});
 return module.exports;
}
test('catalog strings cannot inject HTML and links remain encoded',()=>{
 const {shelfMarkup}=loadData();const html=shelfMarkup({range:'1–22',total:2,series:[{slug:'evil/"<',name:'<img src=x onerror=alert(1)>'}]});
 assert.match(html,/1–22/);assert.ok(!html.includes('<img'));assert.match(html,/&lt;img/);assert.match(html,/evil%2F%22%3C/);assert.match(html,/data-total="2"/);
});
test('allowance dots are capped visually without losing the true accessible count',()=>{
 const {allowanceMarkup}=loadData();const html=allowanceMarkup(12);
 assert.equal((html.match(/<i>/g)||[]).length,8);assert.match(html,/12 AI evaluations each month/);assert.match(html,/>\+4</);assert.match(allowanceMarkup(null),/unavailable/);assert.ok(!allowanceMarkup(null).includes('5 AI'));
});
test('shelf has at most twelve SSR spines but retains total for overflow count',()=>{
 const {shelfMarkup}=loadData();const html=shelfMarkup({range:'1–21',total:21,series:Array.from({length:20},(_,i)=>({slug:'series-'+i,name:'Series '+i}))});
 assert.equal((html.match(/jtn-sn /g)||[]).length,12);assert.match(html,/data-total="21"/);
});
