import Link from "next/link";
import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {journalArticles,journalBySlug} from "@/lib/journal";
import {readMinutes} from "@/lib/mdlite";
import {Prose} from "@/components/journal-prose";
import styles from "@/components/cue-cards/cue-cards.module.css";
import js from "@/components/resources.module.css";
export function generateStaticParams(){return journalArticles.map(a=>({slug:a.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const a=journalBySlug((await params).slug);return a?{title:a.title,description:a.excerpt}:{};}
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const a=journalBySlug((await params).slug);if(!a)notFound();
 const more=journalArticles.filter(x=>x.slug!==a.slug&&x.category===a.category).slice(0,2).concat(journalArticles.filter(x=>x.slug!==a.slug&&x.category!==a.category)).slice(0,3);
 return <div className={styles.page}>
  <nav className={styles.crumbs}><Link href="/blog" style={{color:'#c60936',fontWeight:600}}>Study Journal</Link><span>/</span><b>{a.category}</b></nav>
  <article className={js.prose}>
   <span className={styles.tag}>{a.category}</span><h1>{a.title}</h1><p style={{color:'#4a4249',fontSize:15}}>{readMinutes(a.body)} min read</p>
   <Prose body={a.body}/>
  </article>
  <div className={styles.upsell}><div><h3>Practice what you just read</h3><p>Cue card, Writing sample বা Grammar test দিয়ে আজই প্রয়োগ করো।</p></div><Link href="/resources" className={styles.primary}>Open resources</Link></div>
  <div className={styles.sectionHead} style={{marginTop:30}}><h2>More from the journal</h2></div>
  <div className={js.jGrid}>{more.map(x=><Link key={x.slug} href={`/blog/${x.slug}`} className={js.jCard}><span className={styles.tag}>{x.category}</span><h3>{x.title}</h3><p>{x.excerpt}</p></Link>)}</div>
 </div>;
}
