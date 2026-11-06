import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/auth/db';
import { freePolicy } from '@/lib/products/plans';
export type HomeShelfData = {range:string;total:number;series:{slug:string;name:string}[]};
export const getHomeShelf = unstable_cache(async ():Promise<HomeShelfData> => {
 const [books,series]=await Promise.all([
  db().query("SELECT book_number FROM public.cambridge_books WHERE status='published' ORDER BY book_number"),
  db().query("SELECT slug,name FROM public.book_series WHERE status='published' ORDER BY CASE slug WHEN 'official-guide' THEN 0 WHEN 'practice-tests-plus' THEN 1 ELSE 2 END,created_at,slug")
 ]);
 const nums=books.map(b=>Number(b.book_number));
 return {range:nums.length?(nums[0]===nums[nums.length-1]?String(nums[0]):`${nums[0]}–${nums[nums.length-1]}`):'',total:series.length+Number(nums.length>0),series:series.map(s=>({slug:String(s.slug),name:s.slug==='official-guide'?'Official Cambridge Guide':s.slug==='practice-tests-plus'?'Practice Tests Plus':String(s.name)}))};
},['home-books-v2'],{revalidate:300});
export const getHomeAllowance=unstable_cache(async()=>{
 const p=await freePolicy();return {writing:Number(p.free_writing),speaking:Number(p.free_speaking)};
},['home-free-allowance-v1'],{revalidate:60});
export function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function shelfMarkup(data:HomeShelfData){
 const spines=data.series.slice(0,12).map((book,i)=>`<a role="listitem" class="jtn-bk jtn-sn jtn-book-${i}" href="/other-books/${encodeURIComponent(book.slug)}"><b>${escapeHtml(book.name)}</b></a>`).join('');
 const range=escapeHtml(data.range);
 return `<div class="jtn-shelf" id="jtn-shelf" role="list" aria-label="Book library" data-total="${data.total}">${range?`<a role="listitem" class="jtn-bk jtn-cv" aria-label="Cambridge IELTS ${range}, featured" href="/cambridge"><i>Featured</i><div><b>Cambridge</b><strong>${range}</strong></div><em>Academic IELTS</em></a>`:''}${spines}<a role="listitem" class="jtn-bk jtn-ml" href="/other-books"><i>Library</i><strong id="jtn-mn">+</strong><em>More books</em></a></div>`;
}
export function allowanceMarkup(count:number|null){
 if(count===null)return '<span>Temporarily unavailable</span>';
 const n=Math.max(0,Math.floor(count));
 return `<span class="jtn-dots" role="img" aria-label="${n} AI evaluations each month">${'<i></i>'.repeat(Math.min(n,8))}${n>8?`<span>+${n-8}</span>`:n===0?'<span>0</span>':''}</span>`;
}
