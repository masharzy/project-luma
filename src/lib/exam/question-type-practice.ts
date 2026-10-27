import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/auth/db';
import { digest } from '@/lib/auth/crypto';
import { AuthHttpError } from '@/lib/auth/http';
import { isObjectiveQuestion } from '@/lib/exam/mock-scoring';
import { questionType, questionTypeLabel, previewText, MAX_PRACTICE_QUESTIONS, PAGE_SIZE, listeningTypes, readingTypes, type PracticeModule } from './question-types';
import type { ExamDocument } from './document';

export type SourceRow = {
  kind?: "cambridge"|"practice"; source_label?:string; book_slug?:string|null;
  test_id: string | number; book_number: number; test_number: number;
  module: PracticeModule; premium: boolean; document: ExamDocument;
};
export type IndexedQuestion = {
  key: string; module: PracticeModule; type: string; premium: boolean;
  book: number; test: number; number: string; preview: string;
  source: SourceRow; question: any; part: any; group: any; partOrder: number; groupOrder: number; questionOrder: number;
};
type PublicQuestion = { key?: string; module: PracticeModule; type: string; book: number; test: number; number: string; preview: string; premium: boolean; previewKey?:string };

export async function loadQuestionIndex(scope?:{testId?:string;module?:PracticeModule;bookNumber?:number;testIds?:string[]}): Promise<IndexedQuestion[]> {
  // A book AND its test must be published. Both entitlement levels are checked on the server.
  const rows = await db().query(`
    SELECT t.id AS test_id,t.book_number,t.test_number,e.module,
      (b.access='premium' OR t.access='premium') AS premium,e.document
    FROM public.exam_modules e
    JOIN public.cambridge_tests t ON t.id=e.parent_id
    JOIN public.cambridge_books b ON b.book_number=t.book_number
    WHERE e.kind='cambridge' AND e.module IN ('listening','reading')
      AND e.revision>0 AND t.status='published' AND b.status='published'
      AND ($1::bigint IS NULL OR t.id=$1) AND ($2::text IS NULL OR e.module=$2)
    AND ($3::integer IS NULL OR t.book_number=$3) AND ($4::bigint[] IS NULL OR t.id=ANY($4))
    ORDER BY t.book_number,t.test_number,e.module`,[scope?.testId||null,scope?.module||null,scope?.bookNumber||null,scope?.testIds||null]);
  return buildQuestionIndex(rows as SourceRow[]);
}

export function buildQuestionIndex(rows:SourceRow[]):IndexedQuestion[]{
  const index: IndexedQuestion[] = [];
  for (const raw of rows) {
    const source = raw as SourceRow;
    const document = source.document;
    if (!document || !Array.isArray(document.parts) || !Array.isArray(document.questions)) continue;
    const partMap = new Map<string, {part:any;partOrder:number;groups:Map<string,{group:any;groupOrder:number}>}>();
    document.parts.forEach((part:any,partOrder:number) => {
      if (typeof part.id !== 'string') return;
      const groups = new Map<string,{group:any;groupOrder:number}>();
      (part.question_groups || []).forEach((group:any,groupOrder:number) => { if (typeof group.id === 'string') groups.set(group.id,{group,groupOrder}); });
      partMap.set(part.id,{part,partOrder,groups});
    });
    document.questions.forEach((question:any,questionOrder:number) => {
      if (!question || typeof question.id !== 'string' || !isObjectiveQuestion(question)) return;
      const located = partMap.get(String(question.part_id || ''));
      if (!located) return;
      const groupInfo = located.groups.get(String(question.group_id || ''));
      if (!groupInfo) return;
      const type = questionType(question,groupInfo.group);
      const numbers = Array.isArray(question.sourceNumbers) ? question.sourceNumbers.join('–') : String(question.order_index || questionOrder+1);
      // Only an excerpt is used for free previews. Premium excerpts are never sent to clients.
      const sourceHtml=String(groupInfo.group.sourceHtml||'');
      const anchor=sourceHtml.indexOf('data-luma-question="'+question.id+'"');
      const alternateAnchor=anchor<0?sourceHtml.indexOf("data-luma-question='"+question.id+"'"):anchor;
      const nearby=alternateAnchor>=0
        ? sourceHtml.slice(Math.max(0,alternateAnchor-180),Math.min(sourceHtml.length,alternateAnchor+260))
        : sourceHtml.slice(0,440);
      const preview = previewText(question.question_text || nearby || groupInfo.group.groupText || groupInfo.group.sourceHeading || located.part.title);
      index.push({
        key: (source.kind==='practice'?'practice:':'')+source.module+':'+source.test_id+':'+question.id,
        module: source.module,type,premium:Boolean(source.premium),
        book:Number(source.book_number),test:Number(source.test_number),
        number:numbers,preview,source,question,part:located.part,group:groupInfo.group,
        partOrder:located.partOrder,groupOrder:groupInfo.groupOrder,questionOrder,
      });
    });
  }
  return index;
}

