import 'server-only';
import {z} from 'zod';
import {TOPICS,USES} from '@/lib/vocabulary';
const list=(max:number,min=0)=>z.array(z.string().trim().min(1).max(80)).min(min).max(max);
export const wordSchema=z.object({
 word:z.string().trim().toLowerCase().regex(/^[a-z][a-z -]{0,39}$/,'Word: lowercase English letters only'),
 pos:z.array(z.enum(['noun','verb','adjective','adverb','preposition'])).min(1).max(3),
 tier:z.enum(['core','advanced','niche']),
 band:z.union([z.literal(6),z.literal(7),z.literal(8)]),
 topics:z.array(z.enum(TOPICS)).min(1).max(3),
 use:z.array(z.enum(USES)).min(1).max(4),
 meaningEn:z.string().trim().min(2).max(240),
 meaningBn:z.string().trim().min(1).max(240).regex(/[ঀ-৿]/,'Bangla meaning must be in Bangla script'),
 examples:z.object({writing:z.string().trim().min(8).max(400),speaking:z.string().trim().min(8).max(400)}),
 collocations:list(8),wordFamily:list(8),synonyms:list(8),antonyms:list(8),
 test:z.object({sentence:z.string().trim().max(400).refine(s=>s.split('_____').length===2,'Test sentence needs exactly one _____'),answer:z.string().trim().min(1).max(60),distractors:z.array(z.string().trim().min(1).max(60)).length(3)}).refine(t=>!t.distractors.some(d=>d.toLowerCase()===t.answer.toLowerCase()),'A wrong option equals the answer'),
 published:z.boolean(),
 position:z.number().int().min(1).optional(),
});
export type WordInput=z.infer<typeof wordSchema>;
export const columns=`id,position,word,pos,tier,band,topics,use_in,meaning_en,meaning_bn,examples,collocations,word_family,synonyms,antonyms,test,published`;
export function toRow(r:Record<string,unknown>){
 const ex=(r.examples as {kind:string;text:string}[])||[];
 return{id:Number(r.id),position:Number(r.position),word:String(r.word),pos:r.pos as string[],tier:String(r.tier),band:Number(r.band),topics:r.topics as string[],use:r.use_in as string[],meaningEn:String(r.meaning_en),meaningBn:String(r.meaning_bn),examples:{writing:ex.find(e=>e.kind==='writing')?.text??'',speaking:ex.find(e=>e.kind==='speaking')?.text??''},collocations:r.collocations as string[],wordFamily:r.word_family as string[],synonyms:r.synonyms as string[],antonyms:r.antonyms as string[],test:r.test as {sentence:string;answer:string;distractors:string[]},published:r.published===true};
}
export type AdminWord=ReturnType<typeof toRow>;
export const exampleJson=(e:WordInput['examples'])=>JSON.stringify([{kind:'writing',text:e.writing},{kind:'speaking',text:e.speaking}]);
