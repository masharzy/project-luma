export type FeedbackCorrection={original:string;corrected:string;category:string;reason:string;confidence:string};
export type LineMark='g'|'y'|'r';
export type FeedbackLine={text:string;mark:LineMark};
export type FeedbackVocabulary={level:string|null;words:number;uniqueWords:number;repeated:{word:string;count:number}[];parts:{part:number;level:string|null;repeated:{word:string;count:number}[]}[]};
export type FeedbackAnswer={step:number;verbatim:string;lines?:FeedbackLine[];uncertain:string[];corrections:FeedbackCorrection[];strengths:{quote:string;why:string}[];pronunciation:{word:string;observation:string}[]; notes?:{label:string;text:string}[]};
export type FeedbackSpan={start:number;end:number;kind:'correction'|'strength'|'uncertain';index:number};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const list=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const str=(v:unknown)=>typeof v==='string'?v:'';
export function feedbackAnswers(details:unknown,fallback:{step:number;verbatim:string;uncertain:string[]}[]):FeedbackAnswer[]{
 const d=object(details),byStep=new Map<number,Record<string,unknown>>();
 for(const value of list(d.answers??d.transcripts)){const a=object(value);if(typeof a.step==='number'&&!byStep.has(a.step))byStep.set(a.step,a);}
 return fallback.map(t=>{const a=byStep.get(t.step)||{};return {...t,
  notes:[['Answer development',a.development],['Vocabulary',a.vocabulary_feedback],['Grammar',a.grammar_feedback],['Fluency',a.fluency_feedback],['Pronunciation',a.pronunciation_feedback]].flatMap(([label,text])=>typeof label==='string'&&typeof text==='string'&&text.trim()?[{label,text}]:[]),
  lines:(()=>{const l=list(a.lines).flatMap(value=>{const x=object(value),mark=x.mark;return typeof x.text==='string'&&x.text.trim()&&(mark==='g'||mark==='y'||mark==='r')?[{text:x.text.trim(),mark}]:[];});return l.length?l as FeedbackLine[]:undefined;})(),
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
 answer.corrections.forEach((c,i)=>{if((!c.corrected.trim()&&c.category==='redundant')||(c.corrected.trim()&&c.original.trim()!==c.corrected.trim()))add(c.original,'correction',i);});
 answer.strengths.forEach((s,i)=>add(s.quote,'strength',i));
 return spans.sort((a,b)=>a.start-b.start);
}
export function transcriptLines(text:string){const lines:{start:number;end:number}[]=[];let start=0;for(const match of text.matchAll(/\n+|(?<=[.!?])\s+(?=[A-Z“"'])/g)){const end=match.index!;if(end>start)lines.push({start,end});start=end+match[0].length;}if(start<text.length)lines.push({start,end:text.length});return lines;}

export function feedbackVocabulary(details:unknown):FeedbackVocabulary|null{
 const v=object(object(details).vocabulary);if(!Object.keys(v).length)return null;
 const rep=(x:unknown)=>list(x).flatMap(r=>{const o=object(r);return typeof o.word==='string'&&typeof o.count==='number'?[{word:o.word,count:o.count}]:[];});
 return {level:typeof v.level==='string'?v.level:null,words:typeof v.words==='number'?v.words:0,uniqueWords:typeof v.uniqueWords==='number'?v.uniqueWords:0,repeated:rep(v.repeated),
  parts:list(v.parts).flatMap(x=>{const o=object(x);return typeof o.part==='number'?[{part:o.part,level:typeof o.level==='string'?o.level:null,repeated:rep(o.repeated)}]:[];})};
}
/** Split one marked line into plain text and exact-word corrections (first non-overlapping occurrence each). */
export function lineSegments(text:string,corrections:FeedbackCorrection[]):({text:string}|{text:string;correction:FeedbackCorrection;index:number})[]{
 const hits:{start:number;end:number;index:number}[]=[];
 corrections.forEach((c,index)=>{
  const ok=c.category==='redundant'?!c.corrected.trim():c.corrected.trim()&&c.corrected.trim()!==c.original.trim();
  if(!ok||!c.original.trim())return;
  let at=text.indexOf(c.original);
  while(at>=0&&hits.some(h=>at<h.end&&h.start<at+c.original.length))at=text.indexOf(c.original,at+1);
  if(at>=0)hits.push({start:at,end:at+c.original.length,index});
 });
 hits.sort((a,b)=>a.start-b.start);
 const out:({text:string}|{text:string;correction:FeedbackCorrection;index:number})[]=[];let pos=0;
 for(const h of hits){if(h.start>pos)out.push({text:text.slice(pos,h.start)});out.push({text:text.slice(h.start,h.end),correction:corrections[h.index],index:h.index});pos=h.end;}
 if(pos<text.length)out.push({text:text.slice(pos)});
 return out;
}
