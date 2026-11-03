import type {CatalogSeries,CatalogVolume} from '@/lib/other-books-registry';
export type SpeakingLibraryTest={id:string;title:string;minutes:number;published:boolean;bookSlug?:string|null;bookNumber?:number|null;testNumber?:number|null;parts:{title:string;questions:number}[]};
const clean=(s:string)=>s.toLowerCase().replace(/\b(?:volume|book)\b/g,'').replace(/[^a-z0-9]/g,'');
export function speakingLibrarySource(test:SpeakingLibraryTest,series:CatalogSeries[],volumes:CatalogVolume[]){
 const number=test.bookNumber||Number(test.title.match(/^Cambridge\s+(\d+)\b/i)?.[1]);
 if(number>=1&&number<=21)return {collection:'cambridge',name:'Cambridge',book:'cambridge-'+number,bookName:'Cambridge '+number,number,cover:'',description:'IELTS Academic · Cambridge University Press',isbn:''};
 const prefix=test.title.replace(/\s*[·–—-]\s*(?:Test\s*-?\s*\d+|Speaking).*$/i,'').trim();
 const volume=volumes.find(v=>v.slug===test.bookSlug)||volumes.find(v=>clean(v.series+' '+v.volume)===clean(prefix));
 if(!volume)return null;
 const parent=series.find(s=>s.slug===volume.seriesSlug);
 return {collection:volume.seriesSlug,name:parent?.name||volume.series,book:volume.slug,bookName:volume.series+' · '+volume.volume,number:null,cover:volume.cover||parent?.cover||'',description:volume.title,isbn:volume.isbn};
}
export function speakingPartCounts(value:unknown){const d=value as Record<string,any>|null;if(!d)return [];
 if(Array.isArray(d.sourceParts))return d.sourceParts.map((p:any,i:number)=>({title:String(p.title||'Part '+(i+1)),questions:Array.isArray(p.questions)?p.questions.length:0}));
 return [{title:'Part 1 · Interview',questions:Array.isArray(d.part1Groups)?d.part1Groups.reduce((n:number,g:any)=>n+(g.questions?.length||0),0):d.part1?.length||0},{title:'Part 2 · Cue card',questions:d.cueCard?.topic?1:0},{title:'Part 3 · Discussion',questions:Array.isArray(d.part3Groups)?d.part3Groups.reduce((n:number,g:any)=>n+(g.questions?.length||0),0):d.part3?.length||0}];
}
