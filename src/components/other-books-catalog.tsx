import Image from 'next/image';
import Link from 'next/link';
import { otherBooks,otherBookSeries,bookHref } from '@/lib/other-books';
export function OtherBooksCatalog({series}:{series?:string}){
 const entries=series?otherBooks.filter(b=>otherBookSeries.find(s=>s.slug===series)?.name===b.series).map(b=>({key:b.slug,title:`${b.series} · ${b.volume}`,cover:b.cover,href:bookHref(b.slug)})):otherBookSeries.map(s=>({key:s.slug,title:s.name,cover:s.cover,href:'/other-books/'+s.slug}));
 return <div className="other-book-shelf">{entries.map(item=><Link className="other-book" key={item.key} href={item.href}><span className="other-book-cover"><Image src={item.cover} alt={item.title+' book cover'} width={240} height={320}/></span><div className="book-caption"><h2>{item.title}</h2><span aria-hidden="true">↗</span></div></Link>)}</div>;
}