export const sourceIdentity=(q:IndexedQuestion)=>[q.source.kind||'cambridge',q.module,q.source.test_id].join(':');
const groupIdentity=(q:IndexedQuestion)=>[q.source.kind||'cambridge',q.module,q.source.test_id,q.part.id,q.group.id].join(':');
export function indexedQuestionGroups(index:IndexedQuestion[]){const groups=new Map<string,IndexedQuestion[]>();for(const q of index){const id=groupIdentity(q);groups.set(id,[...(groups.get(id)||[]),q]);}return [...groups.values()];}
const groupNumber=(rows:IndexedQuestion[])=>{const numbers=[...new Set(rows.flatMap(q=>q.question.sourceNumbers||[q.question.order_index||q.questionOrder+1]))].map(Number).sort((a,b)=>a-b);return numbers.length>1&&numbers.every((n,i)=>!i||n===numbers[i-1]+1)?numbers[0]+'–'+numbers.at(-1):numbers.join(', ');};
export function publicQuestionCatalog(index: IndexedQuestion[], modules: PracticeModule[], selectedTypes: string[], page: number) {
 const groups=indexedQuestionGroups(index.filter(q=>modules.includes(q.module)));
 const typeCounts=new Map<string,{type:string;label:string;total:number;free:number;premium:number}>();
 for(const rows of groups)for(const type of new Set(rows.map(q=>q.type))){const c=typeCounts.get(type)||{type,label:questionTypeLabel(type),total:0,free:0,premium:0};c.total++;rows[0].premium?c.premium++:c.free++;typeCounts.set(type,c);}
 for(const type of new Set(modules.flatMap(m=>m==='listening'?listeningTypes:readingTypes)))if(!typeCounts.has(type))typeCounts.set(type,{type,label:questionTypeLabel(type),total:0,free:0,premium:0});
 const filtered=groups.filter(rows=>!selectedTypes.length||rows.some(q=>selectedTypes.includes(q.type)));
 const free=filtered.filter(rows=>!rows[0].premium).length;
 const items=filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(rows=>{const item=rows.find(q=>selectedTypes.includes(q.type))||rows[0],first=rows[0];const base={sourceLabel:item.source.source_label||`Cambridge ${item.book} · Test ${item.test}`,module:item.module,type:item.type,book:item.book,test:item.test,number:groupNumber(rows),questionCount:rows.length,preview:item.premium?'':item.preview,premium:item.premium};return item.premium?base:{...base,key:first.key,previewKey:first.key};});
 return {types:[...typeCounts.values()].sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label)),items,total:filtered.length,free,premium:filtered.length-free,page,pageSize:PAGE_SIZE,hasMore:(page+1)*PAGE_SIZE<filtered.length,questionTotal:filtered.reduce((n,g)=>n+g.length,0)};
}

export async function startQuestionGroupAttempt(index:IndexedQuestion[],modules:PracticeModule[],types:string[],count:number,owner:string,userId:string|null,keys?:string[]){
 if(!Number.isInteger(count)||count<1||count>10||keys&&(!keys.length||keys.length!==count||new Set(keys).size!==keys.length||keys.some(k=>typeof k!=='string'||k.length>180)))throw new AuthHttpError(400,'Choose 1–10 question groups.');
 const pool=indexedQuestionGroups(index).filter(g=>!g[0].premium&&modules.includes(g[0].module)&&(!types.length||g.some(q=>types.includes(q.type))));
 let chosen:IndexedQuestion[][];
 if(keys){const exact=keys.map(key=>pool.find(g=>g[0].key===key));if(exact.some(g=>!g))throw new AuthHttpError(409,'A selected group is unavailable or locked. Refresh your selection.');chosen=exact as IndexedQuestion[][];}
 else {const shuffled=[...pool];for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}chosen=shuffled.slice(0,count);if(chosen.length!==count)throw new AuthHttpError(409,'Not enough free groups match these filters.');}
 const selected=chosen.flat();if(selected.length>MAX_PRACTICE_QUESTIONS)throw new AuthHttpError(400,'These groups contain more than 40 questions. Choose fewer groups; groups are never split.');
 return startQuestionTypeAttempt(index,modules,[],selected.length,owner,userId,selected.map(q=>q.key));
}

