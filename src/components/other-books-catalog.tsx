"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { otherBooks, filterBookTests, type BookTest } from "@/lib/other-books";
import { questionTypeLabel } from "@/lib/exam/question-types";
export function OtherBooksCatalog({tests,initialBook=""}:{tests:BookTest[];initialBook?:string}){
 const [book,setBook]=useState(initialBook),[series,setSeries]=useState(""),[module,setModule]=useState(""),[type,setType]=useState("");
 const books=otherBooks.filter(b=>(!series||b.series===series)&&(!book||b.slug===book));
 const scoped=tests.filter(t=>books.some(b=>b.slug===t.bookSlug));
 const types=[...new Set(scoped.flatMap(t=>t.modules.filter(m=>!module||m.module===module).flatMap(m=>m.types)))].sort();
 const visible=filterBookTests(scoped,book,module,type);
 return <div className="other-books-catalog">
 <div className="book-filters" aria-label="Filter Other Books">
 <label>Series<select value={series} onChange={e=>{setSeries(e.target.value);setBook("");setType("");}}><option value="">All series</option>{[...new Set(otherBooks.map(b=>b.series))].map(s=><option key={s}>{s}</option>)}</select></label>
 <label>Book<select value={book} onChange={e=>{setBook(e.target.value);setType("");}}><option value="">All books</option>{otherBooks.filter(b=>!series||b.series===series).map(b=><option key={b.slug} value={b.slug}>{b.series} · {b.volume}</option>)}</select></label>
 <label>Module<select value={module} onChange={e=>{setModule(e.target.value);setType("");}}><option value="">All modules</option>{["listening","reading","writing","speaking"].map(m=><option key={m} value={m}>{m[0].toUpperCase()+m.slice(1)}</option>)}</select></label>
 <label>Question type<select value={type} onChange={e=>setType(e.target.value)}><option value="">All question types</option>{types.map(t=><option key={t} value={t}>{questionTypeLabel(t)}</option>)}</select></label>
 <button type="button" onClick={()=>{setBook("");setSeries("");setModule("");setType("");}}>Reset filters</button></div>
 <div className="other-book-shelf">{books.map(b=><article className="other-book" key={b.slug}>
 <Link className="other-book-cover" href={"/other-books/"+b.slug}><Image src={b.cover} alt={`${b.series} ${b.title} ${b.volume} book cover`} width={240} height={320}/></Link>
 <div><span className="eyebrow">{b.series}</span><h2><Link href={"/other-books/"+b.slug}>{b.title}</Link></h2><p>{b.volume}</p><span>{tests.filter(t=>t.bookSlug===b.slug).length} available tests</span><button type="button" onClick={()=>{setBook(b.slug);setType("");}}>View tests →</button></div></article>)}</div>
 <div className="section-head"><h2>Practice from your books</h2><p role="status">{visible.length} matching {visible.length===1?"test":"tests"}</p></div>
 <div className="admin-item-grid">{visible.map(t=><article className="workspace-panel" key={t.id}><span className="eyebrow">{otherBooks.find(b=>b.slug===t.bookSlug)?.series} · {otherBooks.find(b=>b.slug===t.bookSlug)?.volume}</span><h3>{t.title}</h3><div className="test-module-grid">{t.modules.filter(m=>(!module||m.module===module)&&(!type||m.types.includes(type))).map(m=><Link className="test-module-card" key={m.module} href={`/exam/practice/${t.id}/${m.module}`}>{m.module[0].toUpperCase()+m.module.slice(1)} →</Link>)}</div></article>)}</div>
 {!visible.length&&<div className="workspace-panel book-empty"><h3>No tests available for these filters yet.</h3><p>Try another book or question type. Tests appear here after their modules are added and published.</p></div>}
 </div>;
}
