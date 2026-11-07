import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const words=JSON.parse(readFileSync(new URL('../src/data/vocabulary.json',import.meta.url),'utf8'));
test('vocabulary data is complete and unique',()=>{
 assert.ok(words.length>=1500);
 assert.equal(new Set(words.map(w=>w.word)).size,words.length);
 assert.deepEqual(words.map(w=>w.position),words.map((_,i)=>i+1));
 for(const w of words){
  assert.equal(w.examples.length,2);
  assert.equal(w.test.sentence.split('_____').length,2);
  assert.equal(w.test.distractors.length,3);
  assert.match(w.meaning_bn,/[ঀ-৿]/);
 }
});
test('free words (first 100) are all core',()=>{
 assert.ok(words.slice(0,100).every(w=>w.tier==='core'));
});
