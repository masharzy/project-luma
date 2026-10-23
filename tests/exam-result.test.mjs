import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const nativeRequire=createRequire(import.meta.url);
const cache=new Map();
function load(name){if(cache.has(name))return cache.get(name);const source=readFileSync(new URL('../src/lib/exam/'+name+'.ts',import.meta.url),'utf8');const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});const module={exports:{}};new Function('require','module','exports',outputText)(p=>p.startsWith('./')?load(p.slice(2)):nativeRequire(p),module,module.exports);cache.set(name,module.exports);return module.exports;}
const {gradeModule}=load('result');
const document={parts:[{id:'p1'}],questions:[{id:'q1',part_id:'p1',question_type:'multiple_choice',correct_answer:'B'},{id:'q2',part_id:'p1',question_type:'short_answer',correct_answer:'train/rail'},{id:'q3',part_id:'p1',question_type:'list_selection',correct_answer:'A,C'}]};
test('objective results count accepted alternatives, partial multi-answer credit and blanks',()=>{const r=gradeModule('reading',document,{q1:'B',q2:' RAIL ',q3:'A,B'});assert.equal(r.correct,3);assert.equal(r.total,4);assert.equal(r.items[2].correct,false);assert.equal(r.bandScore,null);assert.equal(gradeModule('listening',document,{}).correct,0);});
test('writing is retained and counted without inventing a grade',()=>{const r=gradeModule('writing',{parts:[{id:'p1'},{id:'p2'}],questions:[{id:'w1',part_id:'p1'}]},{w1:'One two three',writing_draft_p2:'Four five'});assert.equal(r.wordCount,5);assert.equal(r.total,null);assert.equal(r.correct,null);assert.equal(r.items[0].answer,'One two three');assert.equal(r.items[1].answer,'Four five');});
