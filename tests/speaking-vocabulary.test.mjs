import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
const m={exports:{}};new Function('require','module','exports',ts.transpileModule(readFileSync(new URL('../src/lib/products/speaking-vocabulary.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(()=>({}),m,m.exports);
const v=m.exports;
test('repeated content words fold plurals, skip function words and fillers, and need three uses',()=>{
 const p=v.vocabularyProfile([{part:1,level:'B1',texts:['I like my family. I always meet my family and friends, with friends, uh with family, with families.','They are my friends.']}]);
 assert.deepEqual(p.repeated,[{word:'family',count:4},{word:'friends',count:3}]);
 assert(!p.repeated.some(r=>['with','them','always','uh'].includes(r.word)));
});
test('overall level is the median part level and ignores silent parts',()=>{
 assert.equal(v.overallVocabularyLevel(['A2','B2','C1']),'B2');
 assert.equal(v.overallVocabularyLevel(['A2','C1']),'A2');
 assert.equal(v.overallVocabularyLevel([null,null]),null);
 assert.equal(v.vocabularyProfile([{part:1,level:null,texts:[]}]).level,null);
});
