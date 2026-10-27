/* Public-page converter. No authenticated or gated endpoints are used. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {JSDOM}=require('node:module').createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
function variants(raw){
 let values=String(raw||'').split(/\s*\/\s*/).filter(Boolean).flatMap(s=>{let list=[''];for(const token of s.split(/(\([^)]*\))/g)){if(/^\(/.test(token))list=list.flatMap(p=>[p,p+token.slice(1,-1)]).slice(0,256);else list=list.map(p=>p+token);}return list.map(clean)});
 values=values.map(v=>v.replace(/(?<=\d),(?=\d)/g,''));return [...new Set(values)].filter(Boolean).join('/');
}
function keysFor(root,b,t){
 const out={};let files=0;const issues=[];
 for(let part=1;part<=4;part++){
  const file=path.join(root,'public-keys',`${String(b).padStart(2,'0')}-${t}-${part}.html`);if(!fs.existsSync(file)){issues.push('Missing public answer page for Part '+part);continue;}
  const raw=fs.readFileSync(file,'utf8'),subtitle=clean((raw.match(/<p class="ila-subtitle">([\s\S]*?)<\/p>/)?.[1]||'').replace(/<[^>]+>/g,' '));if(!new RegExp('Cambridge IELTS 0?'+b+' Academic Listening Test '+t+'\\b.*Part '+part+'\\b').test(subtitle)){issues.push('Public key identity mismatch for Part '+part);continue;}const table=raw.match(/<table[^>]*class="ila-summary-table"[^>]*>[\s\S]*?<\/table>/)?.[0];if(!table){issues.push('Public key table missing for Part '+part);continue;}const parsed=new JSDOM(table),d=parsed.window.document;
  for(const tr of d.querySelectorAll('.ila-summary-table tr[data-q]')){const n=Number(tr.dataset.q),value=clean(tr.querySelector('.ila-col-answer')?.textContent);if(!n){issues.push('Invalid answer number');continue;}if(out[n]&&out[n]!==value)issues.push('Conflicting answer '+n);out[n]=value;}files++;parsed.window.close();
 }
 // Two keys obtained from the normal publicly available guest export before a different test required login.
 if(files<4){const file=path.join(root,`${String(b).padStart(2,'0')}-${t}-answers.json`);if(fs.existsSync(file)){const j=JSON.parse(fs.readFileSync(file,'utf8'));if(j.success){for(const x of j.data.answer_key)out[x.number]=x.answer;issues.length=0;}}}
 return {answers:out,issues};
}
function convert(html,identity,keys){
 const title=html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/)?.[0]||'',form=html.match(/<form[^>]*id\s*=\s*"ielts-listening-test-form"[^>]*>[\s\S]*?<\/form>/)?.[0]||'',audios=(html.match(/<audio[^>]*id="ielts-listening-test-audio-\d+"[^>]*>[\s\S]*?<\/audio>/g)||[]).join('');const parsed=new JSDOM(title+audios+form),d=parsed.window.document,{book,test}=identity,prefix=`en-${identity.slug||((identity.series==='collins'?'collins':'c')+book)}-t${test}-l`,issues=[...keys.issues],allNumbers=new Set(),imageUrls=new Set();
 const expectedTitle=identity.series==='collins'?`Collins Practice Tests For IELTS ${book} Academic Listening Test ${test}`:`Cambridge IELTS 0?${book} Academic Listening Test ${test}`;
 if(identity.expectedTitle ? clean(d.querySelector('h1')?.textContent).replace(/\s*\(Online Test\)\s*$/i,'').toLowerCase().replace(/Test 0+(\d+)/gi,'test $1')!==clean(identity.expectedTitle).toLowerCase().replace(/Test 0+(\d+)/gi,'test $1') : !new RegExp(expectedTitle+'\\b').test(d.querySelector('h1')?.textContent||''))throw Error('Test identity mismatch');
 const sections=[...d.querySelectorAll('.ielts-listening-question-section')];if(sections.length!==4)throw Error('Expected four Parts');
 const document={schemaVersion:1,durationMinutes:30,audioUrl:'',parts:[],questions:[]};let ordinal=0;
 for(let pi=0;pi<4;pi++){
  const section=sections[pi],part={id:prefix+'-p'+(pi+1),title:'Part '+(pi+1),part_number:pi+1,passage_text:'',audio_url:'',question_groups:[]};
  const sources=[...d.querySelectorAll(`#ielts-listening-test-audio-${pi+1} source`)].map(x=>x.src).filter(x=>x.startsWith('https://'));if(!sources.length)issues.push('Missing audio for Part '+(pi+1));part.audio_url=sources[0]||'';part.audio_fallbacks=sources.slice(1);
  const children=[...section.children];let group=null,htmlNodes=[];
  const finish=()=>{if(!group)return;const host=d.createElement('div');htmlNodes.forEach(n=>host.append(n.cloneNode(true)));
   for(const n of host.querySelectorAll('script,style,iframe,button,a,.ielts-listening-practice-section-button'))n.remove();
   const inputs=[...host.querySelectorAll('input[name^="ielts_listening_answer_"]')];const byName=new Map();for(const input of inputs){const name=input.name.replace(/\[\]$/,'');if(!byName.has(name))byName.set(name,[]);byName.get(name).push(input);}
   for(const [name,controls] of byName){
    const first=controls[0],item=first.closest('.ielts-listening-question-item')||first.closest('.options-drop-zone')||first.parentElement;
    const numbers=[...item.querySelectorAll('.ielts-listening-question-number')].map(n=>Number(n.textContent.trim()));
    if(!numbers.length){issues.push('Unnumbered input '+name);continue;}
    const unique=[...new Set(numbers)];for(const n of unique){if(allNumbers.has(n))issues.push('Duplicate question '+n);allNumbers.add(n);}
    const n=unique[0],id=prefix+'-q'+n,kind=first.type,choice=['radio','checkbox'].includes(kind),multi=kind==='checkbox';
    let answer='';if(multi){const allowed=controls.map(c=>c.value),letters=[...new Set(unique.flatMap(n=>(keys.answers[n]||'').match(/\b[A-Z]\b/g)||[]))].filter(x=>allowed.includes(x));if(letters.length!==unique.length)issues.push('Uncertain multi-answer key '+unique.join('-'));answer=letters.join(',');}
    else {if(!keys.answers[n])issues.push('Missing answer '+n);answer=variants(keys.answers[n]);}
    const sourceType=multi?'multiple_choice_multiple':choice?'multiple_choice_single':kind==='hidden'?'matching_features':/table/i.test(group.sourceHtml||'')?'table_completion':group.ieltsQuestionType;
    document.questions.push({id,part_id:part.id,group_id:group.id,question_type:multi?'list_selection':choice?'multiple_choice':'source_text',ieltsQuestionType:sourceType,question_text:'',correct_answer:answer,...(!multi?{correct_answer_variants:answer.split('/').filter(Boolean)}:{}),answerCount:unique.length,sourceNumbers:unique,sourceInputName:name,order_index:++ordinal,points:1});
    const options=choice?controls.map(c=>({value:c.value,text:clean(c.closest('.ielts-listening-option')?.textContent)})):[];
    for(const control of controls){const mark=d.createElement('span');mark.dataset.lumaQuestion=id;mark.dataset.lumaKind=choice?kind:kind==='hidden'?'drop':'text';if(choice)mark.dataset.lumaOption=control.value;
     if(kind==='hidden'){
      const bank=host.querySelector(`[data-dnd-group="${control.closest('[data-dnd-group]')?.getAttribute('data-dnd-group')}"]`);
      const values=[...host.querySelectorAll('.dnd-option,.options-drag-option,[draggable="true"]')].map(el=>({value:el.getAttribute('data-value')||el.getAttribute('data-option')||clean(el.textContent).match(/^[A-Z]/)?.[0],text:clean(el.textContent)})).filter(x=>x.value);document.questions.at(-1).sourceOptions=values;
      control.parentElement.querySelectorAll('.dnd-drop-placeholder,.dnd-drop-value').forEach(x=>x.remove());
     }
     control.replaceWith(mark);
    }
    if(options.length)document.questions.at(-1).sourceOptions=options;
   }
   host.querySelectorAll('input,select,form').forEach(n=>{issues.push('Unsupported remaining control');n.remove();});
   for(const img of host.querySelectorAll('img')){const src=img.getAttribute('data-src')||img.getAttribute('src');try{const u=new URL(src,'https://engnovate.com');if(u.protocol!=='https:')throw Error('bad');img.setAttribute('src',u.href);imageUrls.add(u.href);}catch{issues.push('Invalid image');img.remove();}}
   for(const card of host.querySelectorAll('[draggable="true"][data-value]'))card.setAttribute('data-luma-drag',card.getAttribute('data-value'));
   for(const el of host.querySelectorAll('*')){for(const a of [...el.attributes]){if(!['class','src','alt','colspan','rowspan','width','height'].includes(a.name)&&!a.name.startsWith('data-luma-'))el.removeAttribute(a.name);}if(el.className&&typeof el.className==='string')el.className=el.className.replace(/ielts-listening-/g,'source-');}
   group.sourceHtml=host.innerHTML.replace(/>\s+</g,'><').replace(/[ \t]{2,}/g,' ');group.sourceQuestionCount=document.questions.filter(q=>q.group_id===group.id).length;part.question_groups.push(group);group=null;htmlNodes=[];
  };
  for(const el of children){if(el.matches('h2.ielts-listening-question-section-heading')){finish();const text=clean(el.childNodes[0]?.textContent);group={id:prefix+'-g'+(document.parts.length+1)+'-'+part.question_groups.length,type:'source_html',ieltsQuestionType:'note_completion',instructions:'',sourceHeading:text,sourceHtml:''};}else if(group){htmlNodes.push(el);if(el.matches('.ielts-listening-question-section-content')){const text=clean(el.textContent);group.ieltsQuestionType=/map|diagram|plan/i.test(text)?'diagram_labelling':/table/i.test(text)?'table_completion':/choose|letter|click|circle/i.test(text)?'matching_features':'note_completion';}}}finish();document.parts.push(part);
 }
 const max=Math.max(...allNumbers);if(max<35||max>45)issues.push('Unexpected total '+max);for(let n=1;n<=max;n++)if(!allNumbers.has(n))issues.push('Missing question '+n);
 if(Object.keys(keys.answers).length!==max)issues.push('Answer key count differs from numbered slots');
 parsed.window.close();return {document,identity:{...identity,source:'engnovate',sourceHash:crypto.createHash('sha256').update(html).digest('hex')},answerSlots:max,images:[...imageUrls],issues:[...new Set(issues)],status:issues.length?'review':'validated'};
}
module.exports={convert,keysFor,variants};
if(require.main===module&&!process.env.IMPORT_BOOK){const {spawnSync}=require('child_process'),root=process.argv[2]||'/tmp/luma-engnovate',output=process.argv[3]||'data/imports/engnovate';fs.mkdirSync(output,{recursive:true});const reports=[];for(let b=1;b<=21;b++){const p=spawnSync(process.execPath,['--max-old-space-size=768',__filename,root,output],{env:{...process.env,IMPORT_BOOK:String(b)},encoding:'utf8'});if(p.status!==0)throw Error('Book '+b+' conversion failed: '+p.stderr.slice(-500));reports.push(...JSON.parse(fs.readFileSync(path.join(output,'report-'+b+'.json'))));console.log('CONVERTED BOOK',b);}fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify({validated:reports.filter(r=>r.status==='validated').length,review:reports.filter(r=>r.status==='review').length,failed:reports.filter(r=>r.status==='failed').length}));}
else if(require.main===module){const {normalizeDocument}=require('./exam-loader.cjs')('document'),{gradeModule}=require('./exam-loader.cjs')('result');const root=process.argv[2]||'/tmp/luma-engnovate',output=process.argv[3]||'data/imports/engnovate';fs.mkdirSync(output,{recursive:true});const reports=[];for(let book=Number(process.env.IMPORT_BOOK);book<=Number(process.env.IMPORT_BOOK);book++)for(let test=1;test<=4;test++){const name=`${String(book).padStart(2,'0')}-${test}`;try{const result=convert(fs.readFileSync(path.join(root,name+'.html'),'utf8'),{book,test,url:`https://engnovate.com/ielts-listening-tests/cambridge-ielts-${String(book).padStart(2,'0')}-academic-listening-test-${test}/`},keysFor(root,book,test));try{result.document=normalizeDocument(result.document,'listening');const slots=result.document.questions.reduce((n,q)=>n+q.answerCount,0);if(slots!==result.answerSlots)result.issues.push('Normalized slot count differs: '+slots);if(!result.issues.length){const sourceAnswers=Object.fromEntries(result.document.questions.map(q=>[q.id,q.question_type==='list_selection'?q.correct_answer:q.correct_answer.split('/')[0]]));const scored=gradeModule('listening',result.document,sourceAnswers);if(scored.correct!==result.answerSlots||scored.total!==result.answerSlots)result.issues.push('Source self-score mismatch '+scored.correct+'/'+scored.total);}}catch(e){result.issues.push('Normalization: '+e.message);}result.status=result.issues.length?'review':'validated';fs.writeFileSync(path.join(output,name+'.json'),JSON.stringify(result.document));const {document,...report}=result;reports.push(report);if(reports.length%12===0)console.log('CONVERTED',reports.length);if(global.gc)global.gc();}catch(e){reports.push({identity:{book,test},status:'failed',issues:[e.message]});}}fs.writeFileSync(path.join(output,'report-'+process.env.IMPORT_BOOK+'.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify({validated:reports.filter(r=>r.status==='validated').length,review:reports.filter(r=>r.status==='review').length,failed:reports.filter(r=>r.status==='failed').length}));}
