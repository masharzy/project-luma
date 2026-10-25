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
 assert.equal(catalog.total,4);assert.equal(catalog.free,3);assert.equal(catalog.premium,1);
 assert.equal(catalog.types.find(t=>t.type==='note_completion').free,2);
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
 assert.equal(notes.total,2);assert.equal(notes.free,2);assert.equal(notes.items[0].module,'listening');
 const combined=p.publicQuestionCatalog(index,['listening','reading'],['note_completion','multiple_choice_single'],0);
 assert.equal(combined.total,3);assert.equal(combined.free,3);
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
