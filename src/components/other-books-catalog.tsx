import Image from 'next/image';
import Link from 'next/link';
import {bookCoverCrops} from '@/lib/other-book-covers';
export type BookCatalogCard={key:string;title:string;cover:string;href:string};
export function OtherBooksCatalog({entries}:{entries:BookCatalogCard[]}){
 return <div className="other-book-shelf">{entries.map(item=>{
  const crop=bookCoverCrops[item.cover];
  const alt=item.title+' book cover';
  return <Link className="other-book" key={item.key} href={item.href}>
   <span className="other-book-cover">{item.cover.startsWith("https://")?<img src={item.cover} alt={alt} loading="lazy" width={240} height={320}/>:crop?<span className={"book-cover-crop "+crop.className}><Image src={item.cover} alt={alt} width={crop.sourceWidth} height={crop.sourceHeight} sizes="240px"/></span>:item.cover?<Image src={item.cover} alt={alt} width={240} height={320}/>:<span className="catalog-book-missing-cover">{item.title}</span>}</span>
   <div className="book-caption"><h2>{item.title}</h2><span aria-hidden="true">↗</span></div>
  </Link>;
 })}</div>;
}
