export type SelectedPracticeGroup={key:string;module:'listening'|'reading';questionCount:number;sourceLabel:string;number:string;type:string};
export const selectionStorageKey='luma.practice-selection.v1';
export function restorePracticeSelection(value:unknown):SelectedPracticeGroup[]{
 if(!Array.isArray(value)||value.length>10)return [];
 const result:SelectedPracticeGroup[]=[],keys=new Set<string>();
 for(const item of value){
  if(!item||typeof item!=='object'||typeof item.key!=='string'||item.key.length>180||!['listening','reading'].includes(item.module)||!new RegExp('^(?:practice:)?'+item.module+':\\d{1,16}:[a-zA-Z0-9_.:-]{1,150}$').test(item.key)||!Number.isInteger(item.questionCount)||item.questionCount<1||item.questionCount>40||keys.has(item.key)||typeof item.sourceLabel!=='string'||item.sourceLabel.length>220||typeof item.number!=='string'||item.number.length>100||typeof item.type!=='string'||!/^[a-z][a-z0-9_]{0,59}$/.test(item.type))return [];
  result.push({key:item.key,module:item.module,questionCount:item.questionCount,sourceLabel:item.sourceLabel,number:item.number,type:item.type});keys.add(item.key);
 }
 return result.reduce((n,g)=>n+g.questionCount,0)<=40?result:[];
}
export function togglePracticeGroup(items:SelectedPracticeGroup[],item:SelectedPracticeGroup){
 if(items.some(g=>g.key===item.key))return items.filter(g=>g.key!==item.key);
 const next=[...items,item];return restorePracticeSelection(next).length===next.length?next:items;
}
