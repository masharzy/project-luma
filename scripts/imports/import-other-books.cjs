/* Validates every offline document before append-only, transactional DB writes. */
const fs=require('fs'),path=require('path');
const {neon}=require('@neondatabase/serverless');
const {normalizeDocument}=require('./exam-loader.cjs')('document');
const {normalizeSpeakingSet}=require('./ws-loader.cjs');
const config=require('./other-books-config.json');
const root='data/imports/other-books';
async function main(){
 const url=process.env.DATABASE_URL;if(!url)throw Error('DATABASE_URL required');const sql=neon(url);
 const reports=config.flatMap(b=>JSON.parse(fs.readFileSync(path.join(root,`report-${b.slug}.json`))));
 reports.push(...JSON.parse(fs.readFileSync(path.join(root,'report-ws.json'))));
 if(reports.length!==292||reports.some(r=>r.status!=='validated'))throw Error('All 292 modules must validate');
 const sets=[];
 for(const b of config)for(let test=1;test<=b.tests;test++){
  const docs={};for(const module of ['listening','reading','writing','speaking']){
   const raw=JSON.parse(fs.readFileSync(path.join(root,`${b.slug}-test-${test}-${module}.json`)));
   docs[module]=module==='speaking'?normalizeSpeakingSet(raw):normalizeDocument(raw,module);
  }sets.push({b,test,docs});
 }
 if(process.env.APPLY_MIGRATION==='1'){
  const migration=fs.readFileSync('migrations/020_other_books_speaking.sql','utf8').split(';').map(s=>s.trim()).filter(Boolean);
  await sql.transaction(migration.map(s=>sql.query(s)));
 }
 let saved=0,pending=[];
 for(const {b,test,docs} of sets){
  const title=`Test ${test}`;
  pending.push(
   sql.query(`INSERT INTO public.admin_content(kind,title,description,sections,access,status,book_slug,durations) SELECT 'practice',$1,$2,'["listening","reading","writing","speaking"]'::jsonb,'free','published',$3,'{"listening":30,"reading":60,"writing":60,"speaking":15}'::jsonb WHERE NOT EXISTS(SELECT 1 FROM public.admin_content WHERE kind='practice' AND book_slug=$3 AND title=$1)`,[title,`${b.title} Academic · Test ${test}`,b.slug]),
   ...['listening','reading','writing'].map(module=>sql.query(`INSERT INTO public.exam_modules(kind,parent_id,module,content_id,document) SELECT 'practice',id,$3,id,$4::jsonb FROM public.admin_content WHERE kind='practice' AND book_slug=$1 AND title=$2 ON CONFLICT(kind,parent_id,module) DO NOTHING`,[b.slug,title,module,JSON.stringify(docs[module])])),
   sql.query(`INSERT INTO public.speaking_sets(title,minutes,document,published,practice_content_id) SELECT $3,15,$4::jsonb,true,id FROM public.admin_content WHERE kind='practice' AND book_slug=$1 AND title=$2 AND NOT EXISTS(SELECT 1 FROM public.speaking_sets WHERE practice_content_id=admin_content.id)`,[b.slug,title,`${b.title} · Test ${test} · Speaking`,JSON.stringify(docs.speaking)])
  );saved++;if(saved%10===0||saved===sets.length){await sql.transaction(pending);pending=[];console.log(`Saved ${saved}/${sets.length}`);}
 }
 console.log(JSON.stringify(await sql.query(`SELECT c.book_slug,count(DISTINCT c.id)::int tests,count(DISTINCT (e.parent_id,e.module))::int modules,count(DISTINCT s.id)::int speaking FROM public.admin_content c JOIN public.exam_modules e ON e.kind='practice' AND e.parent_id=c.id LEFT JOIN public.speaking_sets s ON s.practice_content_id=c.id WHERE c.book_slug=ANY($1::text[]) GROUP BY c.book_slug ORDER BY c.book_slug`,[config.map(b=>b.slug)])));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
