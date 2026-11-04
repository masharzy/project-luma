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
const {speakingEvidenceIssues}=coverage;
const evidenceAnswer=()=>({...answer(0),uncertain:[],corrections:[],strengths:[],pronunciation:[]});
const model=a=>({answers:[a],criteria:{grammar:{band:6,evidence:[{step:0,quote:a.verbatim}]}}});
test('evidence guards reject invented quotes and missing criterion support without mutating raw output',()=>{
 const a=evidenceAnswer();a.corrections=[{original:'unheard words',corrected:'replacement'}];
 const m=model(a),before=structuredClone(m);
 assert(speakingEvidenceIssues(m,[{step:0,seconds:5}]).includes('correction_not_verbatim:0'));
 assert.deepEqual(m,before);
 m.criteria.grammar.evidence=[];assert(speakingEvidenceIssues(m,[]).includes('criterion_without_evidence:grammar'));
});
test('silence, uncertain hearing, unchanged edits and out-of-range timestamps cannot become feedback',()=>{
 const a=evidenceAnswer();a.verbatim='I enjoy to go. [unclear]';a.uncertain=['[unclear]'];
 a.corrections=[{original:'[unclear]',corrected:'London'},{original:'I',corrected:'I'}];
 a.pronunciation=[{word:'enjoy',timestamp_seconds:12}];
 const errors=speakingEvidenceIssues(model(a),[{step:0,seconds:5}]);
 assert(errors.includes('correction_on_uncertain_speech:0'));assert(errors.includes('unchanged_correction:0'));assert(errors.includes('timestamp_out_of_bounds:0'));
 const silent={...evidenceAnswer(),verbatim:'',speech_status:'no_speech',strengths:[{quote:'Great answer'}]};
 assert(speakingEvidenceIssues({answers:[silent],criteria:{}},[]).includes('feedback_on_silence:0'));
});
test('all supported corrections remain allowed, including more than three per answer',()=>{
 const a=evidenceAnswer();a.corrections=Array.from({length:8},()=>({original:'I can',corrected:'I could'}));
 assert.deepEqual(speakingEvidenceIssues(model(a),[{step:0,seconds:5}]),[]);
 const provider=load('../src/lib/products/speaking-provider.ts',id=>id==='zod'?require(id):id==='./speaking-coverage'?coverage:{});
 assert.equal(provider.modelJsonFormat([0]).json_schema.schema.properties.answers.items.properties.corrections.maxItems,undefined);
});
