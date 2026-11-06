import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const m={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/admin/cost-math.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module:m,exports:m.exports});
const {costOfUsage,bdt,planWorstCase,breakEvenSpeaking}=m.exports;
const price={model:'x',inputPerM:1,outputPerM:4,audioPerMin:0.5};
test('cost combines tokens and audio',()=>{assert.equal(costOfUsage({inputTokens:1e6,outputTokens:5e5,audioSeconds:120},price),1+2+1);});
test('missing price or missing component yields null, never zero',()=>{
 assert.equal(costOfUsage({inputTokens:1,outputTokens:1,audioSeconds:0},undefined),null);
 assert.equal(costOfUsage({inputTokens:10,outputTokens:1,audioSeconds:0},{...price,inputPerM:null}),null);
 assert.equal(costOfUsage({inputTokens:0,outputTokens:0,audioSeconds:60},{...price,audioPerMin:null,inputPerM:null}),null);
});
test('BDT needs a rate',()=>{assert.equal(bdt(2,null),null);assert.equal(bdt(2,120),240);});
test('plan margin: finite, unlimited and unknown',()=>{
 assert.equal(JSON.stringify(planWorstCase({priceBdt:1000,writingLimit:10,speakingLimit:5},10,50)),JSON.stringify({costBdt:350,marginBdt:650,unlimited:false}));
 assert.equal(planWorstCase({priceBdt:1000,writingLimit:null,speakingLimit:5},10,50).unlimited,true);
 assert.equal(planWorstCase({priceBdt:1000,writingLimit:10,speakingLimit:5},null,50).marginBdt,null);
 assert.equal(planWorstCase({priceBdt:0,writingLimit:0,speakingLimit:0},null,null).marginBdt,0);
});
test('break-even speaking count',()=>{assert.equal(breakEvenSpeaking(1000,200,50),16);assert.equal(breakEvenSpeaking(1000,200,null),null);});
