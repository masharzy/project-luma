import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const native=createRequire(import.meta.url);
const cache=new Map();
const calls=[];
const {questionType,validPracticeModules,validPracticeTypes}=load('lib/exam/question-types');
const freeDoc={schemaVersion:1,durationMinutes:30,audioUrl:'',parts:[{id:'p1',title:'Part 1',passage_text:'',
 audio_url:'https://assets.example/listening.mp3',question_groups:[{id:'g1',type:'source_html',ieltsQuestionType:'note_completion',sourceHeading:'Fill the notes',sourceHtml:'<div data-luma-question="q1"></div><div data-luma-question="q2"></div>'}]}],
 questions:[{id:'q1',part_id:'p1',group_id:'g1',question_type:'source_text',ieltsQuestionType:'note_completion',question_text:'',sourceNumbers:[1],correct_answer:'hotel'},
 {id:'q2',part_id:'p1',group_id:'g1',question_type:'source_text',ieltsQuestionType:'note_completion',question_text:'',sourceNumbers:[2],correct_answer:'car'}]};
const premiumDoc={schemaVersion:1,durationMinutes:60,audioUrl:'',parts:[{id:'p2',title:'Passage 2',passage_text:'SECRET PREMIUM PASSAGE',question_groups:[{id:'g2',type:'source_html',ieltsQuestionType:'true_false_not_given',sourceHtml:'<div data-luma-question="q3">SECRET PREMIUM QUESTION</div>'}]}],
 questions:[{id:'q3',part_id:'p2',group_id:'g2',question_type:'multiple_choice',ieltsQuestionType:'true_false_not_given',question_text:'Premium question',sourceNumbers:[13],correct_answer:'TRUE'}]};
const readingDoc={schemaVersion:1,durationMinutes:60,audioUrl:'',parts:[{id:'p3',title:'Passage 1',passage_text:'Reading context',question_groups:[{id:'g3',type:'source_html',ieltsQuestionType:'multiple_choice_single',sourceHeading:'Choose a letter',sourceHtml:'<div data-luma-question="q4"></div>'}]}],
 questions:[{id:'q4',part_id:'p3',group_id:'g3',question_type:'multiple_choice',ieltsQuestionType:'multiple_choice_single',question_text:'Which answer?',sourceNumbers:[9],correct_answer:'A'}]};
