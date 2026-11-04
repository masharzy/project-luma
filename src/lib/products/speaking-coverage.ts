export function speakingCoverageIssues(answers:{step:number;verbatim:string;speech_status:string}[],steps:number[]){
 const expected=new Set(steps),seen=new Set<number>(),issues:string[]=[];
 for(const answer of answers){
  if(!expected.has(answer.step))issues.push('unknown_step:'+answer.step);
  if(seen.has(answer.step))issues.push('duplicate_step:'+answer.step);
  seen.add(answer.step);
  if(['speech','partial_speech'].includes(answer.speech_status)&&!answer.verbatim.trim())issues.push('empty_speech:'+answer.step);
  if(answer.speech_status==='no_speech'&&answer.verbatim.trim())issues.push('contradictory_no_speech:'+answer.step);
 }
 for(const step of steps)if(!seen.has(step))issues.push('missing_step:'+step);
 return issues;
}

/** Structural evidence checks only. A matching quote does not prove linguistic correctness. */
type EvidenceAnswer={step:number;verbatim:string;speech_status:string;uncertain:string[];corrections:{original:string;corrected:string}[];strengths:{quote:string}[];pronunciation:{word:string;timestamp_seconds:number|null}[]};
export function speakingEvidenceIssues(model:{answers:EvidenceAnswer[];criteria:Record<string,{band:number|null;evidence:{step:number;quote:string}[]}>},clips:{step:number;seconds:number}[]){
 const issues:string[]=[],byStep=new Map<number,typeof model.answers[number]>(model.answers.map(a=>[a.step,a]));
 const disputed=(a:typeof model.answers[number],q:string)=>q.includes('[unclear]')||a.uncertain.some((u:string)=>u.trim()&&(q.toLowerCase().includes(u.trim().toLowerCase())||u.trim().toLowerCase().includes(q.toLowerCase())));
 for(const a of model.answers){
  const silent=a.speech_status==='no_speech';
  if(silent&&(a.corrections.length||a.strengths.length||a.pronunciation.length))issues.push('feedback_on_silence:'+a.step);
  for(const c of a.corrections){
   if(!c.original.trim()||!a.verbatim.includes(c.original))issues.push('correction_not_verbatim:'+a.step);
   if(!c.corrected.trim()||c.original.trim()===c.corrected.trim())issues.push('unchanged_correction:'+a.step);
   if(disputed(a,c.original))issues.push('correction_on_uncertain_speech:'+a.step);
  }
  for(const s of a.strengths)if(!s.quote.trim()||!a.verbatim.includes(s.quote))issues.push('strength_not_verbatim:'+a.step);
  for(const p of a.pronunciation){
   if(!p.word.trim()||!a.verbatim.toLowerCase().includes(p.word.toLowerCase())||disputed(a,p.word))issues.push('pronunciation_not_supported:'+a.step);
   const seconds=clips.find(c=>c.step===a.step)?.seconds??0;
   if(p.timestamp_seconds!==null&&(!Number.isFinite(p.timestamp_seconds)||p.timestamp_seconds<0||p.timestamp_seconds>seconds))issues.push('timestamp_out_of_bounds:'+a.step);
  }
 }
 for(const [key,c] of Object.entries(model.criteria)){
  if(c.band!==null&&!c.evidence.length)issues.push('criterion_without_evidence:'+key);
  for(const e of c.evidence){const a=byStep.get(e.step);if(!a||!['speech','partial_speech'].includes(a.speech_status)||!e.quote.trim()||!a.verbatim.includes(e.quote)||disputed(a,e.quote))issues.push('criterion_not_supported:'+key+':'+e.step);}
 }
 return issues;
}
