#!/usr/bin/env node
/**
 * Cambridge 1–21 preflight gate.
 *
 * Checks source identity coverage without treating a discovered URL as an imported exam.
 * Checks locally prepared, authorized normalized documents before any database write.
 * Safe: read-only. Run: node scripts/imports/audit-library.cjs
 * Optional: node scripts/imports/audit-library.cjs --documents data/imports/reviewed
 */
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/imports/source-manifest.json'), 'utf8'));
const id = (book,test,module) => `${book}:${test}:${module}`;
const expected = [];
for (let b=1;b<=21;b++) for(let t=1;t<=4;t++) for(const module of ['listening','reading']) expected.push(id(b,t,module));
const records = new Map(), urls = new Map(), issues = [];
for(const row of manifest) {
  const key=id(row.book,row.test,row.module);
  if (!expected.includes(key)) issues.push({type:'invalid_identity',key});
  if (records.has(key)) issues.push({type:'duplicate_identity',key});
  if (!/^https:\/\/practicepteonline\.com\//.test(row.url || '')) issues.push({type:'invalid_source_url',key,url:row.url});
  if (urls.has(row.url)) issues.push({type:'duplicate_url',key,other:urls.get(row.url)});
  records.set(key,row); urls.set(row.url,key);
}
const missing = expected.filter(x=>!records.has(x));
const documentsDir = (() => { const n=process.argv.indexOf('--documents');return n<0?null:process.argv[n+1] })();
const documentReports=[];
function validateDocument(doc,file) {
  const errors=[];
  if(doc.schemaVersion!==1) errors.push('invalid_schema_version');
  if(!Array.isArray(doc.parts)||doc.parts.length!==4) errors.push('expected_four_parts');
  if(!Array.isArray(doc.questions)) errors.push('missing_questions');
  const questions=doc.questions||[];
  const slots=[];
  const ids=new Set();
  for(const q of questions) {
    if(ids.has(q.id)) errors.push('duplicate_question_id:'+q.id);
    ids.add(q.id);
    if(q.correct_answer===undefined||q.correct_answer===null||q.correct_answer==='')errors.push('missing_key:'+q.id);
    const n=Number((q.id||'').match(/-q-(\d+)$/)?.[1]);
    const count=Number(q.answerCount||1);
    if(!Number.isInteger(n)||n<1||n>40) errors.push('unrecognized_question_number:'+q.id);
    else if(!Number.isInteger(count)||count<1||n+count-1>40)errors.push('invalid_answer_count:'+q.id);
    else for(let j=0;j<count;j++)slots.push(n+j);
  }
  const slotCounts=new Map();
  for(const n of slots)slotCounts.set(n,(slotCounts.get(n)||0)+1);
  for(let n=1;n<=40;n++)if(slotCounts.get(n)!==1)errors.push('slot_'+n+'_count_'+(slotCounts.get(n)||0));
  for(const p of doc.parts||[]) for(const g of p.question_groups||[]) {
    if(g.referenceImage && !/^data:image\//.test(g.referenceImage) && !/^https:\/\//.test(g.referenceImage))errors.push('invalid_reference_image:'+g.id);
    if(g.groupText && /<input\b/i.test(g.groupText))errors.push('raw_html_input:'+g.id);
  }
  if(doc.audioUrl && !/^https:\/\//.test(doc.audioUrl))errors.push('invalid_audio_url');
  return {file,questionObjects:questions.length,answerSlots:new Set(slots).size,errors};
}
if(documentsDir) {
  if(!fs.existsSync(documentsDir))issues.push({type:'missing_documents_directory',path:documentsDir});
  else for(const f of fs.readdirSync(documentsDir).filter(x=>x.endsWith('.json'))) {
    try {documentReports.push(validateDocument(JSON.parse(fs.readFileSync(path.join(documentsDir,f),'utf8')),f));}
    catch(e) {documentReports.push({file:f,errors:['invalid_json:'+e.message]});}
  }
}
const report = {
  expectedModules:168, discoveredModules:records.size, missing,
  manifestIssues:issues, reviewedDocuments:documentReports,
  validReviewedDocuments:documentReports.filter(x=>x.errors.length===0).length,
  publishReady:false,
  note:'Source discovery does NOT establish licensing, completeness, accuracy or publication readiness. Publishing requires manual source/answer/media review and rights verification.'
};
console.log(JSON.stringify(report,null,2));
if(missing.length||issues.length||documentReports.some(x=>x.errors.length))process.exitCode=1;
