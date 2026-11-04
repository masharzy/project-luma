export type FeedbackCorrection={original:string;corrected:string;category:string;reason:string;confidence:string};
export type FeedbackAnswer={step:number;verbatim:string;uncertain:string[];corrections:FeedbackCorrection[];strengths:{quote:string;why:string}[];pronunciation:{word:string;observation:string}[]};
export type FeedbackSpan={start:number;end:number;kind:'correction'|'strength'|'uncertain';index:number};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const list=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const str=(v:unknown)=>typeof v==='string'?v:'';
export function feedbackAnswers(details:unknown,fallback:{step:number;verbatim:string;uncertain:string[]}[]):FeedbackAnswer[]{
 const d=object(details),byStep=new Map<number,Record<string,unknown>>();
 for(const value of list(d.answers??d.transcripts)){const a=object(value);if(typeof a.step==='number'&&!byStep.has(a.step))byStep.set(a.step,a);}
 return fallback.map(t=>{const a=byStep.get(t.step)||{};return {...t,
  corrections:list(a.corrections).map(value=>{const c=object(value);return {original:str(c.original),corrected:str(c.corrected),category:str(c.category),reason:str(c.reason??c.reason_bn),confidence:str(c.confidence)};}),
  strengths:list(a.strengths).map(value=>{const s=object(value);return {quote:str(s.quote),why:str(s.why)};}),
  pronunciation:list(a.pronunciation).map(value=>{const p=object(value);return {word:str(p.word),observation:str(p.observation??p.observation_bn)};})
 };});
}
/** Display annotations only: candidate words and raw model proposals stay unchanged. */
export function feedbackSpans(answer:FeedbackAnswer):FeedbackSpan[]{
 const spans:FeedbackSpan[]=[];
 const add=(quote:string,kind:FeedbackSpan['kind'],index:number)=>{if(!quote.trim())return;let start=answer.verbatim.indexOf(quote);while(start>=0){const end=start+quote.length;if(!spans.some(s=>start<s.end&&s.start<end)){spans.push({start,end,kind,index});return;}start=answer.verbatim.indexOf(quote,start+1);}};
 answer.uncertain.forEach((s,i)=>add(s,'uncertain',i));
 answer.corrections.forEach((c,i)=>{if(c.corrected.trim()&&c.original.trim()!==c.corrected.trim())add(c.original,'correction',i);});
 answer.strengths.forEach((s,i)=>add(s.quote,'strength',i));
 return spans.sort((a,b)=>a.start-b.start);
}
export function transcriptLines(text:string){const lines:{start:number;end:number}[]=[];let start=0;for(const match of text.matchAll(/\n+|(?<=[.!?])\s+(?=[A-Z“"'])/g)){const end=match.index!;if(end>start)lines.push({start,end});start=end+match[0].length;}if(start<text.length)lines.push({start,end:text.length});return lines;}
