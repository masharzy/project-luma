import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const m={exports:{}};
new Function('module','exports',ts.transpileModule(readFileSync(new URL('../src/lib/products/speaking-feedback-data.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);
const {feedbackAnswers,feedbackSpans,transcriptLines}=m.exports;
const base=(text)=>({step:12,verbatim:text,uncertain:[],corrections:[],strengths:[],pronunciation:[]});
test('maps rich answers by saved step IDs without dropping legacy transcripts',()=>{
 const fallback=[{step:0,verbatim:'First.',uncertain:[]},{step:12,verbatim:'Saved answer.',uncertain:[]}];
 const result=feedbackAnswers({answers:[{step:12,verbatim:'Do not replace saved text',corrections:[{original:'answer',corrected:'response',reason:'Example'}]}]},fallback);
 assert.deepEqual(result.map(a=>a.step),[0,12]);assert.equal(result[1].verbatim,'Saved answer.');assert.equal(result[1].corrections[0].reason,'Example');assert.equal(result[0].corrections.length,0);
});
test('old result format and malformed optional details remain readable',()=>{
 const fallback=[{step:12,verbatim:'Hello.',uncertain:[]}];
 assert.equal(feedbackAnswers(null,fallback)[0].verbatim,'Hello.');
 assert.equal(feedbackAnswers({transcripts:[{step:12,corrections:[{original:'Hello',corrected:'Hi',reason_bn:'Greeting'}]}]},fallback)[0].corrections[0].reason,'Greeting');
});
test('unchanged and fabricated edits never become inline error marks',()=>{
 const a=base('I read books.');a.corrections=[{original:'I read',corrected:'I read'},{original:'I wrote',corrected:'I write'},{original:'books',corrected:'novels'}];
 const spans=feedbackSpans(a);assert.equal(spans.length,1);assert.equal(spans[0].index,2);assert.equal(a.verbatim.slice(spans[0].start,spans[0].end),'books');assert.equal(a.corrections.length,3);
});
test('uncertain hearing takes precedence over overlapping corrections and strengths',()=>{
 const a=base('I wore headphones.');a.uncertain=['wore'];a.corrections=[{original:'wore headphones',corrected:'rode headphones'}];a.strengths=[{quote:'I wore headphones.',why:'Example'}];
 assert.deepEqual(feedbackSpans(a).map(s=>s.kind),['uncertain']);
});
test('overlapping suggestions do not duplicate candidate text; repeated distinct occurrences can be anchored',()=>{
 const a=base('books gives books gives');a.corrections=[{original:'books gives',corrected:'books give'},{original:'books gives',corrected:'books give'}];
 const spans=feedbackSpans(a);assert.equal(spans.length,2);assert(spans[0].end<=spans[1].start);
});
test('line offsets preserve unicode, punctuation and the complete words being annotated',()=>{
 const text='😊 I read books. They help me.\nবাংলা কথা';const lines=transcriptLines(text);
 assert.deepEqual(lines.map(l=>text.slice(l.start,l.end)),['😊 I read books.','They help me.','বাংলা কথা']);
 const a=base(text);a.corrections=[{original:'They help',corrected:'They helped'}];const span=feedbackSpans(a)[0];assert.equal(text.slice(span.start,span.end),'They help');assert(lines.some(l=>l.start<=span.start&&span.end<=l.end));
});