// Only a published free source can be previewed. Do not serialize scoring fields.
export function questionPreview(index:IndexedQuestion[],key:string){
 const item=index.find(q=>q.key===key&&!q.premium);
 if(!item)throw new AuthHttpError(404,'Question preview unavailable.');
 const siblings=index.filter(q=>groupIdentity(q)===groupIdentity(item));
 const esc=(v:unknown)=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 let html=String(item.group.sourceHtml||item.group.groupText||'');
 if(!item.group.sourceHtml){
  html=html.replace(/\[\[(?:n)?(\d+)\]\]/g,(marker,num)=>{const q=siblings.find(q=>(q.question.sourceNumbers||[q.question.order_index]).some((n:unknown)=>String(n)===num));return q?'<span data-luma-question="'+esc(q.question.id)+'"></span>':marker;});
  if(!html)html=siblings.map(({question:q,number})=>'<p><strong>Question '+esc(number)+'</strong> '+esc(q.question_text)+'</p>'+(Array.isArray(q.options)&&q.options.length?'<ul>'+q.options.map((o:any,i:number)=>'<li>'+String.fromCharCode(65+i)+'. '+esc(typeof o==='string'?o:o.text||o.label||'')+'</li>').join('')+'</ul>':'<span data-luma-question="'+esc(q.id)+'"></span>')).join('');
 }
 const image=String(item.group.referenceImage||item.group.diagramImage||'');
 if(image&&image.length<=2000000&&(/^https:\/\//.test(image)||/^data:image\/(png|jpeg|webp);base64,/.test(image)))html='<img src="'+esc(image)+'" alt="Question reference"/>'+html;
 if(!item.group.sourceHtml&&item.group.instructions)html='<p>'+esc(item.group.instructions)+'</p>'+html;
 return {heading:item.part.title||'Question page',group:{sourceHeading:item.group.sourceHeading||item.group.title||'',sourceHtml:html},questions:siblings.map(q=>({id:q.question.id,sourceNumbers:q.question.sourceNumbers||[q.number],sourceOptions:q.question.sourceOptions||[],answerCount:q.question.answerCount||1})),passage:item.module==='reading'?String(item.part.passage_text||''):''};
}

// Rewrite only source question bindings, never render or execute imported HTML on the server.
export function remapQuestionBindings(html:string, ids:Map<string,string>):string {
  return html.replace(/data-luma-question=(["'])([a-zA-Z0-9_.:-]+)\1/g,(original,quote,id) =>
    ids.has(id) ? 'data-luma-question='+quote+ids.get(id)+quote : original);
}

export function buildQuestionSnapshots(selected:IndexedQuestion[]):{module:PracticeModule;document:ExamDocument}[] {
  const byModule = new Map<PracticeModule,IndexedQuestion[]>();
  for (const item of selected) byModule.set(item.module,[...(byModule.get(item.module)||[]),item]);
  const snapshots:{module:PracticeModule;document:ExamDocument}[]=[];
  for (const module of ['listening','reading'] as const) {
    const chosen=byModule.get(module);
    if (!chosen?.length) continue;
    chosen.sort((a,b)=>a.book-b.book || a.test-b.test || a.partOrder-b.partOrder || a.groupOrder-b.groupOrder || a.questionOrder-b.questionOrder);
    const parts:any[]=[],questions:any[]=[];
    const partLookup=new Map<string,any>(),groupLookup=new Map<string,any>(),ids=new Map<string,string>();
    let serial=0;
    for (const item of chosen) {
      const prefix=sourceIdentity(item);
      const partKey=prefix+':'+item.part.id;
      let part=partLookup.get(partKey);
      if (!part) {
        part={...item.part,audio_url:item.part.audio_url||item.source.document.audioUrl||'',id:'qp-p-'+(parts.length+1),title:(item.source.source_label||'Cambridge '+item.book+' · Test '+item.test)+' · '+(item.part.title||'Part '+(item.partOrder+1)),question_groups:[]};
        parts.push(part);partLookup.set(partKey,part);
      }
      const groupKey=partKey+':'+item.group.id;
      let group=groupLookup.get(groupKey);
      if(!group){
        group={...item.group,id:'qp-g-'+(groupLookup.size+1),sourceQuestionCount:0};
        part.question_groups.push(group);groupLookup.set(groupKey,group);
      }
      const newId='qp-q-'+(++serial);
      ids.set(prefix+':'+item.question.id,newId);
      questions.push({...item.question,id:newId,part_id:part.id,group_id:group.id,order_index:serial});
      group.sourceQuestionCount++;
    }
    // Same source question IDs can exist in different tests, so remap within each source document.
    for (const part of parts) {
      const matching=chosen.find(item=>partLookup.get(sourceIdentity(item)+':'+item.part.id)===part)!;
      const prefix=sourceIdentity(matching)+':';
      const local=new Map<string,string>();
      for(const [key,value] of ids)if(key.startsWith(prefix))local.set(key.slice(prefix.length),value);
      part.passage_text=remapQuestionBindings(String(part.passage_text||''),local);
      for(const group of part.question_groups)
        if(typeof group.sourceHtml==='string')group.sourceHtml=remapQuestionBindings(group.sourceHtml,local);
    }
    const durationMinutes=Math.max(5,Math.min(120,Math.max(Math.ceil(questions.length*1.5),module==='listening'?parts.length*10:0)));
    snapshots.push({module,document:{schemaVersion:1,durationMinutes,audioUrl:'',parts,questions}});
  }
  return snapshots;
}

export async function startQuestionTypeAttempt(index: IndexedQuestion[], modules: PracticeModule[], types: string[], count: number, owner: string, userId: string|null, keys?:string[]) {
  if(!Number.isInteger(count)||count<1||count>MAX_PRACTICE_QUESTIONS)
    throw new AuthHttpError(400,'Choose between 1 and 40 questions.');
  if(keys&&(!keys.length||keys.length>40||new Set(keys).size!==keys.length||keys.some(k=>typeof k!=='string'||k.length>180)||keys.length!==count))throw new AuthHttpError(400,'Select 1–40 unique questions.');
  const pool=index.filter(item => !item.premium && modules.includes(item.module) && (!types.length||types.includes(item.type)));
  if(pool.length<count)throw new AuthHttpError(409,'Only '+pool.length+' free questions match these filters. Reduce the count or change your question types.');
  // Shuffle groups so a small custom practice still samples the entire free bank,
  // while keeping related audio / passage context together where possible.
  const shuffle=<T,>(arr:T[]):T[]=>{
    for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
    return arr;
  };
  const selected:IndexedQuestion[]=[];
  const chosenKeys=new Set<string>();
  const add=(item:IndexedQuestion)=>{if(chosenKeys.has(item.key))return;selected.push(item);chosenKeys.add(item.key);};
  // When there is room, represent every selected type in the generated test.
  if(types.length<=count){
    for(const type of shuffle([...types])){
      const candidates=pool.filter(q=>q.type===type&&!chosenKeys.has(q.key));
      if(candidates.length)add(candidates[Math.floor(Math.random()*candidates.length)]);
    }
  }
  const groups=new Map<string,IndexedQuestion[]>();
  for(const item of pool){
    const key=sourceIdentity(item)+':'+item.part.id;
    groups.set(key,[...(groups.get(key)||[]),item]);
  }
  const entries=shuffle([...groups.entries()]).sort((a,b)=>{
    const aChosen=a[1].some(q=>chosenKeys.has(q.key));
    const bChosen=b[1].some(q=>chosenKeys.has(q.key));
    return Number(bChosen)-Number(aChosen);
  });
  for(const [,items] of entries){
    for(const item of shuffle(items)){
      if(selected.length>=count)break;
      add(item);
    }
    if(selected.length>=count)break;
  }
  if(selected.length!==count)throw new AuthHttpError(409,'Could not assemble the selected practice. Try a different filter.');
  if(keys){const exact=keys.map(key=>pool.find(q=>q.key===key));if(exact.some(q=>!q))throw new AuthHttpError(409,'A selected question is unavailable or locked. Refresh your selection.');selected.splice(0,selected.length,...exact as IndexedQuestion[]);}
  const snapshot=buildQuestionSnapshots(selected);
  if(!snapshot.length)throw new AuthHttpError(409,'No suitable questions are available.');
  const attemptId=randomUUID();
  const first=selected[0];
  const label=types.length ? types.map(questionTypeLabel).join(' + ') : 'Mixed question types';
  const title='Question Type Practice · '+label.slice(0,120);
  // Uses the existing timed attempt + scoring infrastructure and anonymous ownership cookie.
  // parent_id is an existing, published, free source test; premium source rows are excluded.
  await db().query(`INSERT INTO public.exam_attempts
    (id,owner_hash,kind,parent_id,title,snapshot,user_id,deadline)
    VALUES ($1,$2,$8,$3,$4,$5::jsonb,$6::uuid,now()+($7::integer*interval '1 second'))`,
    [attemptId,digest(owner),String(first.source.test_id),title,JSON.stringify(snapshot),userId,snapshot[0].document.durationMinutes*60,first.source.kind||"cambridge"]);
  return attemptId;
}
