import 'server-only';
import {db} from '@/lib/auth/db';
import {premiumResourceLimit} from '@/lib/learner/member-access';
// The first FREE_LIMIT words (by position) are free for everyone. Later words open by plan.
export {FREE_LIMIT,TOPICS,USES} from '@/lib/vocab-constants';
import {FREE_LIMIT,TOPICS,USES} from '@/lib/vocab-constants';
export const PAGE_SIZE=40;
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
// Compact list for the learner app. Locked words carry no meaning, examples or quiz data.
export type VocabIndexItem={id:number;p:number;w:string;pos:string[];b:number;t:string[];u:string[];s:string;m?:string;n?:string};
export async function vocabularyIndex(userId:string|null){
 const open=await openLimit(userId);
 const rows=await db().query('SELECT id,position,word,pos,band,topics,use_in,tier,meaning_en,meaning_bn FROM public.vocab_words WHERE published ORDER BY position');
 const items:VocabIndexItem[]=rows.map(r=>{const unlocked=Number(r.position)<=open;return{id:Number(r.id),p:Number(r.position),w:String(r.word),pos:r.pos as string[],b:Number(r.band),t:r.topics as string[],u:r.use_in as string[],s:String(r.tier),...(unlocked?{m:String(r.meaning_en),n:String(r.meaning_bn)}:{})};});
 return{items,open:Number.isFinite(open)?open:items.length};
}
export async function vocabularyDetails(userId:string|null,ids:number[]):Promise<VocabWord[]>{
 if(!ids.length)return[];
 const open=await openLimit(userId);
 const rows=await db().query('SELECT * FROM public.vocab_words WHERE published AND id=ANY($1::int[]) AND position<=$2',[ids.slice(0,40),Number.isFinite(open)?open:1e9]);
 return rows.map(map);
}
export type QuizQuestion={id:number;word:string;meaning:string;meaningBn:string;sentence:string;answer:string;options:string[]};
// Practice questions come only from words the member can open.
export async function practiceQuestions(userId:string|null,f:VocabFilters,count=10,ids?:number[]):Promise<QuizQuestion[]>{
 const open=await openLimit(userId);
 const rows=await db().query(`SELECT id,word,meaning_en,meaning_bn,test FROM public.vocab_words WHERE published AND position<=$5 AND ($1::text IS NULL OR $1=ANY(topics)) AND ($2::int IS NULL OR band=$2) AND ($3::text IS NULL OR $3=ANY(use_in)) AND ($6::int[] IS NULL OR id=ANY($6::int[])) ORDER BY random() LIMIT $4`,[f.topic??null,f.band??null,f.use??null,count,Number.isFinite(open)?open:1e9,ids?.length?ids:null]);
 return rows.map(r=>{const t=r.test as VocabTest;const options=[t.answer,...t.distractors.slice(0,3)].sort(()=>Math.random()-0.5);return{id:Number(r.id),word:String(r.word),meaning:String(r.meaning_en),meaningBn:String(r.meaning_bn),sentence:t.sentence,answer:t.answer,options};});
}
