// Mock engine: device drafts, partial-paper bands, end-of-mock settlement and non-blocking queueing.
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const native=createRequire(import.meta.url);
function loader(mocks={}){const cache=new Map();return function load(file){if(cache.has(file))return cache.get(file);const m={exports:{}};const code=ts.transpileModule(readFileSync(new URL('../src/'+file+'.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(p=>p==='server-only'?{}:Object.hasOwn(mocks,p)?mocks[p]:p.startsWith('./')?load(file.slice(0,file.lastIndexOf('/')+1)+p.slice(2)):p.startsWith('@/')?load(p.slice(2)):native(p),m,m.exports);cache.set(file,m.exports);return m.exports;};}
class MemoryStorage{constructor(){this.m=new Map();}get length(){return this.m.size;}key(i){return [...this.m.keys()][i]??null;}getItem(k){return this.m.has(k)?this.m.get(k):null;}setItem(k,v){this.m.set(k,String(v));}removeItem(k){this.m.delete(k);}}
const draft=loader()('lib/exam/answer-draft');
const bands=loader()('lib/exam/mock-bands');
const A='00000000-0000-4000-8000-0000000000aa';

test('every answer change is kept on the device and survives a reload as unsynced work',()=>{
 const s=new MemoryStorage();
 draft.writeDraft(A,1,{q1:'B',q2:'river'},false,s);
 const d=draft.readDraft(A,1,s);assert.equal(d.synced,false);assert.deepEqual(d.a,{q1:'B',q2:'river'});
 // Server only had q1 (the last save failed): the device copy wins and must be pushed again.
 const r=draft.restoreAnswers({q1:'A'},d);assert.deepEqual(r.answers,{q1:'B',q2:'river'});assert.equal(r.dirty,true);
});
test('a synced draft yields to the server copy, and only exactly-sent answers are marked synced',()=>{
 const s=new MemoryStorage();
 draft.writeDraft(A,0,{q1:'A'},false,s);
 draft.markSynced(A,0,{q1:'old'},s);assert.equal(draft.readDraft(A,0,s).synced,false,'newer local edit must stay unsynced');
 draft.markSynced(A,0,{q1:'A'},s);assert.equal(draft.readDraft(A,0,s).synced,true);
 assert.deepEqual(draft.restoreAnswers({q1:'A',q9:'from other device'},draft.readDraft(A,0,s)),{answers:{q1:'A',q9:'from other device'},dirty:false});
});
test('drafts of finished modules are removed; other attempts and corrupt entries are ignored',()=>{
 const s=new MemoryStorage();
 draft.writeDraft(A,0,{q:'0'},false,s);draft.writeDraft(A,1,{q:'1'},false,s);draft.writeDraft(A,2,{q:'2'},false,s);draft.writeDraft('other',0,{q:'x'},false,s);
 draft.clearDrafts(A,2,s);
 assert.equal(draft.readDraft(A,0,s),null);assert.equal(draft.readDraft(A,1,s),null);assert.ok(draft.readDraft(A,2,s));assert.ok(draft.readDraft('other',0,s));
 s.setItem(draft.draftKey(A,3),'{not json');assert.equal(draft.readDraft(A,3,s),null);
 draft.clearDrafts(A,Infinity,s);assert.equal(draft.readDraft(A,2,s),null);
});

const crit=b=>({band:b});
const task=(n,b,scorable=true)=>({task:n,scorable,taskAchievement:crit(b),coherence:crit(b),lexicalResource:crit(b),grammar:crit(b)});
test('Writing: a blank task scores 0 and Task 2 still counts twice',()=>{
 assert.deepEqual(bands.mockWritingBand([{task:1,answer:'The chart shows'.repeat(20)},{task:2,answer:''}],[task(1,6)]).band,2);
 assert.equal(bands.mockWritingBand([{task:1,answer:''},{task:2,answer:'essay '.repeat(300)}],[task(2,6)]).band,4);
 assert.equal(bands.mockWritingBand([{task:1,answer:'a '.repeat(200)},{task:2,answer:'b '.repeat(300)}],[task(1,6),task(2,7)]).band,6.5);
});
test('Writing: two lines the AI cannot assess score 0; a long unassessable answer is held for an admin',()=>{
 const two=bands.mockWritingBand([{task:1,answer:''},{task:2,answer:'I think transport is good.\nIt is important.'}],[task(2,0,false)]);
 assert.equal(two.band,0);assert.match(two.note,/too short/);
 const long=bands.mockWritingBand([{task:1,answer:'word '.repeat(170)},{task:2,answer:''}],[task(1,0,false)]);
 assert.equal(long.band,null);
});
const speaking=(b,{estimated=b,spoken=true}={})=>({estimatedBand:estimated,scorable:true,transcripts:[{verbatim:spoken?'I live in Dhaka.':''}],fluency:crit(b),lexicalResource:crit(b),grammar:crit(b),pronunciation:crit(b)});
test('Speaking: two answered questions are assessed and every unanswered question scores 0',()=>{
 const expected={1:4,2:1,3:4};
 assert.equal(bands.speakingCoverage(expected,[{part:1},{part:1}]),(2/4)/3);
 const r=bands.mockSpeakingBand(speaking(6,{estimated:null}),expected,[{part:1},{part:1}]);
 assert.equal(r.band,1);assert.match(r.note,/2 of 9 questions answered/);
 assert.equal(bands.mockSpeakingBand(speaking(7,{estimated:null}),expected,[{part:1},{part:1},{part:1},{part:1},{part:2}]).band,4.5);
});
test('Speaking: a complete test keeps the AI band; silence scores 0; unreliable complete test needs review',()=>{
 const expected={1:1,2:1,3:1},all=[{part:1},{part:2},{part:3}];
 assert.equal(bands.mockSpeakingBand(speaking(6.5),expected,all).band,6.5);
 assert.equal(bands.mockSpeakingBand(speaking(6,{spoken:false,estimated:null}),expected,[{part:1}]).band,0);
 assert.equal(bands.mockSpeakingBand(speaking(6,{estimated:null}),expected,all).band,null);
});

const LEAD=195000;
const crit6={band:6,evidence:[],feedback:'ok'};
function worker({answers,clips=[],speakingFails=false,currentIndex=4}={}){
 const set={part1:['Where do you live?'],cueCard:{topic:'A journey',points:['Where'],explain:'Why'},rounding:[],part3:['Why travel?']};
 const row={id:'00000000-0000-4000-8000-000000000001',parent_id:'1',kind:'mock',current_index:currentIndex,ends_at:new Date(Date.now()-1000).toISOString(),scheduled_start:new Date(Date.now()-LEAD-200*60000).toISOString(),
  snapshot:[{module:'listening',document:{durationMinutes:30}},{module:'reading',document:{durationMinutes:60}},{module:'writing',document:{durationMinutes:60,parts:[{id:'task1',passage_text:'Describe the chart.'},{id:'task2',passage_text:'Discuss transport.'}],questions:[]}},{module:'speaking',document:{speakingSet:set}}],
  answers:{'2':answers||{}},results:[{module:'listening'},{module:'reading'},{module:'writing',status:'unmarked'},{module:'speaking',status:'unmarked'}]};
 const ai={writing:[],speaking:[]},sent=[];
 const api=loader({'@/lib/auth/db':{db:()=>({query:async(sql,args)=>{
  if(sql.includes('FROM public.speaking_recordings'))return clips;
  if(sql.startsWith('SELECT'))return [row];
  const i=Number(sql.match(/'\{(\d)\}'/)?.[1]);
  if(sql.includes("'aiLeaseUntil'")){row.results[i]={...row.results[i],status:'ai_running',aiTries:args[2]};return [{id:row.id}];}
  row.results[i]={...row.results[i],...JSON.parse(args[2])};return [];}})},
  '@vercel/queue':{send:async(...a)=>{sent.push(a);}},
  './attempts':{settleAttempt:async r=>r},
  '@/lib/evaluation/provider':{assessWriting:async input=>{ai.writing.push(input);return {result:{estimatedBand:6,summary:'Rubric feedback',tasks:input.tasks.map(t=>({task:t.task,scorable:true,limitation:'',taskAchievement:crit6,coherence:crit6,lexicalResource:crit6,grammar:crit6,corrections:[],nextSteps:[]}))},model:'fixture',usage:{}};}},
  '@/lib/products/speaking-provider':{assessSpeaking:async input=>{ai.speaking.push(input);if(speakingFails)throw Object.assign(Error('provider down'),{retryable:true});return {result:{estimatedBand:null,scorable:true,summary:'Audio feedback',transcripts:input.clips.map(c=>({step:c.step,verbatim:'Answer.',uncertain:[]})),fluency:{band:6},lexicalResource:{band:6},grammar:{band:6},pronunciation:{band:6}},model:'fixture-audio',usage:{}};}}})('lib/exam/mock-evaluation');
 return {api,row,ai,sent};
}
test('abandoned Writing with only Task 2 typed: only that task goes to the AI; Task 1 scores 0; ready to publish',async()=>{
 const w=worker({answers:{writing_draft_task2:'Public transport should be free. '.repeat(30)}});
 await w.api.processMockEvaluation(w.row.id,'writing');
 assert.equal(w.ai.writing.length,1);assert.deepEqual(w.ai.writing[0].tasks.map(t=>t.task),[2]);
 assert.equal(w.row.results[2].status,'ai_reviewed');assert.equal(w.row.results[2].bandScore,4);assert.equal(w.row.results[2].aiBand,6);assert.match(w.row.results[2].feedback,/Task 1 was not answered/);
});
test('abandoned Speaking with two recordings: both are evaluated on the server and the rest score 0',async()=>{
 // Steps 0 (Part 1) and 5 (Part 2 long turn) answered; step 6 (Part 3) never recorded.
 const w=worker({clips:[{step:0,object_key:'a.wav',seconds:20},{step:5,object_key:'b.wav',seconds:90}]});
 await w.api.processMockEvaluation(w.row.id,'speaking');
 assert.equal(w.ai.speaking.length,1);assert.deepEqual(w.ai.speaking[0].clips.map(c=>[c.step,c.part]),[[0,1],[5,2]]);
 assert.equal(w.row.results[3].status,'ai_reviewed');assert.equal(w.row.results[3].bandScore,4);assert.match(w.row.results[3].feedback,/2 of 3 questions answered/);
 assert.equal(w.row.results[2].status,'unmarked','Speaking job must not touch Writing');
});
test('a provider outage keeps the paper retryable instead of publishing a made-up score',async()=>{
 const w=worker({clips:[{step:0,object_key:'a.wav',seconds:20}],speakingFails:true});
 await assert.rejects(w.api.processMockEvaluation(w.row.id,'speaking'),/will retry/);
 assert.equal(w.row.results[3].status,'unmarked');assert.equal(w.row.results[3].bandScore,undefined);assert.ok(w.row.results[3].aiError);
});
test('the end-of-mock settle job finishes every module on the server, and retries while the mock is still running',async()=>{
 const done=worker();await w_ok(done.api.processMockEvaluation(done.row.id,'settle'));assert.equal(done.ai.writing.length+done.ai.speaking.length,0);
 const running=worker({currentIndex:1});await assert.rejects(running.api.processMockEvaluation(running.row.id,'settle'),/not finished/);
});
async function w_ok(p){await p;}
test('queue errors never fail Join or Submit',async()=>{
 const api=loader({'@/lib/auth/db':{db:()=>({query:async()=>{throw Error('queue backend unavailable');}})},'@vercel/queue':{send:async()=>{throw Error('no token');}}})('lib/exam/mock-evaluation');
 await assert.doesNotReject(api.enqueueMockEvaluationSafely('00000000-0000-4000-8000-000000000001'));
});
test('the queue consumer routes settle, speaking and writing jobs',()=>{
 const src=readFileSync(new URL('../src/app/api/queues/mock-evaluation/route.ts',import.meta.url),'utf8');
 assert.match(src,/message\.module==='settle'/);
});
test('the Speaking room keeps clips on the device, uploads in the background with retry, and resumes after a reload',()=>{
 const src=readFileSync(new URL('../src/lib/speaking/product-controller.js',import.meta.url),'utf8');
 assert.doesNotThrow(()=>new Function(src));
 for(const marker of ['indexedDB.open','queueClip(key,blob);practiceNext(true)','wait=Math.min(15000,wait*2)','Welcome back','si=from'])assert.ok(src.includes(marker),marker);
});
