'use client';
import { useEffect,useRef,useState,useId } from 'react';
import { SourceQuestionGroup } from './exam/source-question-group';
type Page={heading:string;group:{sourceHtml:string;sourceHeading:string};questions:any[];passage:string};
const cache=new Map<string,Promise<Page>>();
function load(key:string){if(cache.size>60)cache.clear();let p=cache.get(key);if(!p){p=fetch('/api/cambridge/question-types?preview='+encodeURIComponent(key),{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);return d;}).catch(e=>{cache.delete(key);throw e});cache.set(key,p);}return p;}
export function QuestionPagePreview({previewKey}:{previewKey:string}){
 const scope=useId();
 const box=useRef<HTMLDivElement>(null);const [page,setPage]=useState<Page|null>(null),[error,setError]=useState(''),[width,setWidth]=useState(250),[visible,setVisible]=useState(false);
 useEffect(()=>{const el=box.current;if(!el)return;const ro=new ResizeObserver(e=>setWidth(e[0].contentRect.width));ro.observe(el);const io=new IntersectionObserver(e=>{if(e.some(e=>e.isIntersecting)){setVisible(true);io.disconnect();}},{rootMargin:'200px'});io.observe(el);return()=>{ro.disconnect();io.disconnect();};},[]);
 useEffect(()=>{if(!visible)return;let alive=true;void load(previewKey).then(p=>{if(alive)setPage(p)}).catch(()=>{if(alive)setError('Preview unavailable. You can still practise this question.');});return()=>{alive=false};},[previewKey,visible]);
 const content=(mode:string)=>page?<fieldset disabled className="question-preview-paper"><h4>{page.heading}</h4><SourceQuestionGroup group={{...page.group,sourceHtml:page.group.sourceHtml.replace(/data-luma-question=(["'])([^"']+)\1/g,(_,quote,id)=>'data-luma-question='+quote+scope+'-'+mode+'-'+id+quote)}} questions={page.questions.map(q=>({...q,id:scope+'-'+mode+'-'+q.id}))} answers={{}} onAnswerChange={()=>{}}/></fieldset>:null;
 return <div ref={box} className="question-page-thumb" aria-hidden="true">{page?<div className="question-page-mini" style={{width:800,transform:`scale(${width/800})`}}>{content('thumb')}</div>:<p>{error||'Loading question page…'}</p>}</div>;
}
