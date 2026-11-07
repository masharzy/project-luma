/**
 * Vocabulary repetition computed in code from the transcript (no model tokens).
 * The vocabulary level itself is judged by the model per part (a single enum) because frequency lists mistake topic words for advanced vocabulary.
 */
const stop=new Set(`a an the and or but if so as of at by for from in into on onto to up with without about after before than that this these those there here it its i me my mine we us our you your he him his she her they them their what which who whom whose when where why how is am are was were be been being do does did done doing have has had having will would shall should can could may might must not no yes yeah just very really also too then some any all each every much many more most other such own same only even still like um uh er erm hmm oh ah well one two three because though although while since until whenever whatever`.split(/\s+/));
export type VocabularyLevel='A1'|'A2'|'B1'|'B2'|'C1'|'C2';
export const vocabularyLevels:VocabularyLevel[]=['A1','A2','B1','B2','C1','C2'];
export type VocabularyProfile={level:VocabularyLevel|null;words:number;uniqueWords:number;repeated:{word:string;count:number}[];parts:{part:number;level:VocabularyLevel|null;repeated:{word:string;count:number}[]}[]};

const tokens=(text:string)=>text.toLowerCase().replace(/\[[^\]]*\]/g,' ').replace(/[’]/g,"'").match(/[a-z][a-z']*/g)?.map(w=>w.replace(/^'+|'+$/g,'')).filter(w=>w.length>2)??[];
/** Fold simple inflections so family/families and use/uses/used count as one word. */
export const baseForm=(w:string)=>{
 if(w.length>4&&w.endsWith('ies'))return w.slice(0,-3)+'y';
 if(w.length>4&&/(?:ches|shes|sses|xes)$/.test(w))return w.slice(0,-2);
 if(w.length>3&&w.endsWith('s')&&!w.endsWith('ss')&&!w.endsWith('us'))return w.slice(0,-1);
 if(w.length>5&&w.endsWith('ing'))return w.slice(0,-3);
 if(w.length>4&&w.endsWith('ed'))return w.slice(0,-2);
 return w;
};
function repetition(texts:string[],minRepeat:number,top:number){
 const content=texts.flatMap(tokens).filter(w=>!stop.has(w));
 const counts=new Map<string,{count:number;forms:Map<string,number>}>();
 for(const w of content){const b=baseForm(w),e=counts.get(b)??{count:0,forms:new Map()};e.count++;e.forms.set(w,(e.forms.get(w)||0)+1);counts.set(b,e);}
 const repeated=[...counts.values()].filter(e=>e.count>=minRepeat).map(e=>({word:[...e.forms].sort((a,b)=>b[1]-a[1])[0][0],count:e.count})).sort((a,b)=>b.count-a.count||a.word.localeCompare(b.word)).slice(0,top);
 return {words:content.length,uniqueWords:counts.size,repeated};
}
/** Median of the part levels, rounded down, so one strong or weak part does not decide alone. */
export function overallVocabularyLevel(levels:(VocabularyLevel|null|undefined)[]):VocabularyLevel|null{
 const idx=levels.flatMap(l=>l?[vocabularyLevels.indexOf(l)]:[]).sort((a,b)=>a-b);
 return idx.length?vocabularyLevels[idx[Math.floor((idx.length-1)/2)]]:null;
}
export function vocabularyProfile(parts:{part:number;level:VocabularyLevel|null;texts:string[]}[],minRepeat=3,top=6):VocabularyProfile{
 const all=repetition(parts.flatMap(p=>p.texts),minRepeat,top);
 return {level:overallVocabularyLevel(parts.map(p=>p.level)),words:all.words,uniqueWords:all.uniqueWords,repeated:all.repeated,
  parts:parts.map(p=>({part:p.part,level:p.level,repeated:repetition(p.texts,minRepeat,top).repeated}))};
}
