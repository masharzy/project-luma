/* Public-page converter. No authenticated or gated endpoints are used. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {JSDOM}=require('node:module').createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function variants(raw){
 let values=String(raw||'').split(/\s*\/\s*/).filter(Boolean).flatMap(s=>{let list=[''];for(const token of s.split(/(\([^)]*\))/g)){if(/^\(/.test(token))list=list.flatMap(p=>[p,p+token.slice(1,-1)]).slice(0,256);else list=list.map(p=>p+token);}return list.map(clean)});
 values=values.map(v=>v.replace(/(?<=\d),(?=\d)/g,''));return [...new Set(values)].filter(Boolean).join('/');
}
function keysFor(root,b,t){
 const saved=require('./reading-checkpoint.cjs').getCheckpoint(b,t);
 return {answers:saved.answers,issues:saved.issues,sourceByQuestion:saved.ownership};
}

function classify(text,el){
 if(/TRUE|FALSE/.test(text))return 'true_false_not_given';
 if(/YES|NO/.test(text))return 'yes_no_not_given';
 if(/heading/i.test(text))return 'matching_headings';
 if(/summary/i.test(text))return /box|list of words|words.*below/i.test(text)?'summary_completion_drag':'summary_completion';
 if(/table/i.test(text)||el.querySelector('table'))return 'table_completion';
 if(/diagram|label|flow.chart/i.test(text))return 'diagram_labelling';
 if(/sentence.*end|ending/i.test(text))return 'matching_sentence_endings';
 if(/paragraph.*contain|which paragraph/i.test(text))return 'matching_information';
 if(/choose|circle/i.test(text))return 'multiple_choice_single';
 if(/match|letter/i.test(text))return 'matching_features';
 if(/sentence/i.test(text))return 'sentence_completion';
 return 'short_answer';
}
function makeWordBank(host,d,group){
 const rows=[...host.querySelectorAll('p')].filter(p=>!p.querySelector('input,img')&&p.textContent.includes('|')&&p.textContent.split('|').every(x=>clean(x).length>0&&clean(x).length<60));
 if(!rows.length)return;
 const options=rows.flatMap(p=>p.textContent.split('|').map(clean));
 if(options.length<4)return;
 const table=d.createElement('div');table.className='ielts-word-bank source-word-bank';table.setAttribute('role','group');table.setAttribute('aria-label','Word bank');
 const grid=d.createElement('div');grid.className='ielts-word-bank-grid';table.append(grid);
 for(const word of options){const card=d.createElement('span');card.className='source-word-option';card.dataset.lumaDrag=word;card.textContent=word;grid.append(card);}
 rows[0].before(table);rows.forEach(p=>p.remove());group.wordBank=options;group.ieltsQuestionType='summary_completion_drag';
}
function sanitize(host,imageUrls,issues){
 for(const n of host.querySelectorAll('script,style,iframe,object,button,a,form,input,select'))n.remove();
 for(const img of host.querySelectorAll('img')){const src=img.getAttribute('data-src')||img.getAttribute('src');try{const u=new URL(src,'https://engnovate.com');if(u.protocol!=='https:')throw Error('bad');img.setAttribute('src',u.href);imageUrls.add(u.href);}catch{issues.push('Invalid image');img.remove();}}
 for(const card of host.querySelectorAll('[draggable="true"][data-value]'))card.setAttribute('data-luma-drag',card.getAttribute('data-value'));
 for(const el of host.querySelectorAll('*')){for(const a of [...el.attributes])if(!['class','src','alt','colspan','rowspan','width','height','role','aria-label'].includes(a.name)&&!a.name.startsWith('data-luma-'))el.removeAttribute(a.name);if(typeof el.className==='string')el.className=el.className.replace(/ielts-reading-/g,'source-');}
}

