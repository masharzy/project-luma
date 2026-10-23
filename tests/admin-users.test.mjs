import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
test('directory bounds search/filter/page and keeps search input out of SQL text',async()=>{
  const exports={}, queries=[];
  const source=ts.transpileModule(readFileSync('src/lib/admin/users.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(source,{exports,require:name=>name==='@/lib/auth/db'?{db:()=>({query:async(sql,args)=>{queries.push({sql,args});return sql.includes('count(*)')?[{total:21}]:[];}})}:{}});
  const parsed=exports.directoryInput({q:'x'.repeat(200),status:'injected',page:'-1'});
  assert.equal(parsed.q.length,100);assert.equal(parsed.status,'all');assert.equal(parsed.page,1);
  assert.equal(exports.directoryInput({q:['email'],status:['admins'],page:['2']}).status,'all');
  const malicious="' OR true; --";
  const result=await exports.getUserDirectory(exports.directoryInput({q:malicious,status:'admins',page:'9999999'}));
  assert.equal(result.page,2);assert.equal(result.pages,2);
  assert.equal(queries[1].args[0],malicious);assert.equal(queries[1].args[2],20);assert.equal(queries[1].args[3],20);
  assert.ok(!queries[1].sql.includes(malicious));assert.ok(!queries[1].sql.includes('SELECT *'));
});
