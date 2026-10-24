"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { WorkspaceHeading } from "./page-parts";
import type { ContentItem,ContentKind } from "@/lib/admin/content";
const labels={practice:"Practice tests",mock:"Mock exams",vocabulary:"Vocabulary"};
const modules=["listening","reading","writing"] as const;
export function ContentManager({kind,initialItems}:{kind:ContentKind;initialItems:ContentItem[]}){
 const [items,setItems]=useState(initialItems),[editing,setEditing]=useState<string|null>(null);
 const [title,setTitle]=useState(""),[description,setDescription]=useState(""),[sections,setSections]=useState<string[]>(kind==="vocabulary"?[]:["listening","reading"]);
 const [access,setAccess]=useState<"free"|"premium">("free"),[status,setStatus]=useState<"draft"|"published">("draft"),[scheduledAt,setScheduledAt]=useState("");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[filter,setFilter]=useState("all");
 const refresh=async()=>{const r=await fetch("/api/admin/content?kind="+kind,{cache:"no-store"});if(!r.ok)throw Error("Refresh failed");setItems((await r.json()).items);};
 const reset=()=>{setEditing(null);setTitle("");setDescription("");setSections(kind==="vocabulary"?[]:["listening","reading"]);setAccess("free");setStatus("draft");setScheduledAt("");};
 const edit=(i:ContentItem)=>{setEditing(i.id);setTitle(i.title);setDescription(i.description);setSections(i.sections);setAccess(i.access);setStatus(i.status==="published"?"published":"draft");setScheduledAt(i.scheduledAt?.slice(0,16)||"");window.scrollTo({top:0,behavior:"smooth"});};
 const call=async(url:string,method:string,body?:object)=>{const r=await fetch(url,{method,headers:{"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||"Request failed");}await refresh();};
 const save=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setMessage("");try{
  const payload={kind,title,description,sections,access,status,scheduledAt:scheduledAt?new Date(scheduledAt).toISOString():null};
  await call(editing?"/api/admin/content/"+editing:"/api/admin/content",editing?"PATCH":"POST",payload);
  reset();setMessage("Saved successfully.");
 }catch(e){setMessage(e instanceof Error?e.message:"Save failed");}finally{setBusy(false);}};
 const act=async(i:ContentItem,action:"draft"|"published"|"archived"|"delete")=>{
  if(action==="delete"&&!confirm("Delete permanently?"))return;
  setBusy(true);setMessage("");
  try{await call("/api/admin/content/"+i.id,action==="delete"?"DELETE":"PATCH",action==="delete"?undefined:{status:action});}
  catch(e){setMessage(e instanceof Error?e.message:"Update failed");}finally{setBusy(false);}
 };
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="CONTENT MANAGEMENT" title={labels[kind]} description={kind==="vocabulary"?"Add vocabulary entries one by one.":kind==="mock"?"Manage mock exam modules, schedule and publication.":"Build and publish independent practice test collections."}/>
 <form className="workspace-panel admin-editor" onSubmit={save}><div className="panel-heading"><h2>{editing?"Edit":"Create"} {kind==="vocabulary"?"entry":kind==="mock"?"mock exam":"practice test"}</h2>{editing&&<button type="button" onClick={reset}>Cancel edit</button>}</div>
 <div className="form-two"><label>{kind==="vocabulary"?"Word / phrase":"Title"}<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>Access<select value={access} onChange={e=>setAccess(e.target.value as "free"|"premium")}><option value="free">Free</option><option value="premium">Premium</option></select></label></div>
 <label>{kind==="vocabulary"?"Meaning / example":"Description"}<textarea rows={3} maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)}/></label>
 {kind!=="vocabulary"&&<fieldset><legend>Available modules</legend><div className="admin-checks">{modules.map(m=><label key={m}><input type="checkbox" checked={sections.includes(m)} onChange={()=>setSections(v=>v.includes(m)?v.filter(x=>x!==m):[...v,m])}/>{m}</label>)}</div></fieldset>}
 <div className="form-two"><label>Status<select value={status} onChange={e=>setStatus(e.target.value as "draft"|"published")}><option value="draft">Draft</option><option value="published">Published</option></select></label>{kind==="mock"&&<label>Scheduled start<input type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)}/></label>}</div>
 <button className="button" disabled={busy||(!sections.length&&kind!=="vocabulary")}>{editing?"Update":"Create"} <span>↗</span></button></form>
 {message&&<p role="status" className="admin-feedback">{message}</p>}
 <div className="admin-filter-row"><h2>All {labels[kind].toLowerCase()} <small>{items.length}</small></h2><select aria-label="Filter status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
 <div className="admin-item-grid">{items.filter(i=>filter==="all"||i.status===filter).map(i=><article key={i.id} className="workspace-panel admin-item-card"><div className="admin-item-top"><span className="access-pill">{i.status}</span><details><summary aria-label={"Actions for "+i.title}>⋯</summary><div className="admin-item-menu"><button onClick={()=>edit(i)}>Edit</button><button disabled={busy} onClick={()=>act(i,"draft")}>Draft / Unpublish</button><button disabled={busy} onClick={()=>act(i,"published")}>Publish</button><button disabled={busy} onClick={()=>act(i,"archived")}>Archive</button><button disabled={busy} onClick={()=>act(i,"delete")}>Delete</button></div></details></div><h3>{kind==="vocabulary"?i.title:<Link href={`/admin/engine/${kind}/${i.id}`}>{i.title} ↗</Link>}</h3><p>{i.description||"No description"}</p><div className="admin-item-meta">{i.sections.join(" · ")||"Vocabulary"} · {i.access}{i.scheduledAt?" · "+new Date(i.scheduledAt).toLocaleString():""}</div>{kind!=="vocabulary"&&<Link className="button" href={`/admin/engine/${kind}/${i.id}`}>Manage modules ↗</Link>}{kind!=="vocabulary"&&<Link className="text-link" href={`/admin/speaking/${kind}/${i.id}`}>Manage speaking ↗</Link>}</article>)}
 {!items.length&&<div className="workspace-panel admin-empty">No {labels[kind].toLowerCase()} yet. Create your first item above.</div>}</div></div>;
}
