"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { WorkspaceHeading } from "./page-parts";
import type { CambridgeTest, CambridgeSection } from "@/lib/cambridge";

export function CambridgeTestManager({initialTests}:{initialTests:CambridgeTest[]}) {
 const [tests,setTests]=useState(initialTests);
 const [book,setBook]=useState("1"),[serial,setSerial]=useState("1"),[title,setTitle]=useState("");
 const [access,setAccess]=useState<"free"|"premium">("free");
 const [status,setStatus]=useState<"draft"|"published">("draft");
 const [sections,setSections]=useState<CambridgeSection[]>(["listening","reading"]);
 const [error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [search,setSearch]=useState("");
 const refresh=async()=>{
  const res=await fetch("/api/admin/cambridge-tests",{cache:"no-store"});
  if(!res.ok)throw new Error("Could not load tests");
  const data=await res.json();setTests(data.tests);
 };
 const toggle=(section:CambridgeSection)=>setSections(prev=>prev.includes(section)?prev.filter(s=>s!==section):[...prev,section]);
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setError("");setNotice("");
  if(!sections.length){setError("Select at least one section.");return;}
  setBusy(true);
  try {
   const res=await fetch("/api/admin/cambridge-tests",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({bookNumber:Number(book),testNumber:Number(serial),title,access,status,sections})
   });
   const result=await res.json();
   if(!res.ok)throw new Error(result.error||"Could not save test");
   await refresh();setNotice("Test saved successfully.");setSerial(String(Number(serial)+1));setTitle("");
  }catch(err){setError(err instanceof Error?err.message:"Save failed");}
  finally{setBusy(false);}
 };
 const change=async(id:string,values:{status?:"draft"|"published";access?:"free"|"premium"})=>{
  setBusy(true);setError("");setNotice("");
  try{
   const res=await fetch("/api/admin/cambridge-tests/"+id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(values)});
   if(!res.ok)throw new Error((await res.json()).error||"Could not update");
   await refresh();
  }catch(err){setError(err instanceof Error?err.message:"Update failed");}
  finally{setBusy(false);}
 };
 const remove=async(id:string)=>{
  if(!window.confirm("Delete this Cambridge test permanently?"))return;
  setBusy(true);setError("");setNotice("");
  try{
   const res=await fetch("/api/admin/cambridge-tests/"+id,{method:"DELETE"});
   if(!res.ok)throw new Error("Could not delete");
   await refresh();
  }catch(err){setError(err instanceof Error?err.message:"Delete failed");}
  finally{setBusy(false);}
 };
 const filtered=tests.filter(t=>`cambridge ${t.bookNumber} test ${t.testNumber} ${t.title}`.toLowerCase().includes(search.toLowerCase()));
 return <>
  <WorkspaceHeading eyebrow="CONTENT / CAMBRIDGE TESTS" title="Manage Cambridge tests."
   description="Cambridge book ও test serial অনুযায়ী সাজাও, section বেছে নাও, Free/Premium এবং publish status নিয়ন্ত্রণ করো।">
   <Link href="/admin/questions" className="text-link">Question bank ↗</Link>
  </WorkspaceHeading>
  <div className="admin-integration-note">Test metadata database-এ save হচ্ছে। Question bank এবং runnable exam engine এখনো সংযুক্ত নয়।</div>
  <form className="workspace-panel draft-editor" onSubmit={submit}>
   <h2>Add Cambridge test</h2>
   <div className="form-two">
    <label>Cambridge book number<input type="number" min={1} max={1000} required value={book} onChange={e=>setBook(e.target.value)}/></label>
    <label>Test serial<input type="number" min={1} max={1000} required value={serial} onChange={e=>setSerial(e.target.value)}/></label>
   </div>
   <label>Test title<input maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Optional — Test 1"/></label>
   <div className="form-two">
    <label>Access<select value={access} onChange={e=>setAccess(e.target.value as "free"|"premium")}>
     <option value="free">Free</option><option value="premium">Premium</option></select></label>
    <label>Status<select value={status} onChange={e=>setStatus(e.target.value as "draft"|"published")}>
     <option value="draft">Draft</option><option value="published">Published</option></select></label>
   </div>
   <fieldset><legend>Available sections</legend>
    {(["listening","reading","writing"] as const).map(s=><label key={s} style={{display:"inline-flex",gap:8,marginRight:20,alignItems:"center"}}>
     <input type="checkbox" checked={sections.includes(s)} onChange={()=>toggle(s)}/>{s[0].toUpperCase()+s.slice(1)}
    </label>)}
   </fieldset>
   <button className="button" type="submit" disabled={busy}>Save test +</button>
  </form>
  {error&&<p role="alert">{error}</p>}
  {notice&&<p role="status">{notice}</p>}
  <section className="workspace-panel admin-table-panel">
   <div className="catalog-toolbar"><label className="search-field">Search tests
    <input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Book or test number"/>
   </label></div>
   <div className="table-scroll"><table>
    <thead><tr><th>BOOK</th><th>TEST</th><th>SECTIONS</th><th>ACCESS</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
    <tbody>{filtered.map(t=><tr key={t.id}>
     <td>Cambridge {t.bookNumber}</td><td>{t.title||"Test "+t.testNumber} (#{t.testNumber})</td>
     <td>{t.sections.join(", ")}</td>
     <td><select aria-label="Test access" disabled={busy} value={t.access} onChange={e=>change(t.id,{access:e.target.value as "free"|"premium"})}>
      <option value="free">Free</option><option value="premium">Premium</option></select></td>
     <td><select aria-label="Publish status" disabled={busy} value={t.status} onChange={e=>change(t.id,{status:e.target.value as "draft"|"published"})}>
      <option value="draft">Draft</option><option value="published">Published</option></select></td>
     <td><button type="button" disabled={busy} onClick={()=>remove(t.id)}>Delete</button></td>
    </tr>)}
    {filtered.length===0&&<tr><td colSpan={6}>No Cambridge tests found.</td></tr>}
    </tbody>
   </table></div>
  </section>
 </>;
}
