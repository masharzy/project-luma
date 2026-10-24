/* Reviewed adapter for the supplied IELTS MASTER Test 171 HTML; never guesses other test layouts. */
const {JSDOM}=require('node:module').createRequire(require.resolve('isomorphic-dompurify'))('jsdom');
const {readFileSync,writeFileSync,mkdirSync}=require('node:fs');
const {createHash}=require('node:crypto');
function importTest(html,images){
 const dom=new JSDOM(html),doc=dom.window.document,content=doc.querySelector('.entry-content');
 if(!content||!doc.title.includes('Listening Test 171'))throw Error('This adapter only accepts reviewed Test 171 HTML.');
 const text=el=>el.textContent.replace(/\s+/g,' ').trim();
 const lines=el=>new JSDOM('<body>'+el.innerHTML.replace(/<br\s*\/?\s*>/gi,'\n')+'</body>').window.document.body.textContent.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean);
 const answerBox=content.querySelector('[id^="bg-showmore-hidden-"]');if(!answerBox)throw Error('Answer key missing');
 const answers={};for(const l of lines(answerBox)){const m=l.match(/^(\d+)\.\s*(.+)$/);if(m){if(answers[m[1]])throw Error('Duplicate answer');answers[m[1]]=m[2];}}
 if(Object.keys(answers).length!==40)throw Error('Expected 40 source answers');
 const ps=[...content.children].filter(el=>el.tagName==='P'&&!(answerBox.compareDocumentPosition(el)&dom.window.Node.DOCUMENT_POSITION_FOLLOWING));
 const sections=[];let current=null;
 for(const p of ps){const t=text(p);if(/^(?:Part\s*\d\s*:\s*)?Questions?\s+\d+/i.test(t)){const ns=[...t.matchAll(/\d+/g)].map(x=>Number(x[0]));if(/^Part/.test(t))ns.shift();current={start:ns[0],end:ns[1]||ns[0],header:p,nodes:[]};sections.push(current);}else if(current)current.nodes.push(p);}
 if(sections.map(s=>s.start).join(',')!=='1,6,11,14,22,26,32,34,37')throw Error('Source group structure changed; review required.');
 const output={schemaVersion:1,durationMinutes:30,audioUrl:'https://practicepteonline.com/wp-content/uploads/audio/171_we.mp3',parts:[],questions:[]};
 for(let p=1;p<=4;p++)output.parts.push({id:'c1t1l-part-'+p,title:'Part '+p,part_number:p,order_index:p,passage_text:'',question_groups:[]});
 let order=0;
 function group(part,start,end,type,instructions,extra={}){const g={id:'c1t1l-group-'+start,type,instructions,...extra};output.parts[part-1].question_groups.push(g);return g;}
 function question(part,g,n,question_text,options,extra={}){output.questions.push({id:'c1t1l-q-'+n,part_id:output.parts[part-1].id,group_id:g.id,question_type:'multiple_choice',question_text,options,correct_answer:answers[n],order_index:++order,points:1,...extra});}
 function choice(n,g,part){const p=ps.find(p=>new RegExp('^'+n+'(?:\\s|\\.)').test(text(p))&&p.querySelector('input[type="checkbox"]'));if(!p)throw Error('Missing choice '+n);const ls=lines(p),stem=ls.shift().replace(new RegExp('^'+n+'\\.?\\s*'),'');const opts=[];for(let i=0;i<ls.length;i++){const m=ls[i].match(/^([A-I])(?:\s+(.*))?$/);if(m){if(m[1]!==String.fromCharCode(65+opts.length))throw Error('Option order changed');opts.push(m[2]||ls[++i]);}}
 if(opts.length!==4)throw Error('Expected four choices for '+n);question(part,g,n,stem,opts);}
 const pictureOptions=['A','B','C','D'];
 const a=group(1,1,2,'multiple_choice','Circle the appropriate letter.',{referenceImage:images.first,referenceImageAlt:'Questions 1 and 2: briefcase appearance and distinguishing features'});for(const n of [1,2])question(1,a,n,'',pictureOptions,{optionLabelOnly:true});
 const b=group(1,3,3,'multiple_choice','Circle the appropriate letter.');choice(3,b,1);
 const c=group(1,4,4,'multiple_choice','Circle the appropriate letter.',{referenceImage:images.second,referenceImageAlt:'Question 4: where the briefcase was lost'});question(1,c,4,'',pictureOptions,{optionLabelOnly:true});
 const d=group(1,5,5,'multiple_choice','Circle the appropriate letter.');choice(5,d,1);
 function completion(start,part,title){const s=sections.find(s=>s.start===start);let html=s.nodes.filter(p=>p.querySelector('input[type="text"]')||(!p.querySelector('ins')&&text(p)&&!p.querySelector('input'))).map(p=>p.outerHTML).join('');
 // Inputs are replaced by their explicit source number, never DOM position.
 html=html.replace(/<strong>\s*(?:<br\s*\/?>\s*)?\((\d+)\)\s*<\/strong>\s*(?:£\s*|\$\s*)?<input\b[^>]*>/gi,(m,n)=>'[['+n+']]'+(m.includes('£')?'': ''));
 if(start===34){ // Source has two fields for Q34 but a single answer slot.
  html=html.replace(/\[\[34\]\]\s*and\s*<input\b[^>]*>/i,'[[34]]');
 }
 if(/<input\b/i.test(html))throw Error('Unnumbered source input in group '+start);
 const tokens=[...html.matchAll(/\[\[(\d+)\]\]/g)].map(m=>Number(m[1]));if(tokens.join(',')!==Array.from({length:s.end-start+1},(_,i)=>start+i).join(','))throw Error('Completion numbering mismatch '+start);
 // Keep currency/unit outside the input, rather than requiring it twice.
 if(start===6)html=html.replace('[[10]]','£ [[10]]');if(start===14)html=html.replace('[[14]]','$ [[14]]');
 const g=group(part,start,s.end,'note_completion','Write NO MORE THAN THREE WORDS for each answer.',{title,groupText:html,wordLimit:3});
 for(const n of tokens)question(part,g,n,'[['+n+']]',[],{question_type:'note_completion',correct_answer:n===10?'65/pound 65':n===14?'250 million/$ 250 million':answers[n]});
 }
 completion(6,1,'PERSONAL DETAILS FORM');
 const s11=sections.find(s=>s.start===11),ls=lines(s11.nodes.find(p=>text(p).startsWith('NEWS HEADLINES')));ls.shift();const opts=[];for(let i=0;i<ls.length;i++){const m=ls[i].match(/^([A-I])(?:\s+(.*))?$/);if(m)opts.push(m[2]||ls[++i]);}if(opts.length!==9||!opts[1].includes('Example'))throw Error('Example option changed');
 const e=group(2,11,13,'multiple_choice','Circle the THREE other items which are mentioned in the news headlines.',{ieltsQuestionType:'multiple_choice_multiple'});question(2,e,11,'NEWS HEADLINES',opts,{ieltsQuestionType:'multiple_choice_multiple',answerCount:3,correct_answer:[11,12,13].map(n=>answers[n]).join(','),exampleOptions:['B']});
 completion(14,2,'');const f=group(3,22,25,'multiple_choice','Circle the appropriate letter.');for(let n=22;n<=25;n++)choice(n,f,3);completion(26,3,'Course Requirements');const g=group(4,32,33,'multiple_choice','Circle the appropriate letter.');for(let n=32;n<=33;n++)choice(n,g,4);completion(34,4,'');const h=group(4,37,40,'multiple_choice','Circle the appropriate letter.');for(let n=37;n<=40;n++)choice(n,h,4);
 return {document:output,report:{source:'https://practicepteonline.com/ielts-listening-test-171/',sourceSha256:createHash('sha256').update(html).digest('hex'),book:1,test:1,module:'listening',images:2,cropped:false,answerSlots:40,questionObjects:output.questions.length,reviewedAdjustments:['Q34: collapsed unnumbered extra field into one numbered answer slot.','Q10/Q14: accept numeric amount without duplicating printed currency.','Q11–13: preserve B example and original E,F,H answer labels.'],sourceAnswers:answers}};
}
module.exports={importTest};
if(require.main===module){const root=process.cwd(),html=readFileSync(process.argv[2],'utf8');const img=n=>'data:image/png;base64,'+readFileSync(root+'/public/imports/cambridge-1-test-1/'+n).toString('base64');const r=importTest(html,{first:img('questions-1-2.png'),second:img('question-4.png')});mkdirSync('data/imports',{recursive:true});writeFileSync('data/imports/cambridge-1-test-1-listening.json',JSON.stringify(r.document,null,2)+'\n');writeFileSync('docs/imports/cambridge-1-test-1-report.json',JSON.stringify(r.report,null,2)+'\n');console.log(JSON.stringify({parts:r.document.parts.length,questions:r.document.questions.length,report:r.report},null,2));}
