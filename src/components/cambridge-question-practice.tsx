'use client';
import { useCallback, useEffect, useState } from 'react';
import { BookOpenText, Headphones, LockKeyhole, Layers3, Shuffle, ArrowUpRight, LoaderCircle, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { MAX_PRACTICE_QUESTIONS, questionTypeLabel } from '@/lib/exam/question-types';

type ModuleChoice='all'|'listening'|'reading';
type Kind={type:string;label:string;total:number;free:number;premium:number};
type Question={key?:string;module:'listening'|'reading';type:string;book:number;test:number;number:string;preview:string;premium:boolean};
type Catalog={types:Kind[];items:Question[];total:number;free:number;premium:number;page:number;hasMore:boolean};

export function CambridgeQuestionPractice(){
 const [module,setModule]=useState<ModuleChoice>('all');
 const [selected,setSelected]=useState<string[]>([]);
 const [count,setCount]=useState(10);
 const [catalog,setCatalog]=useState<Catalog|null>(null);
 const [questions,setQuestions]=useState<Question[]>([]);
 const [page,setPage]=useState(0),[loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[error,setError]=useState('');
 const query=useCallback((p:number)=>{
   const args=new URLSearchParams({module,page:String(p)});
   if(selected.length)args.set('types',selected.join(','));
   return '/api/cambridge/question-types?'+args;
 },[module,selected]);
 useEffect(()=>{
   let alive=true;
   setLoading(true);
   setError('');
   void (async()=>{
     try{
       const response=await fetch(query(0),{cache:'no-store'});
       const data=await response.json();
       if(!response.ok)throw Error(data.error||'Unable to load question bank.');
       if(!alive)return;
       setCatalog(data);setQuestions(data.items);setPage(0);
     }catch(e){if(alive){setError(e instanceof Error?e.message:'Unable to load questions.');setCatalog(null);setQuestions([]);}}
     finally{if(alive)setLoading(false);}
   })();
   return()=>{alive=false;};
 },[query]);
 const loadMore=async()=>{
   if(loading||!catalog?.hasMore)return;
   setLoading(true);
   try{
     const response=await fetch(query(page+1),{cache:'no-store'});
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to load more questions.');
     setQuestions(v=>[...v,...data.items]);setPage(page+1);
     setCatalog(data);
   }catch(e){setError(e instanceof Error?e.message:'Unable to load more questions.');}
   finally{setLoading(false);}
 };
 const start=async()=>{
   if(starting||loading||!catalog||count>catalog.free)return;
   setStarting(true);setError('');
   try{
     const response=await fetch('/api/cambridge/question-types',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({modules:module==='all'?['listening','reading']:[module],types:selected,count}),
     });
     const data=await response.json();
     if(!response.ok)throw Error(data.error||'Unable to start this practice.');
     window.location.assign(data.url);
   }catch(e){setError(e instanceof Error?e.message:'Unable to start practice.');setStarting(false);}
 };
 const changeType=(type:string)=>{
   setSelected(v=>v.includes(type)?v.filter(t=>t!==type):[...v,type]);
 };
 const enough=Boolean(catalog && catalog.free>=count);
 return <section className="cambridge-type-practice" id="question-type-practice" aria-labelledby="type-practice-heading">
   <div className="type-practice-intro">
     <div><span className="session-eyebrow">SMART PRACTICE · CAMBRIDGE QUESTION BANK</span>
     <h2 id="type-practice-heading">Practice by question type.</h2>
     <p>Choose one or several IELTS question types. Select exactly how many questions you want and practise them in the familiar timed test interface.</p></div>
     <div className="type-practice-icon" aria-hidden><Layers3 size={31}/></div>
   </div>
   <div className="type-practice-controls">
     <div className="type-practice-field">
       <span className="type-field-title"><SlidersHorizontal size={16}/> Module</span>
       <div className="type-module-tabs" aria-label="Filter question bank by module">
         {([['all','All modules'],['listening','Listening'],['reading','Reading']] as const).map(([value,label])=>
           <button key={value} type="button" aria-pressed={module===value} onClick={()=>{setModule(value);setSelected([]);}}>{value==='listening'?<Headphones size={16}/>:value==='reading'?<BookOpenText size={16}/>:<Layers3 size={16}/>} {label}</button>)}
       </div>
     </div>
     <div className="type-practice-field">
       <span className="type-field-title"><CheckCircle2 size={16}/> Question types <small>Multiple selections allowed</small></span>
       <div className="type-tags" aria-label="Question types">
         <button type="button" className="type-tag" aria-pressed={selected.length===0} onClick={()=>setSelected([])}>All types</button>
         {catalog?.types.map(t=><button type="button" key={t.type} className="type-tag" aria-pressed={selected.includes(t.type)} onClick={()=>changeType(t.type)}>
           {t.label}<span>{t.free} free{t.premium>0?' · '+t.premium+' locked':''}</span>
         </button>)}
         {!catalog && loading && <span className="type-loading-inline">Finding question types…</span>}
       </div>
     </div>
     <div className="type-practice-start">
       <div><label className="type-field-title" htmlFor="type-question-count">Number of questions</label>
         <input id="type-question-count" type="number" min={1} max={MAX_PRACTICE_QUESTIONS} value={count} onChange={e=>setCount(Math.max(1,Math.min(MAX_PRACTICE_QUESTIONS,Number(e.target.value)||1)))}/>
         <p>Choose 1–40 questions · Each practice uses a fresh selection.</p>
       </div>
       <div className="type-practice-start-action">
         <span>{catalog? <><strong>{catalog.free}</strong> free questions available · <strong>{catalog.premium}</strong> premium locked</>:'Loading availability…'}</span>
         <button type="button" className="type-start-button" onClick={()=>void start()} disabled={starting||loading||!enough}>
           {starting?<LoaderCircle className="type-spin" size={18}/>:<Shuffle size={18}/>}
           {starting?'Preparing session…':'Start custom practice'}<ArrowUpRight size={17}/>
         </button>
         {catalog&&!enough&&<small className="type-count-warning">Only {catalog.free} free questions match your selection. Select a smaller number or another type.</small>}
       </div>
     </div>
   </div>
   <div className="type-practice-library">
     <div className="type-library-heading">
       <div><span className="session-eyebrow">QUESTION EXPLORER</span><h3>{selected.length===1?questionTypeLabel(selected[0]):selected.length>1?selected.length+' selected question types':'All question types'}</h3></div>
       <span>{catalog?.total ?? 0} questions · {questions.length} shown</span>
     </div>
     <div className="type-question-grid">
       {questions.map((item,index)=>
         <article key={item.key||['premium',item.book,item.test,item.module,item.number,item.type,index].join('-')} className={'type-question-card '+(item.premium?'is-locked':'')}>
           <div className="type-question-meta"><span>{item.module==='listening'?<Headphones size={15}/>:<BookOpenText size={15}/>} {item.module}</span>
             <span>Cambridge {item.book} · Test {item.test} · Q {item.number}</span></div>
           <h4>{questionTypeLabel(item.type)}</h4>
           {item.premium
             ? <div className="type-locked-content" aria-label="Premium question locked"><div className="type-locked-blur" aria-hidden><i/><i/><i/></div><div className="type-locked-overlay"><LockKeyhole size={20}/><strong>Premium question</strong><span>Question content locked</span></div></div>
             : <p className="type-question-preview">{item.preview||'Open this question in your custom practice session to see its full passage and answer fields.'}</p>}
           <div className="type-question-footer"><span>{item.premium?<><LockKeyhole size={14}/> Locked</>:<><CheckCircle2 size={14}/> Included in free pool</>}</span><span>{item.premium?'Premium':'Practice ready'}</span></div>
         </article>)}
     </div>
     {!loading&&!questions.length&&!error&&<p className="type-empty">There are no published questions for these filters yet. Try another type or module.</p>}
     {error&&<p className="type-error" role="alert">{error}</p>}
     {catalog?.hasMore&&<button type="button" className="type-load-more" disabled={loading} onClick={()=>void loadMore()}>{loading?'Loading questions…':'Load more questions ↓'}</button>}
     <p className="type-practice-footnote"><LockKeyhole size={15}/> Premium question text and answer keys are never delivered to your browser. Custom practice uses free, published questions only. Scores are shown after you submit.</p>
   </div>
 </section>;
}
