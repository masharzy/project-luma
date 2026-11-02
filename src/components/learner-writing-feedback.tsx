"use client";

import {useState} from "react";
import dynamic from "next/dynamic";
const WritingEvaluation=dynamic(()=>import("./writing-evaluation").then(m=>m.WritingEvaluation),{loading:()=> <p role="status">Loading feedback…</p>});

export function LearnerWritingFeedback({id,source,label,status}:{id:string;source:"submission"|"attempt";label:string;status:string}){
 const [open,setOpen]=useState(false);
 return <details className="student-feedback" id={"writing-"+id} onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary><span>{label}</span><span className="student-tag">{status}</span></summary>
  {open&&<WritingEvaluation attemptId={id} source={source}/>}
 </details>;
}
