import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDocument, emptyDocument } from '../src/lib/exam/document.ts';
const groupTypes=['multiple_choice','true_false_ng','yes_no_ng','matching_headings','paragraph_matching','matching_features','matching_sentence_endings','sentence_completion','summary_completion','note_completion','table_completion','flowchart_completion','diagram_completion','short_answer'];
const fixture=()=>({schemaVersion:1,durationMinutes:60,audioUrl:'',parts:[{id:'part-1',passage_text:'<p>Reading passage</p>',question_groups:groupTypes.map((type,i)=>({id:'g-'+i,type,options:['A','B','C'],groupText:'',tableRows:[],diagramImage:'data:image/png;base64,example'}))}],questions:groupTypes.map((type,i)=>({temp_id:'q-'+i,part_id:'part-1',group_id:'g-'+i,question_type:type,question_text:'Question '+i,correct_answer:'A',order_index:i+1}))});
test('all original question-group fields and temporary IDs survive save/reload normalization',()=>{
 const doc=normalizeDocument(fixture(),'reading');
 assert.equal(doc.questions.length,groupTypes.length);assert.equal(doc.questions[0].id,'q-0');
 assert.deepEqual(normalizeDocument(JSON.parse(JSON.stringify(doc)),'reading'),doc);
 assert.equal(doc.parts[0].question_groups[12].diagramImage,'data:image/png;base64,example');
});
test('group ownership, duplicate IDs and dangling question references fail closed',()=>{
 let d=fixture();d.questions.push({...d.questions[0]});assert.throws(()=>normalizeDocument(d,'reading'),/Duplicate/);
 d=fixture();d.parts.push({id:'part-2',question_groups:[]});d.questions[0].part_id='part-2';assert.throws(()=>normalizeDocument(d,'reading'),/different part/);
 d=fixture();d.questions[0].part_id='missing';assert.throws(()=>normalizeDocument(d,'reading'),/missing parent/);
});
test('inline, table and flowchart gaps materialize once even before the editor debounce runs',()=>{
 const d={...emptyDocument('reading'),parts:[{temp_id:'p1',question_groups:[{id:'summary',type:'summary_completion',groupText:'First [[1]], second [[2]], repeat [[1]]'},{id:'table',type:'table_completion',tableRows:[['Name','[[3]]']]},{id:'flow',type:'flowchart_completion',flowchartData:{steps:[{id:'step',text:'[f4]'}]}}]}]};
 const first=normalizeDocument(d,'reading');assert.equal(first.questions.length,4);
 assert.deepEqual(normalizeDocument(first,'reading'),first);
 first.questions.push({...first.questions[0],id:'another'});assert.throws(()=>normalizeDocument(first,'reading'),/more than one/);
});
test('module limits and audio URL validation are enforced',()=>{
 assert.throws(()=>normalizeDocument({...fixture(),durationMinutes:0},'reading'),/time/);
 assert.throws(()=>normalizeDocument({...fixture(),audioUrl:'javascript:alert(1)'},'reading'),/HTTPS/);
 const d=fixture();d.parts=Array.from({length:4},(_,i)=>({id:'p'+i,question_groups:[]}));d.questions=[];
 assert.throws(()=>normalizeDocument(d,'reading'),/count/);assert.equal(normalizeDocument(d,'listening').parts.length,4);
});

test('multi-answer numbering survives answer-key removal without revealing the key',()=>{
 const d=fixture();d.parts[0].question_groups[0].ieltsQuestionType='multiple_choice_multiple';d.questions[0].correct_answer='A,C';
 const saved=normalizeDocument(d,'reading');assert.equal(saved.questions[0].answerCount,2);
 const learner=JSON.parse(JSON.stringify(saved));delete learner.questions[0].correct_answer;
 assert.equal(normalizeDocument(learner,'reading').questions[0].answerCount,2);
});
