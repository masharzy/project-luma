import type { ExamDocument } from '@/lib/exam/document';
import type { WritingInput } from './schema';
const plain=(value:unknown)=>String(value??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
export function writingInput(document:ExamDocument,answers:Record<string,string>):WritingInput {
 if(!document.parts.length||document.parts.length>2)throw Error('Writing tasks unavailable');
 return {tasks:document.parts.map((p,i)=>{
  const q=document.questions.find(q=>q.part_id===p.id);
  const answer=answers[q?.id]||answers['writing_draft_'+p.id]||'';
  const question=plain(p.passage_text||q?.question_text);
  if(!question||question.length>16000||answer.length>20000)throw Error('Invalid writing task');
  const raw=String(p.image_url||'');
  let image:string|null=null;
  if(raw){
   if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(raw)&&raw.length<1500000)image=raw;
   else {const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||raw.length>2000)throw Error('Invalid task image');image=url.href;}
  }
  return {task:i+1,question,answer,image};
 })};
}
