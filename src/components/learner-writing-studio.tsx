'use client';
import {useState} from 'react';
import {PenLine,FileCheck2,ArrowUpRight} from 'lucide-react';
import {WritingProduct} from './writing-product';
import {LearnerWritingFeedback} from './learner-writing-feedback';
import {day} from '@/lib/learner/presentation';
type Entry={id:string;product:string;status:string;created_at:string;band:number|null};
export function LearnerWritingStudio({userId,history,initialView='write'}:{userId:string;history:Entry[];initialView?:string}){
 const [tab,setTab]=useState(initialView==='feedback'?'feedback':'write');
 return <div className="writing-studio"><div className="study-tabs" role="group" aria-label="Writing workspace"><button aria-pressed={tab==='write'} onClick={()=>setTab('write')}><PenLine size={17}/> New evaluation</button><button aria-pressed={tab==='feedback'} onClick={()=>setTab('feedback')}><FileCheck2 size={17}/> Past feedback <b>{history.length}</b></button></div>
 {tab==='write'?<><WritingProduct userId={userId}/></>:<div className="study-writing-history">{history.map(e=><article className="study-writing-feedback" key={e.id}><div className="study-feedback-band"><strong>{typeof e.band==='number'?e.band.toFixed(1):'—'}</strong><span>{typeof e.band==='number'?'Estimated band':e.status==='completed'?'Not enough evidence':e.status==='failed'?'Evaluation unavailable':'Feedback pending'}</span></div><LearnerWritingFeedback id={e.id} source={e.product==='writing_product'?'submission':'attempt'} label={(e.product==='writing_product'?'Writing evaluation':'Test Writing')+' · '+day(e.created_at)} status={e.status}/></article>)}{!history.length&&<section className="study-empty"><FileCheck2 size={30}/><h2>No Writing feedback yet</h2><p>Your bands and feedback will be saved here.</p><button className="student-button" onClick={()=>setTab('write')}>Start writing <ArrowUpRight size={14}/></button></section>}</div>}
 </div>;
}
