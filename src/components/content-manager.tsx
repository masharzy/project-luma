"use client";
import { otherBooks } from "@/lib/other-books";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { WorkspaceHeading } from "./page-parts";
import type { ContentItem,ContentKind } from "@/lib/admin/content";
const labels={practice:"Practice tests",mock:"Mock exams",vocabulary:"Vocabulary"};
const modules=["listening","reading","writing","speaking"] as const;
export function ContentManager({kind,initialItems,collection=false,catalog}:{kind:ContentKind;initialItems:ContentItem[];collection?:boolean;catalog?:{slug:string;series:string;volume:string}[]}){
 const books=catalog||otherBooks;
 const [bookSlug,setBookSlug]=useState(collection?(books[0]?.slug||""):"");
 const [items,setItems]=useState(initialItems),[editing,setEditing]=useState<string|null>(null);
 const [title,setTitle]=useState(""),[description,setDescription]=useState(""),[sections,setSections]=useState<string[]>(kind==="vocabulary"?[]:kind==="mock"?["listening","reading","writing","speaking"]:["listening","reading","writing"]);
 const [access,setAccess]=useState<"free"|"premium">("free"),[status,setStatus]=useState<"draft"|"published">("draft"),[scheduledAt,setScheduledAt]=useState("");
 const [durations,setDurations]=useState<Record<string,number>>(kind==='practice'?{listening:30,reading:60,writing:60}:{listening:30,reading:60,writing:60,speaking:15});
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[filter,setFilter]=useState("all"),[search,setSearch]=useState(""),[bookFilter,setBookFilter]=useState("all"),[page,setPage]=useState(1),[selected,setSelected]=useState<string[]>([]);
 const refresh=async()=>{const r=await fetch("/api/admin/content?kind="+kind,{cache:"no-store"});if(!r.ok)throw Error("Refresh failed");setItems((await r.json()).items);};
 const reset=()=>{setBookSlug(collection?(books[0]?.slug||""):"");setEditing(null);setTitle("");setDescription("");setDurations(kind==='practice'?{listening:30,reading:60,writing:60}:{listening:30,reading:60,writing:60,speaking:15});setSections(kind==="vocabulary"?[]:kind==="mock"?["listening","reading","writing","speaking"]:["listening","reading"]);setAccess("free");setStatus("draft");setScheduledAt("");};
 const edit=(i:ContentItem)=>{setBookSlug(i.bookSlug||"");setEditing(i.id);setTitle(i.title);setDescription(i.description);setSections(kind==='practice'?i.sections.filter(s=>s!=='speaking'):i.sections);setDurations(kind==='practice'?Object.fromEntries(Object.entries(i.durations).filter(([k])=>k!=='speaking')):i.durations);setAccess(i.access);setStatus(i.status==="published"?"published":"draft");setScheduledAt(i.scheduledAt?new Date(new Date(i.scheduledAt).getTime()+6*3600000).toISOString().slice(0,16):'');window.scrollTo({top:0,behavior:"smooth"});};
 const call=async(url:string,method:string,body?:object)=>{const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||"Request failed");}await refresh();};
 const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage("");try{
  const payload={...(kind==="practice"?{bookSlug:bookSlug||null}:{}),durations,kind,title,description,sections,access,status,scheduledAt:scheduledAt?new Date(scheduledAt+'+06:00').toISOString():null};
  await call(editing?"/api/admin/content/"+editing:"/api/admin/content",editing?"PATCH":"POST",payload);
  reset();setMessage("Saved successfully.");
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
   .filter(i=>filter==="all"||i.status===filter)
   .filter(i=>!collection||bookFilter==="all"||i.bookSlug===bookFilter)
   .filter(i=>!search||[i.title,i.description,i.bookSlug||""].some(v=>v.toLowerCase().includes(search.toLowerCase())));
 const pageSize=24,maxPage=Math.max(1,Math.ceil(filtered.length/pageSize)),safePage=Math.min(page,maxPage);
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="CONTENT MANAGEMENT" title={collection?"More Books":labels[kind]} description={kind==="vocabulary"?"Add vocabulary entries one by one.":kind==="mock"?"Manage mock exam modules, schedule and publication.":"Build and publish independent practice test collections."}/>
 <form className="workspace-panel admin-editor" onSubmit={save}><div className="panel-heading"><h2>{editing?"Edit":"Create"} {kind==="vocabulary"?"entry":kind==="mock"?"mock exam":"practice test"}</h2>{editing&&<button type="button" onClick={reset}>Cancel edit</button>}</div>
 <div className="form-two"><label>{kind==="vocabulary"?"Word / phrase":"Title"}<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Access<select value={access} onChange={e=>setAccess(e.target.value as "free"|"premium")}><option value="free">Free</option><option value="premium">Premium</option></select></label></div>
 {kind==="practice"&&<label>Book collection<select required={collection} value={bookSlug} onChange={e=>setBookSlug(e.target.value)}><option value="">Independent practice (no book)</option>{books.map(b=><option key={b.slug} value={b.slug}>{b.series} · {b.volume}</option>)}</select></label>}
 <label>{kind==="vocabulary"?"Meaning / example":"Description"}<textarea rows={3} maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)}/></label>
 {kind!=="vocabulary"&&<fieldset><legend>Available modules & minutes</legend><p>{kind==='mock'?'Scheduled mocks contain Listening, Reading, Writing and Speaking. Complete the paper, then open registration from Schedule & results.':'Practice Full Tests require Listening, Reading and Writing. Writing feedback uses the shared AI Writing allowance.'}</p><div className="admin-checks">{modules.filter(m=>kind!=='practice'||m!=='speaking').map(m=><label key={m}><input type="checkbox" checked={sections.includes(m)} onChange={()=>setSections(v=>v.includes(m)?v.filter(x=>x!==m):[...v,m])}/>{m}<input aria-label={m+" minutes"} type="number" min="1" max="240" disabled={!sections.includes(m)} value={durations[m]} onChange={e=>setDurations(v=>({...v,[m]:Number(e.target.value)}))}/></label>)}</div></fieldset>}
 <div className="form-two"><label>Status<select value={status} onChange={e=>setStatus(e.target.value as "draft"|"published")}><option value="draft">Draft</option><option value="published">Published</option></select></label>{kind==="mock"&&<label>Scheduled start (Bangladesh time)<input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label>}</div>
 <button className="button" disabled={busy||(!sections.length&&kind!=="vocabulary")}>{editing?"Update":"Create"} <span>↗</span></button></form>
 {message&&<p role="status" className="admin-feedback">{message}</p>}
 <div className="admin-filter-row"><h2>All {labels[kind].toLowerCase()} <small>{filtered.length}</small></h2><label>Search <input type="search" maxLength={100} value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Find tests by title or book"/></label>{collection&&<select aria-label="Filter books" value={bookFilter} onChange={e=>{setBookFilter(e.target.value);setPage(1)}}><option value="all">All books</option>{books.map(b=><option key={b.slug} value={b.slug}>{b.series} · {b.volume}</option>)}</select>}<select aria-label="Filter status" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1)}}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
 <div className="admin-user-filters"><span>{selected.length} selected</span><button type="button" disabled={busy||!selected.length} onClick={()=>void bulk("published")}>Publish selected</button><button type="button" disabled={busy||!selected.length} onClick={()=>void bulk("draft")}>Unpublish selected</button><button type="button" disabled={busy||!selected.length} onClick={()=>void bulk("archived")}>Archive selected</button><button type="button" onClick={()=>setSelected([])}>Clear selection</button></div>
 <div className="admin-item-grid">{filtered.slice((safePage-1)*pageSize,safePage*pageSize).map(i=><article key={i.id} className="workspace-panel admin-item-card"><div className="admin-item-top"><label><input type="checkbox" checked={selected.includes(i.id)} onChange={e=>setSelected(v=>e.target.checked?[...new Set([...v,i.id])]:v.filter(id=>id!==i.id))} aria-label={"Select "+i.title}/><span className="access-pill">{i.status}</span></label><details><summary aria-label={"Actions for "+i.title}>⋯</summary><div className="admin-item-menu"><button onClick={()=>edit(i)}>Edit</button><button disabled={busy} onClick={()=>act(i,"draft")}>Draft / Unpublish</button><button disabled={busy} onClick={()=>act(i,"published")}>Publish</button><button disabled={busy} onClick={()=>act(i,"archived")}>Archive</button><button disabled={busy} onClick={()=>act(i,"delete")}>Delete</button></div></details></div><h3>{kind==="vocabulary"?i.title:<Link href={`/admin/engine/${kind}/${i.id}`}>{i.title} ↗</Link>}</h3><p>{i.description||"No description"}</p><div className="admin-item-meta">{i.sections.join(" · ")||"Vocabulary"} · {i.access}{i.scheduledAt?" · "+new Date(i.scheduledAt).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})+' (BD time)':""}</div>{kind==='mock'&&i.status==='draft'&&<Link className="button button-outline" href={'/admin/mocks/'+i.id+'#source-picker'}>Use existing test ↗</Link>}{kind==='mock'&&<Link className="button" href={'/admin/mocks/'+i.id}>Schedule & results ↗</Link>}{kind!=="vocabulary"&&<Link className="button" href={`/admin/engine/${kind}/${i.id}`}>Manage modules ↗</Link>}</article>)}
 {!filtered.length&&<div className="workspace-panel admin-empty">No matching {labels[kind].toLowerCase()} found.</div>}</div><div className="admin-pagination"><span>Page {safePage} / {maxPage}</span><div><button type="button" disabled={safePage<=1} onClick={()=>setPage(v=>v-1)}>← Previous</button><button type="button" disabled={safePage>=maxPage} onClick={()=>setPage(v=>v+1)}>Next →</button></div></div></div>;
}
