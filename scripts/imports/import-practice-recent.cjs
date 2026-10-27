/* Offline archive import: learner-visible labels are Test - 1 ... Test - 15. */
const fs=require('fs'),path=require('path');
const {neon}=require('@neondatabase/serverless');
const {normalizeDocument}=require('./exam-loader.cjs')('document');
const {normalizeSpeakingSet}=require('./ws-loader.cjs');
const config=require('./recent-actual-config.json'),root='data/imports/practice-recent';
async function main(){
 const sql=neon(process.env.DATABASE_URL||'');
 const reports=config.flatMap(b=>JSON.parse(fs.readFileSync(path.join(root,`report-${b.slug}.json`))));
 reports.push(...JSON.parse(fs.readFileSync(path.join(root,'report-ws.json'))));
 if(reports.length!==117||reports.some(r=>r.status!=='validated'))throw Error('All 117 supplied modules must validate');
 const sets=[];let number=0;
 for(const b of config)for(let test=1;test<=b.tests;test++){
  const available=reports.filter(r=>r.slug===b.slug&&r.test===test),docs={};
  for(const r of available){const raw=JSON.parse(fs.readFileSync(path.join(root,r.file)));docs[r.module]=r.module==='speaking'?normalizeSpeakingSet(raw):normalizeDocument(raw,r.module);}
  if(!['listening','reading','writing','speaking'].every(module=>docs[module]))continue;
  if(/recent actual/i.test(JSON.stringify(docs)))throw Error('Source collection label must not appear in learner documents');
  sets.push({title:`Test - ${++number}`,source:`archive-${b.slug}-${test}`,docs});
 }
 if(number!==15)throw Error('Expected 15 complete source tests');
 if(process.env.APPLY_MIGRATION==='1')await sql.transaction(fs.readFileSync('migrations/021_practice_import_source.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean).map(s=>sql.query(s)));
 let pending=[],saved=0;
 for(const {title,source,docs} of sets){
  pending.push(sql.query(`INSERT INTO public.admin_content(kind,title,description,sections,access,status,book_slug,durations,import_source_key) SELECT 'practice',$1,'',$2::jsonb,'free','published',NULL,'{"listening":30,"reading":60,"writing":60,"speaking":15}'::jsonb,$3 WHERE NOT EXISTS(SELECT 1 FROM public.admin_content WHERE import_source_key=$3)`,[title,JSON.stringify(Object.keys(docs)),source]));
  for(const module of ['listening','reading','writing'])if(docs[module])pending.push(sql.query(`INSERT INTO public.exam_modules(kind,parent_id,module,content_id,document) SELECT 'practice',id,$2,id,$3::jsonb FROM public.admin_content WHERE import_source_key=$1 ON CONFLICT(kind,parent_id,module) DO NOTHING`,[source,module,JSON.stringify(docs[module])]));
  if(docs.speaking)pending.push(sql.query(`INSERT INTO public.speaking_sets(title,minutes,document,published,practice_content_id) SELECT $2,15,$3::jsonb,true,id FROM public.admin_content WHERE import_source_key=$1 AND NOT EXISTS(SELECT 1 FROM public.speaking_sets WHERE practice_content_id=admin_content.id)`,[source,title+' · Speaking',JSON.stringify(docs.speaking)]));
  saved++;if(saved%10===0||saved===sets.length){await sql.transaction(pending);pending=[];console.log(`Saved ${saved}/${sets.length}`);}
 }
 console.log(JSON.stringify(await sql.query(`SELECT c.title,c.sections,(SELECT count(*)::int FROM public.exam_modules e WHERE e.kind='practice' AND e.parent_id=c.id) exam_modules,(SELECT count(*)::int FROM public.speaking_sets s WHERE s.practice_content_id=c.id) speaking FROM public.admin_content c WHERE import_source_key LIKE 'archive-practice-source-%' ORDER BY c.id`)));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
