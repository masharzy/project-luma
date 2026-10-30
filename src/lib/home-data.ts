import 'server-only';
import { unstable_cache } from 'next/cache';
import { db } from '@/lib/auth/db';
import { freePolicy } from '@/lib/products/plans';
export type HomeShelfData = {range:string;total:number;series:{slug:string;name:string}[]};
export const getHomeShelf = unstable_cache(async ():Promise<HomeShelfData> => {
 const [books,series]=await Promise.all([
  db().query("SELECT book_number FROM public.cambridge_books WHERE status='published' ORDER BY book_number"),
  db().query("SELECT slug,name FROM public.book_series WHERE status='published' ORDER BY created_at,slug")
 ]);
 const nums=books.map(b=>Number(b.book_number));
 return {range:nums.length?(nums[0]===nums[nums.length-1]?String(nums[0]):`${nums[0]}–${nums[nums.length-1]}`):'',total:series.length+Number(nums.length>0),series:series.map(s=>({slug:String(s.slug),name:String(s.name)}))};
},['home-books-v1'],{revalidate:300});
export const getHomeAllowance=unstable_cache(async()=>{
 const p=await freePolicy();return {writing:Number(p.free_writing),speaking:Number(p.free_speaking)};
},['home-free-allowance-v1'],{revalidate:60});
export function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
const colors=['#3C5A80','#46634F','#B9770E','#5B3A78','#1F6F78','#7A8F3C','#7B1230','#8B5E3C','#C23B7A'];
const heights=[250,286,234,298,262,278,302,310,244];
export function shelfMarkup(data:HomeShelfData){
 const spines=data.series.slice(0,12).map((book,i)=>`<a role="listitem" class="jtn-bk jtn-sn jtn-book-${i}" href="/other-books/${encodeURIComponent(book.slug)}"><b>${escapeHtml(book.name)}</b></a>`).join('');
 const range=escapeHtml(data.range);
 return `<div class="jtn-shelf" id="jtn-shelf" role="list" aria-label="Book library" data-total="${data.total}">${range?`<a role="listitem" class="jtn-bk jtn-cv" aria-label="Cambridge IELTS ${range}, featured" href="/cambridge"><i>Featured</i><div><b>Cambridge</b><strong>${range}</strong></div><em>IELTS practice tests</em></a>`:''}${spines}<a role="listitem" class="jtn-bk jtn-ml" href="/other-books"><i>Library</i><strong id="jtn-mn">+</strong><em>More books</em></a></div>`;
}
export function shelfStyles(data:HomeShelfData){return data.series.slice(0,12).map((b,i)=>`.jtn-home .jtn-book-${i}{--bg:${colors[i%colors.length]};--h:${Math.min(310,Math.max(heights[i%heights.length],120+5.5*b.name.length))}px}`).join('');}
export function allowanceMarkup(count:number|null){
 if(count===null)return '<span>Temporarily unavailable</span>';
 const n=Math.max(0,Math.floor(count));
 return `<span class="jtn-dots" role="img" aria-label="${n} AI evaluations each month">${'<i></i>'.repeat(Math.min(n,8))}${n>8?`<span>+${n-8}</span>`:n===0?'<span>0</span>':''}</span>`;
}
