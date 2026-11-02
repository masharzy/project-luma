export const resourceCollections=[{path:'/resources/cue-cards',title:'Speaking cue cards'},{path:'/resources/writing',title:'Writing samples'},{path:'/vocabulary',title:'Vocabulary'},{path:'/resources/ebooks',title:'Ebook shelf'},{path:'/resources',title:'Learning resources'}];
export function parseGoals(d:Record<string,unknown>){
 const targetBand=d.targetBand,weeklyTarget=d.weeklyTarget,examDate=d.examDate;
 if(typeof targetBand!=='number'||!Number.isFinite(targetBand)||targetBand<1||targetBand>9||targetBand*2%1!==0)throw Error('Choose a target band from 1 to 9.');
 if(typeof weeklyTarget!=='number'||!Number.isInteger(weeklyTarget)||weeklyTarget<1||weeklyTarget>30)throw Error('Choose 1–30 tests per week.');
 if(typeof examDate!=='string'||(examDate!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(examDate)||Number.isNaN(Date.parse(examDate))||new Date(examDate).toISOString().slice(0,10)!==examDate)))throw Error('Choose a valid exam date.');
 return {targetBand,weeklyTarget,examDate:examDate||null};
}
export function resourcePath(v:unknown){if(typeof v!=='string'||(!resourceCollections.some(r=>r.path===v)&&!/^\/resources\/library\/[1-9]\d{0,15}$/.test(v)))throw Error('Choose a JumpToNine resource.');return v;}