function convert(html,identity,keys){
 const title=html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0]||'',formStart=html.search(/<form[^>]*id\s*=\s*"ielts-reading-test-form"/),start=html.indexOf('<div id="ielts-reading-transcript-1"'),end=html.indexOf('</form>',formStart),parsed=new JSDOM(title+html.slice(start,end)),d=parsed.window.document,{book,test}=identity,prefix=`en-c${book}-t${test}-r`,issues=[...keys.issues],allNumbers=new Set(),imageUrls=new Set();
 if(!new RegExp(`Cambridge IELTS 0?${book} Academic Reading Test ${test}`).test(d.querySelector('h1')?.textContent||''))throw Error('Test identity mismatch');
 const sections=[...d.querySelectorAll('.ielts-reading-question-section')];if(sections.length!==3)throw Error('Expected three Parts');
 const document={schemaVersion:1,durationMinutes:60,audioUrl:'',parts:[],questions:[]};let ordinal=0;
 for(let pi=0;pi<3;pi++){
  const section=sections[pi],part={id:prefix+'-p'+(pi+1),title:'Part '+(pi+1),part_number:pi+1,passage_text:'',audio_url:'',question_groups:[]};
  const passage=d.querySelector(`#ielts-reading-transcript-${pi+1}`);if(!passage)issues.push('Missing passage '+(pi+1));

  const children=[...section.children];let group=null,htmlNodes=[];
  const finish=()=>{if(!group)return;const host=d.createElement('div');htmlNodes.forEach(n=>host.append(n.cloneNode(true)));
   for(const n of host.querySelectorAll('script,style,iframe,button,a,.ielts-reading-practice-section-button'))n.remove();
   group.sourceSectionId=group.sourceSectionId||host.querySelector('[data-dnd-group]')?.getAttribute('data-dnd-group');
   makeWordBank(host,d,group);
   const inputs=[...host.querySelectorAll('input[name^="ielts_reading_answer_"]'),...(passage?[...passage.querySelectorAll('input[name^="ielts_reading_answer_'+group.sourceSectionId+'_"]')]:[])];const byName=new Map();for(const input of inputs){const name=input.name.replace(/\[\]$/,'');if(!byName.has(name))byName.set(name,[]);byName.get(name).push(input);}
   for(const [name,controls] of byName){
    const first=controls[0],item=first.closest('.ielts-reading-question-item')||first.closest('.options-drop-zone')||first.parentElement;
    const numbers=[...item.querySelectorAll('.ielts-reading-question-number')].map(n=>Number(n.textContent.trim()));
    if(!numbers.length){issues.push('Unnumbered input '+name);continue;}
    const unique=[...new Set(numbers)];for(const n of unique){if(allNumbers.has(n))issues.push('Duplicate question '+n);allNumbers.add(n);}
    const n=unique[0],id=prefix+'-q'+n,kind=first.type,choice=['radio','checkbox'].includes(kind),multi=kind==='checkbox';
    let answer='';if(multi){const allowed=controls.map(c=>c.value),letters=[...new Set(unique.flatMap(n=>(keys.answers[n]||'').match(/\b[A-Z]\b/g)||[]))].filter(x=>allowed.includes(x));if(letters.length!==unique.length)issues.push('Uncertain multi-answer key '+unique.join('-'));answer=letters.join(',');}
    else {if(!keys.answers[n])issues.push('Missing answer '+n);answer=variants(keys.answers[n]);}
    const sourceType=multi?'multiple_choice_multiple':choice?(/TRUE|FALSE/.test(controls.map(c=>c.value).join(' '))?'true_false_not_given':/YES|NO/.test(controls.map(c=>c.value).join(' '))?'yes_no_not_given':'multiple_choice_single'):first.closest('.heading-drop-zone')?'matching_headings':kind==='hidden'?(group.ieltsQuestionType==='matching_features'?'matching_features':'summary_completion_drag'):group.ieltsQuestionType;
    document.questions.push({id,part_id:part.id,group_id:group.id,question_type:multi?'list_selection':choice?'multiple_choice':'source_text',ieltsQuestionType:sourceType,question_text:'',correct_answer:answer,...(!multi?{correct_answer_variants:answer.split('/').filter(Boolean)}:{}),answerCount:unique.length,sourceNumbers:unique,sourceInputName:name,order_index:++ordinal,points:1});
    const options=choice?controls.map(c=>({value:c.value,text:clean(c.closest('.ielts-reading-option')?.textContent)})):[];
    for(const control of controls){const mark=d.createElement('span');mark.dataset.lumaQuestion=id;mark.dataset.lumaKind=choice?kind:kind==='hidden'?'drop':'text';if(choice)mark.dataset.lumaOption=control.value;
     if(kind==='hidden'){
      
      const values=[...host.querySelectorAll('.dnd-option,.options-drag-option,[draggable="true"]')].map(el=>({value:el.getAttribute('data-value')||el.getAttribute('data-option')||clean(el.textContent).match(/^[A-Z]/)?.[0],text:clean(el.textContent)})).filter(x=>x.value);document.questions.at(-1).sourceOptions=values;
      control.parentElement.querySelectorAll('.dnd-drop-placeholder,.dnd-drop-value').forEach(x=>x.remove());
     }
     control.replaceWith(mark);
    }
    if(options.length)document.questions.at(-1).sourceOptions=options;
    if(group.wordBank?.length)document.questions.at(-1).sourceOptions=group.wordBank.map(value=>({value,text:value}));
   }
   host.querySelectorAll('input,select,form').forEach(n=>{issues.push('Unsupported remaining control');n.remove();});
   sanitize(host,imageUrls,issues);
   group.sourceHtml=host.innerHTML.replace(/>\s+</g,'><').replace(/[ \t]{2,}/g,' ');group.sourceQuestionCount=document.questions.filter(q=>q.group_id===group.id).length;part.question_groups.push(group);group=null;htmlNodes=[];
  };
  for(const el of children){if(el.matches('h2.ielts-reading-question-section-heading')){finish();const text=clean(el.childNodes[0]?.textContent);group={id:prefix+'-g'+(document.parts.length+1)+'-'+part.question_groups.length,type:'source_html',ieltsQuestionType:'note_completion',instructions:'',sourceHeading:text,sourceHtml:'',sourceSectionId:new URL(el.querySelector('a')?.getAttribute('href')||'https://engnovate.com','https://engnovate.com').searchParams.get('section')};}else if(group){htmlNodes.push(el);if(el.matches('.ielts-reading-question-section-content')){const text=clean(el.textContent);group.ieltsQuestionType=classify(text,el);}}}finish();if(passage){if(passage.querySelector('input,select'))issues.push('Unmapped passage control');sanitize(passage,imageUrls,issues);part.passage_text=passage.innerHTML;part.sourcePassage=true;}document.parts.push(part);
 }
 const max=Math.max(...allNumbers);if(max<35||max>45)issues.push('Unexpected total '+max);for(let n=1;n<=max;n++)if(!allNumbers.has(n))issues.push('Missing question '+n);
 if(Object.keys(keys.answers).length!==max)issues.push('Answer key count differs from numbered slots');
 parsed.window.close();return {document,identity:{...identity,source:'engnovate',sourceHash:crypto.createHash('sha256').update(html).digest('hex')},answerSlots:max,images:[...imageUrls],issues:[...new Set(issues)],status:issues.length?'review':'validated'};
}
module.exports={convert,keysFor,variants};
if(require.main===module&&!process.env.IMPORT_BOOK){const {spawnSync}=require('child_process'),root=process.argv[2]||'/tmp/luma-engnovate-reading',output=process.argv[3]||'data/imports/engnovate-reading';fs.mkdirSync(output,{recursive:true});const reports=[];for(let b=1;b<=21;b++){const p=spawnSync(process.execPath,['--max-old-space-size=768',__filename,root,output],{env:{...process.env,IMPORT_BOOK:String(b)},encoding:'utf8'});if(p.status!==0)throw Error('Book '+b+' conversion failed: '+p.stderr.slice(-500));reports.push(...JSON.parse(fs.readFileSync(path.join(output,'report-'+b+'.json'))));console.log('CONVERTED BOOK',b);}fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify({validated:reports.filter(r=>r.status==='validated').length,review:reports.filter(r=>r.status==='review').length,failed:reports.filter(r=>r.status==='failed').length}));}
else if(require.main===module){const {normalizeDocument}=require('./exam-loader.cjs')('document'),{gradeModule}=require('./exam-loader.cjs')('result');const root=process.argv[2]||'/tmp/luma-engnovate-reading',output=process.argv[3]||'data/imports/engnovate-reading';fs.mkdirSync(output,{recursive:true});const reports=[];for(let book=Number(process.env.IMPORT_BOOK);book<=Number(process.env.IMPORT_BOOK);book++)for(let test=1;test<=4;test++){const name=`${String(book).padStart(2,'0')}-${test}`;try{const result=convert(fs.readFileSync(path.join(root,name+'.html'),'utf8'),{book,test,url:`https://engnovate.com/ielts-reading-tests/cambridge-ielts-${String(book).padStart(2,'0')}-academic-reading-test-${test}/`},keysFor(root,book,test));try{result.document=normalizeDocument(result.document,'reading');const slots=result.document.questions.reduce((n,q)=>n+q.answerCount,0);if(slots!==result.answerSlots)result.issues.push('Normalized slot count differs: '+slots);if(!result.issues.length){const sourceAnswers=Object.fromEntries(result.document.questions.map(q=>[q.id,q.question_type==='list_selection'?q.correct_answer:q.correct_answer.split('/')[0]]));const scored=gradeModule('reading',result.document,sourceAnswers);if(scored.correct!==result.answerSlots||scored.total!==result.answerSlots)result.issues.push('Source self-score mismatch '+scored.correct+'/'+scored.total);}}catch(e){result.issues.push('Normalization: '+e.message);}result.status=result.issues.length?'review':'validated';fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(result.document));const {document,...report}=result;reports.push(report);if(reports.length%12===0)console.log('CONVERTED',reports.length);if(global.gc)global.gc();}catch(e){reports.push({identity:{book,test},status:'failed',issues:[e.message]});}}fs.writeFileSync(path.join(output,'report-'+process.env.IMPORT_BOOK+'.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify({validated:reports.filter(r=>r.status==='validated').length,review:reports.filter(r=>r.status==='review').length,failed:reports.filter(r=>r.status==='failed').length}));}
