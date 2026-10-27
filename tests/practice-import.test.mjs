import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const config=require('../scripts/imports/recent-actual-config.json');
const {normalizeDocument}=require('../scripts/imports/exam-loader.cjs')('document');
const {gradeModule}=require('../scripts/imports/exam-loader.cjs')('result');
const {normalizeSpeakingSet}=require('../scripts/imports/ws-loader.cjs');
const root='data/imports/practice-recent/';
const reports=config.flatMap(b=>JSON.parse(readFileSync(root+`report-${b.slug}.json`)));
reports.push(...JSON.parse(readFileSync(root+'report-ws.json')));
test('all 39 source tests retain exactly their supplied modules without exposing collection labels',()=>{
 assert.equal(reports.length,117);assert.equal(reports.filter(r=>r.status!=='validated').length,0);
 const counts={};const groups=new Set();
 for(const r of reports){counts[r.module]=(counts[r.module]||0)+1;groups.add(`${r.slug}/${r.test}`);
  const doc=JSON.parse(readFileSync(root+r.file));assert.doesNotMatch(JSON.stringify(doc),/recent actual/i);
  if(r.module==='speaking'){assert.equal(normalizeSpeakingSet(doc).sourceParts.length,3);continue;}
  const normalized=normalizeDocument(doc,r.module);
  if(r.module==='writing'){assert.equal(normalized.parts.length,2);continue;}
  const answers=Object.fromEntries(normalized.questions.map(q=>[q.id,q.question_type==='list_selection'?q.correct_answer:q.correct_answer_variants[0]]));
  const score=gradeModule(r.module,normalized,answers);assert.equal(score.correct,r.slots);assert.equal(score.total,r.slots);assert.equal(gradeModule(r.module,normalized,{}).correct,0);
 }
 assert.equal(groups.size,39);assert.deepEqual(counts,{listening:36,reading:39,writing:15,speaking:27});
});
