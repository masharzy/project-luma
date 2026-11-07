import 'server-only';
import {db} from '@/lib/auth/db';
import {premiumResourceLimit} from '@/lib/learner/member-access';
// The first FREE_LIMIT words (by position) are free for everyone. Later words open by plan.
export const FREE_LIMIT=100;
export const PAGE_SIZE=40;
export const TOPICS=['Education','Environment','Technology','Health','Work & Economy','Society & Family','Government & Law','Media & Communication','Travel & Transport','Arts & Culture','Science & Research','Crime & Safety','Behaviour & Character','General Academic'] as const;
export const USES=['Writing Task 1','Writing Task 2','Speaking','Reading'] as const;
export type VocabExample={kind:'writing'|'speaking';text:string};
export type VocabTest={sentence:string;answer:string;distractors:string[]};
export type VocabWord={id:number;position:number;word:string;pos:string[];tier:string;band:number;topics:string[];useIn:string[];meaningEn:string;meaningBn:string;examples:VocabExample[];collocations:string[];wordFamily:string[];synonyms:string[];antonyms:string[];test:VocabTest};
export type VocabFilters={topic?:string;band?:number;use?:string;q?:string;page?:number};
export type VocabCard=Pick<VocabWord,'id'|'position'|'word'|'pos'|'band'|'topics'>&{locked:boolean;detail:VocabWord|null};
const pick=<T extends string>(v:string|undefined,list:readonly T[]):T|undefined=>list.find(x=>x===v);
export function parseFilters(sp:Record<string,string|string[]|undefined>):VocabFilters{
 const one=(k:string)=>{const v=sp[k];return Array.isArray(v)?v[0]:v;};
 const band=Number(one('band'));
 return{topic:pick(one('topic'),TOPICS),use:pick(one('use'),USES),band:[6,7,8].includes(band)?band:undefined,q:(one('q')||'').trim().toLowerCase().replace(/[^a-z -]/g,'').slice(0,30)||undefined,page:Math.max(1,Math.floor(Number(one('page'))||1))};
}
const map=(r:Record<string,unknown>):VocabWord=>({id:Number(r.id),position:Number(r.position),word:String(r.word),pos:r.pos as string[],tier:String(r.tier),band:Number(r.band),topics:r.topics as string[],useIn:r.use_in as string[],meaningEn:String(r.meaning_en),meaningBn:String(r.meaning_bn),examples:r.examples as VocabExample[],collocations:r.collocations as string[],wordFamily:r.word_family as string[],synonyms:r.synonyms as string[],antonyms:r.antonyms as string[],test:r.test as VocabTest});
export async function openLimit(userId:string|null):Promise<number>{
 const extra=await premiumResourceLimit(userId,'vocabulary');
 return Number.isFinite(extra)?FREE_LIMIT+extra:Infinity;
}
export async function listVocabulary(userId:string|null,f:VocabFilters){
 const open=await openLimit(userId);
 const where=`published AND ($1::text IS NULL OR $1=ANY(topics)) AND ($2::int IS NULL OR band=$2) AND ($3::text IS NULL OR $3=ANY(use_in)) AND ($4::text IS NULL OR word LIKE $4||'%')`;
 const args=[f.topic??null,f.band??null,f.use??null,f.q??null];
 const [{n}]=await db().query(`SELECT count(*)::int AS n FROM public.vocab_words WHERE ${where}`,args);
 const rows=await db().query(`SELECT * FROM public.vocab_words WHERE ${where} ORDER BY position LIMIT ${PAGE_SIZE} OFFSET ${((f.page??1)-1)*PAGE_SIZE}`,args);
 const cards:VocabCard[]=rows.map(r=>{const w=map(r);const locked=w.position>open;return{id:w.id,position:w.position,word:w.word,pos:w.pos,band:w.band,topics:w.topics,locked,detail:locked?null:w};});
 return{cards,total:Number(n),open,pages:Math.max(1,Math.ceil(Number(n)/PAGE_SIZE))};
}
// Practice questions come only from words the member can open.
export async function practiceQuestions(userId:string|null,f:VocabFilters,count=10):Promise<{word:string;sentence:string;answer:string;options:string[]}[]>{
 const open=await openLimit(userId);
 const rows=await db().query(`SELECT word,test FROM public.vocab_words WHERE published AND position<=$5 AND ($1::text IS NULL OR $1=ANY(topics)) AND ($2::int IS NULL OR band=$2) AND ($3::text IS NULL OR $3=ANY(use_in)) ORDER BY random() LIMIT $4`,[f.topic??null,f.band??null,f.use??null,count,Number.isFinite(open)?open:1e9]);
 return rows.map(r=>{const t=r.test as VocabTest;const options=[t.answer,...t.distractors.slice(0,3)].sort(()=>Math.random()-0.5);return{word:String(r.word),sentence:t.sentence,answer:t.answer,options};});
}
