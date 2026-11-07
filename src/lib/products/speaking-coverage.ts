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
export type EvidenceAnswer={step:number;verbatim:string;speech_status:string;uncertain:string[];corrections:{original:string;corrected:string;category?:string}[];strengths:{quote:string}[];pronunciation:{word:string;timestamp_seconds:number|null}[]};
export function speakingEvidenceIssues(model:{answers:EvidenceAnswer[];criteria:Record<string,{band:number|null;evidence:{step:number;quote:string}[]}>},clips:{step:number;seconds:number}[]){
 const issues:string[]=[],byStep=new Map<number,typeof model.answers[number]>(model.answers.map(a=>[a.step,a]));
 const disputed=(a:typeof model.answers[number],q:string)=>q.includes('[unclear]')||a.uncertain.some((u:string)=>u.trim()&&(q.toLowerCase().includes(u.trim().toLowerCase())||u.trim().toLowerCase().includes(q.toLowerCase())));
 for(const a of model.answers){
  const silent=a.speech_status==='no_speech';
  if(silent&&(a.corrections.length||a.strengths.length||a.pronunciation.length))issues.push('feedback_on_silence:'+a.step);
  for(const c of a.corrections){
   if(!c.original.trim()||!a.verbatim.includes(c.original))issues.push('correction_not_verbatim:'+a.step);
   if(c.category==='redundant'?!!c.corrected.trim():(!c.corrected.trim()||c.original.trim()===c.corrected.trim()))issues.push('unchanged_correction:'+a.step);
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

/** Snap a model quote to the exact substring of the transcript when it differs only by case, spacing or punctuation. */
export function snapQuote(verbatim:string,quote:string){
 if(verbatim.includes(quote))return quote;
 const words=quote.toLowerCase().replace(/\[[^\]]*\]/g,' ').split(/[^a-z0-9']+/).filter(Boolean);
 if(!words.length)return null;
 try{const m=new RegExp(words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join("[^a-z0-9']+"),'i').exec(verbatim);return m?m[0]:null;}catch{return null;}
}

/**
 * Tolerant repair for one part: fix near-verbatim quotes, drop unverifiable corrections, strengths,
 * pronunciation notes and criterion evidence instead of failing the whole evaluation. Counts are returned for diagnostics.
 * Coverage, audio access and band presence are NOT repaired here; they stay hard validation.
 */
export function repairSpeakingPart<M extends {answers:(EvidenceAnswer&Record<string,any>)[];criteria:Record<string,{band:number|null;evidence:{step:number;quote:string;timestamp_seconds:number|null}[]}>}>(model:M,clips:{step:number;seconds:number}[]):{model:M;dropped:Record<string,number>}{
 const dropped:Record<string,number>={},bump=(k:string)=>{dropped[k]=(dropped[k]??0)+1;};
 const spoken=(s:string)=>s==='speech'||s==='partial_speech';
 const disputed=(a:EvidenceAnswer,q:string)=>q.includes('[unclear]')||a.uncertain.some(u=>u.trim()&&(q.toLowerCase().includes(u.trim().toLowerCase())||u.trim().toLowerCase().includes(q.toLowerCase())));
 const answers=model.answers.map(a=>{
  const seconds=clips.find(c=>c.step===a.step)?.seconds??0;
  const silent=a.speech_status==='no_speech';
  const corrections=silent?[]:a.corrections.flatMap(c=>{
   const original=snapQuote(a.verbatim,c.original);
   if(!original||(c.category==='redundant'?!!c.corrected.trim():(!c.corrected.trim()||original.trim().toLowerCase()===c.corrected.trim().toLowerCase()))||disputed(a,original)){bump('corrections');return [];}
   return [{...c,original}];
  });
  // Strength highlights are optional and may be shortened; they stay as returned.
  const strengths=silent?[]:a.strengths;
  const pronunciation=silent?[]:a.pronunciation.flatMap(p=>{
   if(!p.word.trim()||!a.verbatim.toLowerCase().includes(p.word.toLowerCase())||disputed(a,p.word)){bump('pronunciation');return [];}
   return [p.timestamp_seconds!==null&&(!Number.isFinite(p.timestamp_seconds)||p.timestamp_seconds<0||p.timestamp_seconds>seconds)?{...p,timestamp_seconds:null}:p];
  });
  return {...a,corrections,strengths,pronunciation};
 });
 const byStep=new Map(answers.map(a=>[a.step,a]));
 const criteria=Object.fromEntries(Object.entries(model.criteria).map(([k,c])=>[k,{...c,evidence:c.evidence.flatMap(e=>{
  const a=byStep.get(e.step);
  const quote=a&&spoken(a.speech_status)?snapQuote(a.verbatim,e.quote):null;
  if(!a||!quote||disputed(a,quote)){bump('criterion_evidence');return [];}
  return [{...e,quote}];
 })}])) as M['criteria'];
 return {model:{...model,answers,criteria} as M,dropped};
}
