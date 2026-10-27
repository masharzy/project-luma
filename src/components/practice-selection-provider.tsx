"use client";
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import { usePathname,useRouter } from 'next/navigation';
import { ArrowUpRight,LoaderCircle,X } from 'lucide-react';
import { restorePracticeSelection,togglePracticeGroup,selectionStorageKey,type SelectedPracticeGroup } from '@/lib/exam/practice-selection';
import { questionTypeLabel } from '@/lib/exam/question-types';
type Selection={items:SelectedPracticeGroup[];toggle:(item:SelectedPracticeGroup)=>void;busy:boolean};
const Context=createContext<Selection|null>(null);
export function usePracticeSelection(){const value=useContext(Context);if(!value)throw Error('Practice selection provider is missing');return value;}
export function PracticeSelectionProvider({children}:{children:ReactNode}){
 const [items,setItems]=useState<SelectedPracticeGroup[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pathname=usePathname(),router=useRouter();
 useEffect(()=>{try{setItems(restorePracticeSelection(JSON.parse(sessionStorage.getItem(selectionStorageKey)||'[]')));}catch{}setReady(true);},[]);
 useEffect(()=>{if(ready)try{sessionStorage.setItem(selectionStorageKey,JSON.stringify(items));}catch{}},[items,ready]);
 const total=items.reduce((n,g)=>n+g.questionCount,0);
 const toggle=(item:SelectedPracticeGroup)=>{if(!ready||busy)return;setError('');setItems(current=>togglePracticeGroup(current,item));};
 const start=async()=>{if(busy||!items.length)return;setBusy(true);setError('');try{
  const response=await fetch('/api/practice/question-types',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({modules:[...new Set(items.map(g=>g.module))],types:[],selectionMode:'groups',count:items.length,keys:items.map(g=>g.key)})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to start practice.');
  // Clear only after the server successfully snapshots every selected source.
  try{sessionStorage.removeItem(selectionStorageKey);}catch{}setItems([]);router.push(data.url);
 }catch(e){setError(e instanceof Error?e.message:'Unable to start practice.');}finally{setBusy(false);}};
 const hidden=!['/practice','/cambridge','/other-books'].some(p=>pathname===p||pathname.startsWith(p+'/'));
 return <Context.Provider value={{items,toggle,busy}}>{children}{ready&&items.length>0&&!hidden&&<aside className="type-floating-selection is-visible shared-practice-bar" aria-label="Selected practice">
 <div><details><summary><strong>{items.length} groups selected</strong><small>{total} questions · across your collections</small></summary><div className="shared-practice-items">{items.map(g=><div key={g.key}><span><b>{g.sourceLabel}</b><small>{g.module} · {questionTypeLabel(g.type)} · Q {g.number}</small></span><button type="button" disabled={busy} aria-label={'Remove '+g.sourceLabel+', questions '+g.number} onClick={()=>toggle(g)}><X size={16}/></button></div>)}</div></details></div>
 <button type="button" className="type-start-button" disabled={busy} onClick={()=>void start()}>{busy?<LoaderCircle size={16} className="type-spin"/>:null}{busy?'Preparing…':'Start this Practice'}<ArrowUpRight size={16}/></button>
 <button type="button" className="type-floating-clear" aria-label="Clear selection" disabled={busy} onClick={()=>{setItems([]);setError('');}}><X size={18}/></button>
 {error&&<p className="shared-practice-error" role="alert">{error} Your selection has been kept; remove unavailable groups to continue.</p>}
 <span className="type-selection-status" role="status" aria-live="polite">{items.length} groups selected, {total} questions</span>
 </aside>}</Context.Provider>;
}