const rows=[
 {test_id:1,book_number:1,test_number:1,module:'listening',premium:false,document:freeDoc},
 {test_id:2,book_number:12,test_number:2,module:'reading',premium:true,document:premiumDoc},
 {test_id:3,book_number:2,test_number:3,module:'reading',premium:false,document:readingDoc},
];
class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
function load(file){
 if(cache.has(file))return cache.get(file);
 const source=readFileSync(new URL('../src/'+file+'.ts',import.meta.url),'utf8');
 const m={exports:{}};cache.set(file,m.exports);
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',output)(name=>{
   if(name==='server-only')return {};
   if(name==='@/lib/auth/db')return {db:()=>({query:async(sql,args)=>{calls.push({sql,args});return sql.includes('SELECT t.id AS test_id')?rows:[];}})};
   if(name==='@/lib/auth/crypto')return {digest:()=>'test-owner-hash'};
   if(name==='@/lib/auth/http')return {AuthHttpError:HttpError};
   if(name==='@/lib/exam/mock-scoring')return {isObjectiveQuestion:q=>Boolean(q.correct_answer)};
   if(name.startsWith('./'))return load(file.slice(0,file.lastIndexOf('/')+1)+name.slice(2));
   if(name.startsWith('@/'))return load(name.slice(2));
   return native(name);
 },m,m.exports);
 cache.set(file,m.exports);return m.exports;
}
const p=load('lib/exam/question-type-practice');
test('Recognizes imported IELTS types and enforces bounded inputs',()=>{
 assert.equal(questionType({question_type:'source_text',ieltsQuestionType:'note_completion'}),'note_completion');
 assert.equal(questionType({question_type:'list_selection',ieltsQuestionType:'multiple_choice_single'}),'multiple_choice_multiple');
 assert.equal(validPracticeModules(['listening','reading']),true);
 assert.equal(validPracticeModules(['listening','listening']),false);
 assert.equal(validPracticeModules(['writing']),false);
 assert.equal(validPracticeTypes(['matching_headings','note_completion']),true);
 assert.equal(validPracticeTypes(['INVALID!']),false);
});
test('Index requires both published book/test access and never exposes premium content',async()=>{
 const index=await p.loadQuestionIndex();assert.equal(index.length,4);
 assert.equal(index.filter(q=>q.premium).length,1);
 const catalog=p.publicQuestionCatalog(index,['listening','reading'],[],0);
 assert.equal(catalog.total,3);assert.equal(catalog.free,2);assert.equal(catalog.premium,1);
 assert.equal(catalog.types.find(t=>t.type==='note_completion').free,1);
 const publicJSON=JSON.stringify(catalog);
 assert.equal(publicJSON.includes('SECRET PREMIUM'),false);
 assert.equal(publicJSON.includes('Premium question'),false);
 assert.equal(publicJSON.includes('"correct_answer"'),false);
 assert.equal(catalog.items.find(q=>q.premium).preview,'');
 assert.match(calls[0].sql,/t.status='published' AND b.status='published'/);
});
test('One type or multiple types filter the entire question bank',async()=>{
 const index=await p.loadQuestionIndex();
 const notes=p.publicQuestionCatalog(index,['listening'],['note_completion'],0);
 assert.equal(notes.total,1);assert.equal(notes.free,1);assert.equal(notes.items[0].module,'listening');
 const combined=p.publicQuestionCatalog(index,['listening','reading'],['note_completion','multiple_choice_single'],0);
 assert.equal(combined.total,2);assert.equal(combined.free,2);
});
test('Custom snapshots preserve selected source HTML, audio and unique question keys',async()=>{
 const index=await p.loadQuestionIndex();
 const selected=[index[0],index[2],index[1]]; // listening 1&2 plus one Reading
 const snapshots=p.buildQuestionSnapshots(selected);
 assert.deepEqual(snapshots.map(s=>s.module),['listening','reading']);
 const l=snapshots[0].document;
 assert.equal(l.questions.length,2);
 assert.equal(l.parts.length,1);
 assert.ok(l.parts[0].audio_url.includes('listening.mp3'));
 assert.match(l.parts[0].question_groups[0].sourceHtml,/data-luma-question="qp-q-1"/);
 assert.match(l.parts[0].question_groups[0].sourceHtml,/data-luma-question="qp-q-2"/);
 assert.equal(new Set(snapshots.flatMap(s=>s.document.questions.map(q=>s.module+':'+q.id))).size,3);
});
test('Server starts only free published questions and rejects premium-only or oversized requests',async()=>{
 const index=await p.loadQuestionIndex();
 await assert.rejects(p.startQuestionTypeAttempt(index,['reading'],['true_false_not_given'],1,'owner',null),e=>e.status===409);
 await assert.rejects(p.startQuestionTypeAttempt(index,['listening'],[],41,'owner',null),e=>e.status===400);
 const id=await p.startQuestionTypeAttempt(index,['listening'],['note_completion'],2,'owner',null);
 assert.match(id,/^[a-f0-9-]{36}$/);
 const insert=calls.findLast(call=>call.sql.includes('INSERT INTO public.exam_attempts'));
 assert.equal(insert.args[2],'1');
 assert.equal(insert.args[6],10*60);
 const snapshot=JSON.parse(insert.args[4]);
 assert.equal(snapshot[0].document.questions.length,2);
 assert.equal(snapshot[0].document.questions[0].correct_answer!==undefined,true);
 const bothId=await p.startQuestionTypeAttempt(index,['listening','reading'],['note_completion','multiple_choice_single'],2,'owner',null);
 assert.match(bothId,/^[a-f0-9-]{36}$/);
 const bothInsert=calls.filter(call=>call.sql.includes('INSERT INTO public.exam_attempts')).at(-1);
 assert.deepEqual(JSON.parse(bothInsert.args[4]).map(s=>s.module),['listening','reading']);
});
test('Free preview keeps original page/images/blank fields without scoring keys; premium previews are denied',async()=>{const index=await p.loadQuestionIndex();const page=p.questionPreview(index,index[0].key);assert.match(page.group.sourceHtml,/data-luma-question/);assert.equal(page.questions.length,2);assert.equal(JSON.stringify(page).includes('correct_answer'),false);assert.equal(JSON.stringify(page).includes('hotel'),false);assert.throws(()=>p.questionPreview(index,index.find(q=>q.premium).key),e=>e.status===404);});
test('Exact selection starts precisely the chosen question and refuses locked or unknown keys',async()=>{const index=await p.loadQuestionIndex();await p.startQuestionTypeAttempt(index,['listening'],[],1,'owner',null,[index[1].key]);const insert=calls.findLast(q=>q.sql.includes('INSERT INTO public.exam_attempts'));const doc=JSON.parse(insert.args[4])[0].document;assert.equal(doc.questions.length,1);assert.deepEqual(doc.questions[0].sourceNumbers,[2]);await assert.rejects(p.startQuestionTypeAttempt(index,['listening','reading'],[],1,'owner',null,[index.find(q=>q.premium).key]),e=>e.status===409);await assert.rejects(p.startQuestionTypeAttempt(index,['listening'],[],2,'owner',null,[index[0].key,index[0].key]),e=>e.status===400);});
test('Official Listening completion variants remain visible and explicit source instructions refine generic imports',async()=>{const catalog=p.publicQuestionCatalog(await p.loadQuestionIndex(),['listening'],[],0);assert.ok(catalog.types.some(t=>t.type==='form_completion'&&t.total===0));assert.equal(questionType({ieltsQuestionType:'note_completion'},{sourceHtml:'<p>Complete the form below.</p>'}),'form_completion');assert.equal(questionType({ieltsQuestionType:'note_completion'},{sourceHtml:'<p>Complete the flow-chart below.</p>'}),'flowchart_completion');});
test('Native reviewed questions keep reference images and render numbered note gaps in page previews',async()=>{const index=await p.loadQuestionIndex();const native={...index[0],group:{id:'native',type:'note_completion',groupText:'<p>Name: [[1]]</p>',referenceImage:'https://assets.example/chart.png',instructions:'Complete the notes.'}};const page=p.questionPreview([native],native.key);assert.match(page.group.sourceHtml,/<img src="https:\/\/assets.example\/chart.png"/);assert.match(page.group.sourceHtml,/data-luma-question="q1"/);assert.doesNotMatch(page.group.sourceHtml,/\[\[1\]\]/);assert.equal(JSON.stringify(page).includes('correct_answer'),false);});

