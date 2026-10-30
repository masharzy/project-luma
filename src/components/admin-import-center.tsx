"use client";
import {useState} from "react";
import {WorkspaceHeading} from "@/components/page-parts";
type Preview={sourceKey:string;title:string;duplicate:boolean;reason:string|null};
export function AdminImportCenter(){
 const [records,setRecords]=useState<unknown[]>([]),[filename,setFilename]=useState(""),[summary,setSummary]=useState<Preview[]>([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function choose(files:FileList|null){
  setRecords([]);setSummary([]);setMessage("");
  if(!files?.length)return;
  if(files.length>12){setMessage("Select at most 12 JSON files per batch.");return;}
  try{
   const parsed:unknown[]=[];
   for(const file of Array.from(files)){
    if(!file.name.toLowerCase().endsWith(".json")||file.size>2500000)throw Error("Use JSON files smaller than 2.5 MB. ZIP archives must be prepared into the platform JSON format first.");
    const data=JSON.parse(await file.text());
    parsed.push(...(Array.isArray(data)?data:[data]));
   }
   if(parsed.length>12)throw Error("A batch can contain at most 12 Full Tests.");
   setRecords(parsed);setFilename(Array.from(files).map(f=>f.name).join(", "));setMessage(parsed.length+" candidate tests loaded. Run the duplicate preview before importing.");
  }catch(e){setMessage(e instanceof Error?e.message:"Invalid JSON");}
 }
 async function run(mode:"preview"|"apply"){
  if(!records.length)return;setBusy(true);setMessage("");
  try{
   if(mode==="apply"&&!window.confirm("Append the non-duplicate Full Tests as DRAFTS? Existing tests will not be overwritten."))return;
   const response=await fetch("/api/admin/import",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,records})});
   const data=await response.json();if(!response.ok)throw Error(data.error||"Import request failed");
   if(mode==="preview"){setSummary(data.summary);setMessage(data.ready+" ready to import; "+(data.summary.length-data.ready)+" duplicates skipped.");}
   else {setMessage(data.inserted+" draft tests imported, "+data.skipped+" skipped. "+(data.errors?.length?data.errors.join("; "):"Review and publish tests from Practice admin."));setSummary([]);setRecords([]);}
  }catch(e){setMessage(e instanceof Error?e.message:"Import failed");}finally{setBusy(false);}
 }
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="CONTENT / IMPORT" title="Practice Full Test Import" description="Securely preview and import Listening, Reading and Writing tests. Speaking is never imported here."/>
  <section className="workspace-panel admin-editor"><h2>Upload prepared Full Test JSON</h2><p>Use the platform ExamDocument JSON format: each record has docs.listening, docs.reading, docs.writing and an optional unique sourceKey. ZIPs of unknown formats cannot be imported without preparation. Import only files you have rights to use.</p>
   <label>JSON files<input type="file" multiple accept=".json,application/json" disabled={busy} onChange={e=>void choose(e.target.files)}/></label>{filename&&<p>{filename}</p>}
   <div className="admin-user-filters"><button className="button" type="button" disabled={busy||!records.length} onClick={()=>void run("preview")}>{busy?"Checking…":"Preview duplicates & validate"}</button><button type="button" disabled={busy||!records.length||!summary.length} onClick={()=>void run("apply")}>Import ready tests as drafts ↗</button></div>
   <p role="status">{message}</p><p>No existing test is modified. Only records with three complete modules are eligible. All imported tests stay in Draft until explicitly published.</p>
  </section>
  {!!summary.length&&<section className="workspace-panel"><h2>Validation report</h2><div className="table-scroll"><table className="admin-users-table"><thead><tr><th>TEST</th><th>SOURCE KEY</th><th>STATUS</th></tr></thead><tbody>{summary.map(r=><tr key={r.sourceKey}><td>{r.title}</td><td>{r.sourceKey}</td><td>{r.duplicate?"Duplicate: "+r.reason:"Ready (draft)"}</td></tr>)}</tbody></table></div></section>}
 </div>;
}
