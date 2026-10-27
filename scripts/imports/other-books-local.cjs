/* Offline conversion of the user's 18.zip. Only explicitly selected book folders. */
const fs=require('fs'),path=require('path');
const {JSDOM}=require('node:module').createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const {normalizeDocument}=require('./exam-loader.cjs')('document');
const {gradeModule}=require('./exam-loader.cjs')('result');
const config=require(process.env.IMPORT_CONFIG||'./other-books-config.json');
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>clean(s).toLowerCase().replace(/test 0+(\d+)/g,'test $1');
const root=process.argv[2],out=process.argv[3]||'data/imports/other-books';
fs.mkdirSync(out,{recursive:true});const reports=[];
for(const book of config.filter(b=>!process.env.BOOK_SLUG||b.slug===process.env.BOOK_SLUG))for(let test=1;test<=book.tests;test++)for(const module of ['listening','reading']){
 const dir=path.join(root,book.folder,`Test-${test}`),expectedTitle=`${book.title} Academic ${module[0].toUpperCase()+module.slice(1)} Test ${test}`,r={slug:book.slug,title:book.title,test,module,issues:[]};
 if(!fs.existsSync(path.join(dir,module+'.html')))continue;
 try{
  const answers={},byPart={},prefix=module==='listening'?'ila':'ira';
  for(let p=1;p<=(module==='listening'?4:3);p++){
   const raw=fs.readFileSync(path.join(dir,`${module}-part-${p}-answer.html`),'utf8'),dom=new JSDOM(raw),d=dom.window.document;
   if(book.slug==='succeed-ielts'&&test===5&&module==='reading'&&p===3){
    // The uploaded alternate answer page is OCI's exact SLEEP passage, not another test with the same title.
    const full=new JSDOM(fs.readFileSync(path.join(dir,'reading.html'),'utf8'));
    const source=clean(full.window.document.querySelector('#ielts-reading-transcript-3')?.textContent);
    const body=clean(d.querySelector('article')?.textContent||d.body.textContent);
    for(const anchor of ['WHY WE SLEEP','The Stages of Sleep','circadian rhythm'])if(!body.includes(anchor)||!clean(full.window.document.body.textContent).includes(anchor))throw Error('Alternate SLEEP page content mismatch');
    if(!source.includes('scientists have yet to determine exactly why people sleep'))throw Error('Alternate passage mismatch');
    const marker=[...d.querySelectorAll('p')].findIndex(x=>clean(x.textContent).startsWith('Answers:-Sleep'));
    const ps=[...d.querySelectorAll('p')].slice(marker+1);byPart[p]=[];
    for(const el of ps){const m=clean(el.textContent).match(/^(\d+)\.\s+(.+)$/);if(m&&+m[1]>=27&&+m[1]<=40){answers[+m[1]]=m[2];byPart[p].push(+m[1]);}}
    if(marker<0||byPart[p].join(',')!==Array.from({length:14},(_,i)=>i+27).join(','))throw Error('Alternate key numbering mismatch');
    full.window.close();dom.window.close();continue;
   }
   const sub=norm(d.querySelector(`.${prefix}-subtitle`)?.textContent);
   if(!sub.includes(norm(expectedTitle))||!new RegExp(`part ${p}\\b`).test(sub))r.issues.push(`Part ${p} key identity mismatch`);
   const rows=[...d.querySelectorAll(`.${prefix}-summary-table tr[data-q]`)];byPart[p]=rows.map(x=>+x.dataset.q);
   for(const row of rows){const n=+row.dataset.q;if(Object.hasOwn(answers,n))r.issues.push(`Duplicate key ${n}`);answers[n]=clean(row.querySelector(`.${prefix}-col-answer`)?.textContent).replace(/^[—–-]$/,'');}
   dom.window.close();
  }
  const html=fs.readFileSync(path.join(dir,module+'.html'),'utf8');
  const result=require(`./engnovate-${module}.cjs`).convert(html,{slug:book.slug,test,expectedTitle},{answers,byPart,issues:r.issues});
  const doc=normalizeDocument(result.document,module),slots=doc.questions.reduce((n,q)=>n+q.answerCount,0);
  r.issues=result.issues;
  if(slots!==result.answerSlots||Object.keys(answers).length!==slots)r.issues.push(`Source answer count mismatch ${slots}/${Object.keys(answers).length}`);
  for(const q of doc.questions)if(!q.correct_answer)r.issues.push(`Missing key ${q.id}`);
  const submitted=Object.fromEntries(doc.questions.map(q=>[q.id,q.question_type==='list_selection'?q.correct_answer:q.correct_answer_variants[0]]));
  const score=gradeModule(module,doc,submitted),blank=gradeModule(module,doc,{});
  if(score.correct!==slots||score.total!==slots||blank.correct!==0)r.issues.push(`Scoring mismatch ${score.correct}/${score.total}`);
  r.file=`${book.slug}-test-${test}-${module}.json`;r.slots=slots;r.images=result.images;r.sourceHash=result.identity.sourceHash;
  fs.writeFileSync(path.join(out,r.file),JSON.stringify(doc)+'\n');
 }catch(e){r.issues.push(e.message);}
 r.status=r.issues.length?'review':'validated';reports.push(r);
 if(global.gc)global.gc();
}
fs.writeFileSync(path.join(out,`report-${process.env.BOOK_SLUG||'all'}.json`),JSON.stringify(reports,null,2));
console.log(JSON.stringify({validated:reports.filter(r=>r.status==='validated').length,review:reports.filter(r=>r.status!=='validated').map(r=>({slug:r.slug,test:r.test,module:r.module,issues:r.issues}))}));
