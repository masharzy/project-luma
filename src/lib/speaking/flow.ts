import type {SpeakingSet} from './schema';
export type SpeakingStep={p:number;t:string;say?:string;q?:string;m?:string;what?:string;long?:number};
export function speakingSteps(d:SpeakingSet):SpeakingStep[]{return [
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
