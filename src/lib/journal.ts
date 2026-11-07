import articles from '@/data/journal.json';
export type Article={slug:string;title:string;category:string;excerpt:string;body:string;tags:string[]};
export const journalArticles=articles as Article[];
export const journalBySlug=(s:string)=>journalArticles.find(a=>a.slug===s);
