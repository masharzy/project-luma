import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const load=(path,req)=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(req,m,m.exports);return m.exports;};
const coverage=load('../src/lib/products/speaking-coverage.ts',require);
const {speakingCoverageIssues}=coverage;
const steps=[0,1,2,3,4,5,6,7,12,13,14,15,16,17,18];
const answer=step=>({step,verbatim:'I can answer this question.',speech_status:'speech'});
test('regression: three returned answers cannot cover fifteen saved recordings',()=>{
 const result=speakingCoverageIssues(steps.slice(0,3).map(answer),steps);
 assert.equal(result.length,12);assert(result.includes('missing_step:18'));
});
test('all fifteen exact steps pass, including non-contiguous Part 2/3 IDs',()=>assert.deepEqual(speakingCoverageIssues(steps.map(answer),steps),[]));
test('duplicate/unknown steps and contradictory empty speech fail',()=>{
 assert(speakingCoverageIssues([answer(0),answer(0),answer(999)],steps).includes('duplicate_step:0'));
 assert(speakingCoverageIssues([{...answer(0),verbatim:''}],[0]).includes('empty_speech:0'));
 assert(speakingCoverageIssues([{...answer(0),speech_status:'no_speech'}],[0]).includes('contradictory_no_speech:0'));
 assert.deepEqual(speakingCoverageIssues([{...answer(0),speech_status:'no_speech',verbatim:''}],[0]),[]);
});
test('provider schema requires exactly the submitted count and restricts step IDs',()=>{
 const provider=load('../src/lib/products/speaking-provider.ts',id=>id==='zod'?require(id):id==='./speaking-coverage'?coverage:{});
 const schema=provider.modelJsonFormat(steps).json_schema.schema.properties.answers;
 assert.equal(schema.minItems,15);assert.equal(schema.maxItems,15);assert.deepEqual(schema.items.properties.step.enum,steps);
});
