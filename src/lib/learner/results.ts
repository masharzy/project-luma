import type {Attempt} from './data';
const skillName=(s:string)=>s[0].toUpperCase()+s.slice(1);
export function resultBadge(a:Attempt){
 if(a.notStarted)return {band:null,label:'Not started',reason:'You registered for this mock but have not submitted an attempt.'};
 if(!a.complete)return {band:null,label:'In progress',reason:'Finish all selected modules to receive your result.'};
 if(!a.published)return {band:null,label:'Not published',reason:'The mock result has not been published yet.'};
 const scored=a.results.filter(r=>typeof r.bandScore==='number'&&Number.isFinite(r.bandScore));
 const missing=a.modules.filter(m=>!scored.some(r=>r.module===m));
 if(scored.length){
  const complete=missing.length===0;
  const allFour=complete&&['listening','reading','writing','speaking'].every(m=>a.modules.includes(m));
  const average=scored.reduce((n,r)=>n+r.bandScore!,0)/scored.length;
  return {band:complete?Math.round(average*2)/2:scored[0].bandScore!,label:allFour?'Overall band':complete&&scored.length>1?'Module average':skillName(scored[0].module)+' band',reason:missing.length?missing.map(skillName).join(', ')+' band not available yet.':allFour?'All four skills assessed.':scored.length>1?'Average of the selected modules.':''};
 }
 const short=a.results.some(r=>typeof r.total==='number'&&r.total>0&&r.total<40);
 const failed=a.results.some(r=>r.status==='failed'||r.status==='ai_failed');
 const pending=a.results.some(r=>['pending','running','ai_running','unmarked'].includes(r.status||''));
 return {band:null,label:short?'Short practice':failed?'Evaluation unavailable':pending?'Awaiting feedback':'No band available',reason:short?'A band needs a full 40-question Listening or Reading module.':failed?'Evaluation could not be completed. Open the result for details.':pending?'Evaluation is pending or this module has not been marked.':'There is not enough scored evidence to show a band.'};
}
export function retakePath(a:Attempt){
 if(!['cambridge','practice'].includes(a.kind)||!a.parentId)return null;
 const selection=['listening','reading','writing'].every(m=>a.modules.includes(m))?'full':a.modules.length===1?a.modules[0]:null;
 return selection?`/exam/${a.kind==='practice'?'recent-tests':a.kind}/${a.parentId}/${selection}`:null;
}
export function speakingGroup(title:string){
 if(/official.*(?:cambridge|guide)|cambridge.*guide/i.test(title))return {key:'official',label:'Official Cambridge Guide',order:1};
 if(/practice tests? plus|\bplus\s*\d/i.test(title))return {key:'plus',label:'Practice Tests Plus',order:2};
 if(/^cambridge\b/i.test(title))return {key:'cambridge',label:'Cambridge',order:0};
 if(/collins/i.test(title))return {key:'collins',label:'Collins',order:3};
 return {key:'other',label:'More collections',order:4};
}
export function speakingBook(title:string){return title.replace(/\s*[·–—-]\s*Test\s*\d+.*$/i,'').replace(/\s*[·–—-]\s*Speaking.*$/i,'').trim();}
export function retakeChoices(a:Attempt){
 if(!['cambridge','practice'].includes(a.kind)||!a.parentId)return [];
 return [...new Set(a.modules)].filter(m=>['listening','reading','writing'].includes(m)).map(module=>({module,path:`/exam/${a.kind==='practice'?'recent-tests':a.kind}/${a.parentId}/${module}`}));
}
