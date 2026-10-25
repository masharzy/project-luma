'use client';
import {useEffect,useState} from 'react';
import DOMPurify from 'isomorphic-dompurify';
type Props={group:any;questions:any[];answers:Record<string,any>;onAnswerChange:(id:string,value:string)=>void;reviewMode?:boolean};
// Reconstruct a small safe HTML vocabulary. Source scripts, styles and event handlers never execute.
export function SourceQuestionGroup({group,questions,answers,onAnswerChange,reviewMode=false}:Props){
 const [tree,setTree]=useState<HTMLElement|null>(null);
 useEffect(()=>{setTree(new DOMParser().parseFromString(DOMPurify.sanitize(String(group.sourceHtml||'')), 'text/html').body);},[group.sourceHtml]);
 const map=new Map(questions.map(q=>[q.id,q])),anchors=new Set<string>();
 const render=(node:ChildNode,key:string):React.ReactNode=>{
  if(node.nodeType===3)return node.textContent;
  if(node.nodeType!==1)return null;const el=node as HTMLElement,id=el.dataset.lumaQuestion;
  if(id){const q=map.get(id);if(!q)return null;const anchor=anchors.has(id)?undefined:'q-'+id;anchors.add(id);const kind=el.dataset.lumaKind,option=el.dataset.lumaOption||'',value=String(answers[id]||'');
   if(kind==='radio'||kind==='checkbox'){const multi=kind==='checkbox',selected=multi?value.split(',').filter(Boolean):[value],checked=selected.includes(option),limit=Number(q.answerCount)||1;return <span key={key} id={anchor}><input id={id+'-'+option} name={id} aria-label={'Question '+q.sourceNumbers.join('–')+', option '+option} type={multi?'checkbox':'radio'} checked={checked} disabled={reviewMode||multi&&!checked&&selected.length>=limit} onChange={e=>{if(!multi)return onAnswerChange(id,option);const next=new Set(selected);e.target.checked?next.add(option):next.delete(option);onAnswerChange(id,[...next].join(','));}}/></span>;}
   const options=q.sourceOptions||[];return <span key={key} id={anchor} className="ielts-source-gap"><input type="text" maxLength={2000} list={kind==='drop'?id+'-options':undefined} aria-label={'Question '+q.sourceNumbers.join('–')} value={value} disabled={reviewMode} onChange={e=>onAnswerChange(id,e.target.value)} onDragOver={e=>{if(!reviewMode)e.preventDefault();}} onDrop={e=>{e.preventDefault();if(reviewMode)return;const value=e.dataTransfer.getData('text/luma-option')||e.dataTransfer.getData('text/plain');if(value.length<100)onAnswerChange(id,value);}}/>{kind==='drop'&&options.length>0&&<datalist id={id+'-options'}>{options.map((o:any,i:number)=><option key={i} value={o.value}>{o.text}</option>)}</datalist>}{reviewMode&&<span className="ielts-source-key">Answer: {q.correct_answer}</span>}</span>;
  }
  if(el.dataset.lumaDrag)return <button key={key} type="button" className="ielts-source-drag-option" draggable={!reviewMode} onDragStart={e=>{e.dataTransfer.setData('text/luma-option',el.dataset.lumaDrag!);e.dataTransfer.setData('text/plain',el.dataset.lumaDrag!);}}>{el.textContent}</button>;
  const children=Array.from(el.childNodes).map((c,i)=>render(c,key+'-'+i));const tag=el.tagName.toLowerCase();
  if(tag==='img'){const src=el.getAttribute('src')||'';if(!/^https:\/\//.test(src)&&!/^data:image\/(png|jpeg|webp);base64,/.test(src))return null;return <img key={key} src={src} alt={el.getAttribute('alt')||'Question reference'} loading="lazy"/>;}
  if(tag==='br')return <br key={key}/>;
  if(tag==='label')return <label key={key} htmlFor={el.dataset.lumaLabelFor}>{children}</label>;
  const props={key,className:el.className||undefined};
  switch(tag){case 'div':return <div {...props}>{children}</div>;case 'span':return <span {...props}>{children}</span>;case 'p':return <p {...props}>{children}</p>;case 'strong':case 'b':return <strong {...props}>{children}</strong>;case 'em':case 'i':return <em {...props}>{children}</em>;case 'u':return <u {...props}>{children}</u>;case 'ul':return <ul {...props}>{children}</ul>;case 'ol':return <ol {...props}>{children}</ol>;case 'li':return <li {...props}>{children}</li>;case 'h2':case 'h3':case 'h4':return <h3 {...props}>{children}</h3>;case 'table':return <div key={key} className="ielts-matrix-scroll"><table className="ielts-source-table">{children}</table></div>;case 'tbody':return <tbody {...props}>{children}</tbody>;case 'thead':return <thead {...props}>{children}</thead>;case 'tr':return <tr {...props}>{children}</tr>;case 'td':return <td {...props} colSpan={Math.min(20,Number(el.getAttribute('colspan'))||1)} rowSpan={Math.min(20,Number(el.getAttribute('rowspan'))||1)}>{children}</td>;case 'th':return <th {...props} colSpan={Math.min(20,Number(el.getAttribute('colspan'))||1)} rowSpan={Math.min(20,Number(el.getAttribute('rowspan'))||1)}>{children}</th>;default:return <span key={key}>{children}</span>;}
 };
 return <section className="ielts-official-group ielts-source-content">{group.sourceHeading&&<h3>{group.sourceHeading}</h3>}{tree&&Array.from(tree.childNodes).map((n,i)=>render(n,String(i)))}</section>;
}