test('Catalog groups note fields and MCQ questions once, before filtering and pagination',async()=>{
 const index=await p.loadQuestionIndex();const notes=p.publicQuestionCatalog(index,['listening'],['note_completion'],0);
 assert.equal(notes.items.length,1);assert.equal(notes.items[0].questionCount,2);assert.equal(notes.items[0].number,'1–2');
 const mcq=index.filter(q=>!q.premium&&q.module==='listening').map(q=>({...q,type:'multiple_choice_single'}));
 assert.equal(p.publicQuestionCatalog(mcq,['listening'],['multiple_choice_single'],0).items.length,1);
 const many=Array.from({length:25},(_,g)=>Array.from({length:5},(_,i)=>({...index[0],key:'listening:'+g+':q'+i,source:{...index[0].source,test_id:g+100},group:{...index[0].group,id:'g'+g},question:{...index[0].question,order_index:i+1,sourceNumbers:[i+1]},questionOrder:i}))).flat();
 const first=p.publicQuestionCatalog(many,['listening'],[],0),last=p.publicQuestionCatalog(many,['listening'],[],1);
 assert.equal(first.total,25);assert.equal(first.items.length,24);assert.equal(last.items.length,1);assert.ok([...first.items,...last.items].every(g=>g.questionCount===5));
});
test('Selecting a group includes every field exactly once, including mixed-type source groups',async()=>{
 const index=(await p.loadQuestionIndex()).filter(q=>q.module==='listening');const mixed=index.map((q,i)=>({...q,type:i?'multiple_choice_single':'note_completion'}));
 await p.startQuestionGroupAttempt(mixed,['listening'],['multiple_choice_single'],1,'owner',null,[mixed[0].key]);
 const snapshot=JSON.parse(calls.findLast(c=>c.sql.includes('INSERT INTO public.exam_attempts')).args[4]);
 assert.equal(snapshot[0].document.questions.length,2);assert.deepEqual(snapshot[0].document.questions.map(q=>q.sourceNumbers),[[1],[2]]);
 await assert.rejects(p.startQuestionGroupAttempt(await p.loadQuestionIndex(),['reading'],[],1,'owner',null,[(await p.loadQuestionIndex()).find(q=>q.premium).key]),e=>e.status===409);
});

