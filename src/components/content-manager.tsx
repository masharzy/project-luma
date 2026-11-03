"use client";
import {BookOpen,Plus,Pencil} from "lucide-react";
import {AdminModal} from "./admin-modal";
import { otherBooks } from "@/lib/other-books";
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { WorkspaceHeading } from "./page-parts";
import type { ContentItem,ContentKind } from "@/lib/admin/content";
const labels={practice:"Recent Tests",mock:"Mock exams",vocabulary:"Vocabulary"};
const modules=["listening","reading","writing","speaking"] as const;
export function ContentManager({kind,initialItems,collection=false,catalog,tools,initialBookSlug}:{kind:ContentKind;initialItems:ContentItem[];collection?:boolean;catalog?:{slug:string;series:string;volume:string}[];tools?:ReactNode;initialBookSlug?:string}){
 const books=catalog||otherBooks;
 const [showEditor,setShowEditor]=useState(false);
 const [bookSlug,setBookSlug]=useState(initialBookSlug|| (collection?(books[0]?.slug||""):""));
 const [items,setItems]=useState(initialItems),[editing,setEditing]=useState<string|null>(null);
 const [title,setTitle]=useState(""),[description,setDescription]=useState(""),[sections,setSections]=useState<string[]>(kind==="vocabulary"?[]:kind==="mock"?["listening","reading","writing","speaking"]:["listening","reading","writing"]);
 const [access,setAccess]=useState<"free"|"premium">("free"),[status,setStatus]=useState<"draft"|"published">("draft"),[scheduledAt,setScheduledAt]=useState("");
 const [durations,setDurations]=useState<Record<string,number>>(kind==='practice'?{listening:30,reading:60,writing:60}:{listening:30,reading:60,writing:60,speaking:15});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[filter,setFilter]=useState("all"),[search,setSearch]=useState(""),[bookFilter,setBookFilter]=useState("all"),[page,setPage]=useState(1),[selected,setSelected]=useState<string[]>([]);
 const refresh=async()=>{const r=await fetch("/api/admin/content?kind="+kind,{cache:"no-store"});if(!r.ok)throw Error("Refresh failed");setItems((await r.json()).items);};
 const reset=()=>{setBookSlug(initialBookSlug||(collection?(books[0]?.slug||""):""));setEditing(null);setTitle("");setDescription("");setDurations(kind==='practice'?{listening:30,reading:60,writing:60}:{listening:30,reading:60,writing:60,speaking:15});setSections(kind==="vocabulary"?[]:kind==="mock"?["listening","reading","writing","speaking"]:["listening","reading","writing"]);setAccess("free");setStatus("draft");setScheduledAt("");};
 const edit=(i:ContentItem)=>{setBookSlug(i.bookSlug||"");setEditing(i.id);setTitle(i.title);setDescription(i.description);setSections(kind==='practice'?i.sections.filter(s=>s!=='speaking'):i.sections);setDurations(kind==='practice'?Object.fromEntries(Object.entries(i.durations).filter(([k])=>k!=='speaking')):i.durations);setAccess(i.access);setStatus(i.status==="published"?"published":"draft");setScheduledAt(i.scheduledAt?new Date(new Date(i.scheduledAt).getTime()+6*3600000).toISOString().slice(0,16):'');setShowEditor(true);};
 const call=async(url:string,method:string,body?:object)=>{const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||"Request failed");}await refresh();};
 const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage("");try{
  const payload={...(kind==="practice"?{bookSlug:bookSlug||null}:{}),durations,kind,title,description,sections,access,status,scheduledAt:scheduledAt?new Date(scheduledAt+'+06:00').toISOString():null};
  await call(editing?"/api/admin/content/"+editing:"/api/admin/content",editing?"PATCH":"POST",payload);
  reset();setShowEditor(false);setMessage("Saved successfully.");
 }catch(e){setMessage(e instanceof Error?e.message:"Save failed");}finally{setBusy(false);}};
 const bulk=async(status:"draft"|"published"|"archived")=>{
  if(!selected.length||!confirm("Change "+selected.length+" selected records to "+status+"?"))return;
  setBusy(true);setMessage("");
  try{
   const r=await fetch("/api/admin/content/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,status,ids:selected})});
   const d=await r.json();if(!r.ok)throw Error(d.error||"Bulk change failed");
   setSelected([]);await refresh();setMessage(d.updated+" records updated.");
  }catch(e){setMessage(e instanceof Error?e.message:"Bulk update failed");}finally{setBusy(false);}
 };
 const act=async(i:ContentItem,action:"draft"|"published"|"archived"|"delete")=>{
  if(action==="delete"&&!confirm("Delete permanently?"))return;
  setBusy(true);setMessage("");
  try{await call("/api/admin/content/"+i.id,action==="delete"?"DELETE":"PATCH",action==="delete"?undefined:{status:action});}
  catch(e){setMessage(e instanceof Error?e.message:"Update failed");}finally{setBusy(false);}
 };
 const filtered=items.filter(i=>(collection?!!i.bookSlug:!i.bookSlug))
   .filter(i=>!initialBookSlug||i.bookSlug===initialBookSlug)
   .filter(i=>filter==="all"||i.status===filter)
   .filter(i=>!collection||bookFilter==="all"||i.bookSlug===bookFilter)
   .filter(i=>!search||[i.title,i.description,i.bookSlug||""].some(v=>v.toLowerCase().includes(search.toLowerCase())));
 const pageSize=24,maxPage=Math.max(1,Math.ceil(filtered.length/pageSize)),safePage=Math.min(page,maxPage);
 return <div className={"admin-refactor"+(kind==='vocabulary'?' admin-vocabulary-library':'')}>{kind==='vocabulary'?<header className="adm-library-heading"><div><h1>Vocabulary</h1><p>Word, meaning ও example একসঙ্গে সাজিয়ে রাখুন।</p></div><button className="button" type="button" onClick={()=>{reset();setShowEditor(true);}}><Plus size={15}/> Add vocabulary</button></header>:<WorkspaceHeading eyebrow="CONTENT MANAGEMENT" title={initialBookSlug?(books.find(b=>b.slug===initialBookSlug)?.series+' · '+books.find(b=>b.slug===initialBookSlug)?.volume):collection?"More Books":labels[kind]} />}
 {tools}{kind!=='vocabulary'&&<div className="adm-section-actions"><button className="button" type="button" onClick={()=>{reset();setShowEditor(true);}}>＋ Create test</button></div>}<AdminModal open={showEditor} title={(editing?'Edit ':'Create ')+(kind==='vocabulary'?'vocabulary entry':'test')} onClose={()=>setShowEditor(false)} busy={busy}><form className="workspace-panel admin-editor" onSubmit={save}>{editing&&<button type="button" className="button outline" onClick={reset}>Cancel edit</button>}
 <div className="form-two"><label>{kind==="vocabulary"?"Word / phrase":"Title"}<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Access<select value={access} onChange={e=>setAccess(e.target.value as "free"|"premium")}><option value="free">Free</option><option value="premium">Premium</option></select></label></div>
 {kind==="practice"&&<label>Book collection<select required={collection} value={bookSlug} onChange={e=>setBookSlug(e.target.value)}><option value="">Recent Tests (no book)</option>{books.map(b=><option key={b.slug} value={b.slug}>{b.series} · {b.volume}</option>)}</select></label>}
 <label>{kind==="vocabulary"?"Meaning / example":"Description"}<textarea rows={3} maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)}/></label>
 {kind!=="vocabulary"&&<fieldset><legend>Available modules & minutes</legend><p className="adm-note">Writing evaluation uses AI credits.</p><div className="adm-module-fields">{modules.filter(m=>kind!=='practice'||m!=='speaking').map(m=><label key={m}><input type="checkbox" checked={sections.includes(m)} onChange={()=>setSections(v=>v.includes(m)?v.filter(x=>x!==m):[...v,m])}/>{m}<input aria-label={m+" minutes"} type="number" min="1" max="240" disabled={!sections.includes(m)} value={durations[m]} onChange={e=>setDurations(v=>({...v,[m]:Number(e.target.value)}))}/></label>)}</div></fieldset>}
 <div className="form-two"><label>Status<select value={status} onChange={e=>setStatus(e.target.value as "draft"|"published")}><option value="draft">Draft</option><option value="published">Published</option></select></label>{kind==="mock"&&<label>Scheduled start (Bangladesh time)<input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label>}</div>
 <button className="button" disabled={busy||(!sections.length&&kind!=="vocabulary")}>{editing?"Update":"Create"} <span>↗</span></button>{message&&<p role="alert">{message}</p>}</form></AdminModal>
 {message&&<p role="status" className="admin-feedback">{message}</p>}
 <div className="admin-filter-row"><h2>{kind==="vocabulary"?"Entries":"Tests"} <small>{filtered.length}</small></h2><label>Search <input type="search" maxLength={100} value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder={kind==='vocabulary'?'Find a word or phrase…':'Find tests by title or book'}/></label>{collection&&<select aria-label="Filter books" value={bookFilter} onChange={e=>{setBookFilter(e.target.value);setPage(1)}}><option value="all">All books</option>{books.map(b=><option key={b.slug} value={b.slug}>{b.series} · {b.volume}</option>)}</select>}<select aria-label="Filter status" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1)}}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
 <div className="admin-user-filters adm-content-bulk"><span>{selected.length} selected</span><button type="button" disabled={busy||!selected.length} onClick={()=>void bulk("published")}>Publish selected</button><button type="button" disabled={busy||!selected.length} onClick={()=>void bulk("draft")}>Unpublish selected</button><button type="button" disabled={busy||!selected.length} onClick={()=>void bulk("archived")}>Archive selected</button><button type="button" onClick={()=>setSelected([])}>Clear selection</button></div>
 <div className={kind==='vocabulary'?'admin-vocabulary-grid':'admin-item-grid'}>{filtered.slice((safePage-1)*pageSize,safePage*pageSize).map(i=><article key={i.id} className="workspace-panel admin-item-card"><div className="admin-item-top"><label><input type="checkbox" checked={selected.includes(i.id)} onChange={e=>setSelected(v=>e.target.checked?[...new Set([...v,i.id])]:v.filter(id=>id!==i.id))} aria-label={"Select "+i.title}/><span className="access-pill">{i.status}</span></label><details><summary aria-label={"Actions for "+i.title}>⋯</summary><div className="admin-item-menu"><button onClick={()=>edit(i)}>Edit</button><button disabled={busy||i.status==='draft'} onClick={()=>act(i,"draft")}>Unpublish to draft</button>{i.status!=='published'&&<button disabled={busy} onClick={()=>act(i,"published")}>Publish</button>}<button disabled={busy} onClick={()=>act(i,"archived")}>Archive</button><button disabled={busy} onClick={()=>act(i,"delete")}>Delete</button></div></details></div><h3>{kind==="vocabulary"?i.title:<Link href={`/admin/engine/${kind==='practice'?'recent-tests':kind}/${i.id}`}>{i.title} ↗</Link>}</h3>{kind==="vocabulary"&&i.description&&<p>{i.description}</p>}<div className="admin-item-meta">{i.sections.join(" · ")||"Vocabulary"} · {i.access}{i.scheduledAt?" · "+new Date(i.scheduledAt).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})+' (BD time)':""}</div>{kind==='vocabulary'&&<button className="adm-text-action" type="button" onClick={()=>edit(i)}><Pencil size={14}/> Edit entry</button>}{kind==='mock'&&i.status==='draft'&&<Link className="button button-outline" href={'/admin/mocks/'+i.id+'#source-picker'}>Use existing test ↗</Link>}{kind==='mock'&&<Link className="button" href={'/admin/mocks/'+i.id}>Schedule & results ↗</Link>}</article>)}
 {!filtered.length&&(kind==='vocabulary'?<div className="adm-content-empty"><BookOpen size={32}/><h2>{items.length?'No matching entries':'No vocabulary entries yet'}</h2><p>{items.length?'অন্য কোনো word বা phrase দিয়ে খুঁজুন।':'Word, meaning ও example যোগ করে vocabulary library তৈরি করুন।'}</p>{!items.length&&<button className="adm-text-action" type="button" onClick={()=>{reset();setShowEditor(true);}}><Plus size={14}/> Add vocabulary</button>}</div>:<div className="workspace-panel admin-empty">No matching {labels[kind].toLowerCase()} found.</div>)}</div><div className="admin-pagination"><span>Page {safePage} / {maxPage}</span><div><button type="button" disabled={safePage<=1} onClick={()=>setPage(v=>v-1)}>← Previous</button><button type="button" disabled={safePage>=maxPage} onClick={()=>setPage(v=>v+1)}>Next →</button></div></div></div>;
}
