import type {SpeakingSet} from './schema';
export type SpeakingStep={p:number;t:string;say?:string;q?:string;m?:string;what?:string;long?:number};
export function speakingSteps(d:SpeakingSet):SpeakingStep[]{return [
 ...d.part1.map(q=>({p:1,t:'ask',say:q,q})),
 {p:2,t:'confirm',say:'Now I am going to give you a topic. You will have one minute to prepare and up to two minutes to speak. Do you understand?',m:'PART 2',btn:'Continue'},
 {p:2,t:'deal',what:'desk-notes',say:'Here is some paper and a pencil for making notes.'},
 {p:2,t:'deal',what:'desk-card',say:'And here is your topic.'},
 {p:2,t:'prep'},
 {p:2,t:'ask',say:'You have up to two minutes. Please begin.',q:d.cueCard.topic,long:1},
 ...d.rounding.map(q=>({p:2,t:'ask',say:q,q})),
 ...d.part3.map(q=>({p:3,t:'ask',say:q,q})),
 {p:3,t:'end',say:'Thank you. That is the end of the speaking test.'}
 ] as SpeakingStep[]}
