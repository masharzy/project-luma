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
