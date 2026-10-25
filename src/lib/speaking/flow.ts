import type {SpeakingSet} from './schema';
export type SpeakingStep={p:number;t:string;say?:string;q?:string;m?:string;what?:string;long?:number};
function chunks(text:string){const out:string[]=[];let line='';for(const word of text.split(/\s+/)){if((line+' '+word).length>550&&line){out.push(line);line='';}for(let i=0;i<word.length;i+=550){const piece=word.slice(i,i+550);if(i+550<word.length)out.push(piece);else line+=(line?' ':'')+piece;}}if(line)out.push(line);return out;}
export function speakingSteps(d:SpeakingSet):SpeakingStep[]{
 if(d.sourceParts){const steps:SpeakingStep[]=[];d.sourceParts.forEach((part,index)=>{const p=index+1;part.questions.forEach(q=>{const speech=chunks(q.text);if(q.taskCard){steps.push({p,t:'deal',what:'desk-notes',say:'Here is some paper for your notes.'},{p,t:'deal',what:'desk-card',say:'Here is your task card.'},...speech.map(say=>({p,t:'say',say})),{p,t:'prep'},{p,t:'ask',say:'Please begin.',q:q.text,long:1,m:q.sourceNumber?'PART '+p+' · QUESTION '+q.sourceNumber:undefined});}else steps.push(...speech.slice(0,-1).map(say=>({p,t:'say',say})),{p,t:'ask',say:speech.at(-1),q:q.text,m:q.sourceNumber?'PART '+p+' · QUESTION '+q.sourceNumber:undefined});});});steps.push({p:d.sourceParts.length,t:'end',say:'Thank you. That is the end of the speaking test.'});return steps;}
 return [
 ...(d.part1Groups||[{title:'Questions',questions:d.part1}]).flatMap(g=>g.questions.map(q=>({p:1,t:'ask',say:q,q,m:'PART 1 · '+g.title}))),
 {p:2,t:'confirm',say:`Now I am going to give you a topic. You will have ${d.timing?.preparationSeconds??60} seconds to prepare and up to ${d.timing?.longTurnSeconds??120} seconds to speak. Do you understand?`,m:'PART 2',btn:'Continue'},
 {p:2,t:'deal',what:'desk-notes',say:'Here is some paper and a pencil for making notes.'},
 {p:2,t:'deal',what:'desk-card',say:'And here is your topic.'},
 {p:2,t:'prep'},
 {p:2,t:'ask',say:`You have up to ${d.timing?.longTurnSeconds??120} seconds. Please begin.`,q:d.cueCard.topic,long:1},
 ...d.rounding.map(q=>({p:2,t:'ask',say:q,q})),
 ...(d.part3Groups||[{title:'Questions',questions:d.part3}]).flatMap(g=>g.questions.map(q=>({p:3,t:'ask',say:q,q,m:'PART 3 · '+g.title}))),
 {p:3,t:'end',say:'Thank you. That is the end of the speaking test.'}
 ] as SpeakingStep[]}
