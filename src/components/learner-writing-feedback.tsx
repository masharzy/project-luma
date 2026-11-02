"use client";

import {useState,useEffect} from "react";
import dynamic from "next/dynamic";
const WritingEvaluation=dynamic(()=>import("./writing-evaluation").then(m=>m.WritingEvaluation),{loading:()=> <p role="status">Loading feedback…</p>});

export function LearnerWritingFeedback({id,source,label,status}:{id:string;source:"submission"|"attempt";label:string;status:string}){
 const [open,setOpen]=useState(false);
 useEffect(()=>{const reveal=()=>{if(location.hash==='#writing-'+id)setOpen(true);};reveal();window.addEventListener('hashchange',reveal);return()=>window.removeEventListener('hashchange',reveal);},[id]);
 return <details open={open} className="student-feedback" id={"writing-"+id} onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary><span>{label}</span><span className="student-tag">{status}</span></summary>
  {open&&<WritingEvaluation attemptId={id} source={source}/>}
 </details>;
}
