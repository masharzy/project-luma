import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path) {
 const module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports});
 return module.exports;
}
const {presentPlans,creditPercent,creditText}=load('src/lib/plan-presentation.ts');
const record=(id,extra={})=>({id,name:'Plan '+id,description:'Real admin description',price_bdt:1199,writing_limit:20,speaking_limit:8,published:true,...extra});
test('admin data stays authoritative: inactive/free removed, ordering and one recommendation enforced',()=>{
 const {paid,free}=presentPlans([record('hidden',{published:false}),record('later',{sort_order:9,recommended:true}),record('first',{sort_order:1,recommended:true}),record('free',{name:'Free',price_bdt:0,is_free:true,writing_limit:7,speaking_limit:3})],{free_writing:5,free_speaking:2});
 assert.deepEqual(Array.from(paid,p=>p.id),['first','later']);assert.equal(paid.filter(p=>p.recommended).length,1);
 assert.equal(paid[0].tagline,'Real admin description');assert.equal(free.writingCredits,7);assert.equal(free.speakingCredits,3);
});
test('existing free-policy record, zero credits and unlimited allowances are preserved',()=>{
 const {paid,free}=presentPlans([record('zero',{writing_limit:0}),record('unlimited',{speaking_limit:null})],{free_writing:5,free_speaking:2});
 assert.equal(paid[0].writingCredits,0);assert.equal(paid[1].speakingCredits,null);assert.equal(creditText(null),'Unlimited');assert.equal(free.writingCredits,5);
 assert.equal(creditPercent(0,[0,0]),0);assert.equal(creditPercent(10,[10,20]),50);assert.equal(creditPercent(null,[0,null]),100);
});
test('0–7 active plan counts survive adaptation without sample data or truncated labels',()=>{
 for(let n=0;n<=7;n++){const {paid}=presentPlans(Array.from({length:n},(_,i)=>record(String(i),{name:'A long actual administrator plan name '+i})),{free_writing:0,free_speaking:0});assert.equal(paid.length,n);for(const p of paid)assert.ok(p.name.startsWith('A long actual'));}
});
test('membership sign-in preserves only a validated first-party plan selection',()=>{
 const {mockReturnPath}=load('src/lib/auth/return-path.ts');
 const path='/dashboard/subscription?plan=11111111-1111-4111-8111-111111111111';
 assert.equal(mockReturnPath(path),path);assert.equal(mockReturnPath('/mocks/42'),'/mocks/42');
 for(const value of ['https://evil.test','//evil.test','/dashboard/subscription?plan=x&next=//evil.test','/dashboard/subscription/evil','javascript:alert(1)'])assert.equal(mockReturnPath(value),'/dashboard');
});
