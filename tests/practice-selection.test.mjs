import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const m={exports:{}};
new Function('exports',ts.transpileModule(readFileSync('src/lib/exam/practice-selection.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m.exports);
const {restorePracticeSelection,togglePracticeGroup}=m.exports;
const group=(key,questionCount=5)=>({key,module:'reading',questionCount,sourceLabel:'Book · Test 1',number:'1–5',type:'matching_headings'});
test('Selection survives serialization and contains only safe metadata across collections',()=>{
 let items=togglePracticeGroup([],group('reading:1:q1'));
 items=togglePracticeGroup(items,group('practice:reading:1:q1'));
 assert.equal(items.length,2);assert.deepEqual(restorePracticeSelection(JSON.parse(JSON.stringify(items))),items);
 assert.equal(togglePracticeGroup(items,items[0]).length,1);
 assert.deepEqual(restorePracticeSelection([{...items[0],correct_answer:'never store answers'}]),[items[0]]);
});
test('Invalid stored selections, duplicate keys and combined limits are rejected',()=>{
 assert.deepEqual(restorePracticeSelection('bad'),[]);
 assert.deepEqual(restorePracticeSelection([group('reading:1:q1'),group('reading:1:q1')]),[]);
 assert.deepEqual(restorePracticeSelection([group('reading:1:q1',30),group('practice:reading:1:q1',11)]),[]);
 assert.deepEqual(restorePracticeSelection([group('reading:1:bad<script>')]),[]);
 assert.deepEqual(restorePracticeSelection([{...group('reading:1:q1'),module:'listening'}]),[]);
 const ten=Array.from({length:10},(_,i)=>group('reading:1:q'+i,1));
 assert.equal(togglePracticeGroup(ten,group('reading:1:new',1)).length,10);
 const forty=[group('reading:1:q1',40)];assert.deepEqual(togglePracticeGroup(forty,group('reading:1:q2',1)),forty);
});