test('Mixed Cambridge and book/practice sources keep identical test, part, group and question IDs isolated',async()=>{
 const document=structuredClone(freeDoc);
 const index=p.buildQuestionIndex([
  {test_id:1,book_number:1,test_number:1,module:'listening',premium:false,document},
  {test_id:1,book_number:0,test_number:0,module:'listening',premium:false,kind:'practice',source_label:'Collins · Volume 1 · Test 1',document:{...document,audioUrl:'https://assets.example/collins.mp3',parts:document.parts.map(part=>({...part,audio_url:'https://assets.example/collins.mp3'}))}},
 ]);
 assert.equal(new Set(index.map(q=>q.key)).size,4);
 const catalog=p.publicQuestionCatalog(index,['listening'],[],0);assert.equal(catalog.items.length,2);assert.ok(catalog.items.some(g=>g.sourceLabel.includes('Collins')));
 const keys=catalog.items.map(g=>g.key);
 await p.startQuestionGroupAttempt(index,['listening'],[],2,'owner',null,keys);
 const snap=JSON.parse(calls.findLast(c=>c.sql.includes('INSERT INTO public.exam_attempts')).args[4])[0].document;
 assert.equal(snap.parts.length,2);assert.equal(snap.questions.length,4);
 assert.equal(new Set(snap.questions.map(q=>q.id)).size,4);
 assert.notEqual(snap.parts[0].question_groups[0].sourceHtml,snap.parts[1].question_groups[0].sourceHtml);
 assert.ok(snap.parts.some(part=>part.title.includes('Collins')&&part.audio_url.includes('collins.mp3')));
});
test('Shared selection rejects a stale group, premium tampering and oversized combined groups',async()=>{
 const index=p.buildQuestionIndex([{test_id:1,kind:'practice',book_number:0,test_number:0,module:'listening',premium:false,document:freeDoc}]);
 await assert.rejects(p.startQuestionGroupAttempt(index,['listening'],[],1,'owner',null,['practice:listening:999:q1']),e=>e.status===409);
 await assert.rejects(p.startQuestionGroupAttempt(index.map(q=>({...q,premium:true})),['listening'],[],1,'owner',null,[index[0].key]),e=>e.status===409);
 const huge=Array.from({length:41},(_,i)=>({...index[0],key:'practice:listening:1:q'+i,question:{...index[0].question,id:'q'+i}}));
 await assert.rejects(p.startQuestionGroupAttempt(huge,['listening'],[],1,'owner',null,[huge[0].key]),e=>e.status===400);
});

test('Questions from separate practice sources remain contiguous inside mixed snapshots',()=>{
 const index=p.buildQuestionIndex([1,2].map(id=>({test_id:id,book_number:0,test_number:0,module:'listening',premium:false,kind:'practice',source_label:'Source '+id,document:freeDoc})));
 const document=p.buildQuestionSnapshots(index)[0].document;
 assert.deepEqual(document.questions.map(q=>q.part_id),['qp-p-1','qp-p-1','qp-p-2','qp-p-2']);
});
