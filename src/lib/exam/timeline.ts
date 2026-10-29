import type { ExamDocument, Module } from './document';
export type AttemptSnapshot={module:Module|'speaking';document:ExamDocument & {speakingSet?:any;speakingSetId?:string}}[];
export function moduleDeadline(snapshot:AttemptSnapshot,start:number,index:number){
 return start+snapshot.slice(0,index+1).reduce((n,s)=>n+s.document.durationMinutes*60000,0);
}
export function mockPhase(start:number,end:number,now:number){return now<start?'waiting':now<end?'live':'ended';}
export function cleanAnswers(snapshot:AttemptSnapshot,index:number,input:unknown){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>450)throw Error('Invalid answers');
 const doc=snapshot[index].document,allowed=new Set(doc.questions.map((q:any)=>q.id));
 doc.parts.forEach((p:any)=>allowed.add('writing_draft_'+p.id));
 const result:Record<string,string>={};
 for(const [key,value] of Object.entries(input)){if(!allowed.has(key)||typeof value!=='string'||value.length>60000)throw Error('Invalid answer');result[key]=value;}
 return result;
}
