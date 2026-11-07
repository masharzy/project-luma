import Link from 'next/link';
import styles from '@/components/cue-cards/cue-cards.module.css';
import hs from '@/components/resources.module.css';
import {ResumeStrip} from '@/components/resume-strip';
export type HubData={
 counts:{cue:number;cats:number;t1:number;t2:number;words:number;grammarTopics:number;questions:number;books:number;chapters:number;articles:number};
 cue:{title:string;prompts:string[];steps:string[]};
 writing:{b7:string;b8:string;prompt:string};
 words:{word:string;pos:string;meaning:string;band:number}[];
 fix:{wrong:string;right:string;topic:string};
 books:{title:string;skill:string}[];
 article:{title:string;category:string;excerpt:string};
};
const COVERS=['#c60936','#2f4b7c','#2f7d6d','#7a5ea8','#b5651d','#211e25'];
function Card({href,title,blurb,chips,access,cta,span,children,wide}:{href:string;title:string;blurb:string;chips:string[];access:string;cta:string;span:string;children:React.ReactNode;wide?:boolean}){
 return <Link href={href} className={`${hs.bento} ${hs[span]} ${wide?hs.bentoWide:''}`}>
  <div className={hs.vis} aria-hidden>{children}</div>
  <div className={hs.bentoBody}><h3>{title}</h3><p>{blurb}</p><ul>{chips.map(c=><li key={c}>{c}</li>)}</ul><span className={hs.hubFoot}><small>{access}</small><b>{cta} →</b></span></div>
 </Link>;
}
export function ResourcesHub({d}:{d:HubData}){
 const c=d.counts;
 return <div className={styles.page}>
  <nav className={styles.crumbs}><Link href="/" style={{color:'#c60936',fontWeight:600}}>Home</Link><span>/</span><b>Resources</b></nav>
  <section className={`${styles.hero} ${hs.hubHero}`} style={{marginTop:0}}>
   <div>
    <span className={styles.eyebrow}>LEARNING RESOURCES</span>
    <h1>Everything you need to <em>practise between tests</em></h1>
    <p>Speaking cue card থেকে Writing sample, Vocabulary, Grammar, ebook আর study journal। সবকিছু আমাদের নিজের লেখা, আর প্রতিটার একটা অংশ সবার জন্য free।</p>
    <div className={styles.row} style={{marginTop:18}}><Link href="/resources/cue-cards" className={styles.primary}>Start with cue cards</Link><Link href="/resources/ebooks" className={styles.ghost}>Browse ebooks</Link></div>
    <ul className={styles.stats}><li><b>{c.cue}</b>cue cards</li><li><b>{c.t1+c.t2}</b>writing samples</li><li><b>{c.words.toLocaleString('en-US')}</b>words</li><li><b>{c.questions}</b>grammar questions</li><li><b>{c.books}</b>ebooks</li></ul>
   </div>
   <div className={hs.heroDeck} aria-hidden>
    <div className={`${hs.deckCard} ${hs.dc3}`}/><div className={`${hs.deckCard} ${hs.dc2}`}/>
    <div className={`${hs.deckCard} ${hs.dc1}`}><span className={styles.eyebrow}>SPEAKING CUE CARD</span><h4>{d.cue.title}</h4><ul>{d.cue.prompts.slice(0,3).map(p=><li key={p}>{p}</li>)}</ul></div>
   </div>
  </section>
  <ResumeStrip/>
  <div className={styles.sectionHead}><h2>Choose a resource</h2><p>নিজের দুর্বল জায়গা অনুযায়ী বেছে নাও।</p></div>
  <div className={hs.bentoGrid}>
   <Card href="/resources/cue-cards" span="s3" title="Speaking Cue Cards" blurb="Pick a topic and follow a step-by-step sample answer, with Part 3 model answers and useful phrases." chips={[`${c.cue} topics`,`${c.cats} categories`,'Part 3 included']} access="First 3 topics per category free" cta="Open cue cards">
    <div className={hs.miniCue}><span>Cue card</span><b>{d.cue.title}</b></div>
    <div className={hs.stepRow}>{d.cue.steps.map((s,i)=><span key={s}><i>{i+1}</i>{s}</span>)}</div>
   </Card>
   <Card href="/resources/writing" span="s3" title="Writing Samples" blurb="Task 1 charts and Task 2 essays with Band 7 and Band 8-9 answers side by side, plus examiner comments." chips={[`${c.t1} Task 1`,`${c.t2} Task 2`,'Band 7 and 8-9']} access="First 4 per task free" cta="Read samples">
    <div className={hs.bands}><div><small>Band 7</small><p>{d.writing.b7}</p></div><div className={hs.band8}><small>Band 8-9</small><p>{d.writing.b8}</p></div></div>
   </Card>
   <Card href="/vocabulary" span="s2" title="Vocabulary" blurb="IELTS words by topic and band, with Bangla meanings, flashcards and a quiz." chips={[`${c.words.toLocaleString('en-US')} words`,'Flashcards','Daily goal']} access="First 100 words free" cta="Learn words">
    <div className={hs.words}>{d.words.map((w,i)=><div key={w.word} style={{['--r' as string]:`${(i-1)*3}deg`}}><b>{w.word}</b><small>{w.pos} · Band {w.band}</small><span>{w.meaning}</span></div>)}</div>
   </Card>
   <Card href="/grammar" span="s2" title="Grammar" blurb="Short rules, common mistakes and three levels of tests with an explanation for every answer." chips={[`${c.grammarTopics} topics`,`${c.questions} questions`,'3 levels']} access="Foundation test of each topic free" cta="Start a test">
    <div className={hs.fix}><small>{d.fix.topic}</small><p className={hs.bad}>{d.fix.wrong}</p><p className={hs.good}>{d.fix.right}</p></div>
   </Card>
   <Card href="/resources/ebooks" span="s2" title="Ebook Shelf" blurb="Our own IELTS books, read like a real book: turn pages, highlight, add notes and bookmark." chips={[`${c.books} ebooks`,`${c.chapters} chapters`,'Resume anywhere']} access="First 2 chapters of each book free" cta="Browse books">
    <div className={hs.spines}>{d.books.map((b,i)=><div key={b.title} style={{background:COVERS[i%COVERS.length],height:`${112+((i*23)%38)}px`}}><span>{b.skill}</span></div>)}</div>
   </Card>
   <Card href="/blog" span="s6" wide title="Study Journal" blurb="Practical articles on study habits, strategy for each skill, and what to do in the last days before the test." chips={[`${c.articles} articles`,'3-4 min each']} access="Free for everyone" cta="Read journal">
    <div className={hs.article}><span className={styles.tag}>{d.article.category}</span><b>{d.article.title}</b><p>{d.article.excerpt}</p></div>
   </Card>
  </div>
  <section className={hs.compare}>
   <div><h3>Free for everyone</h3><ul><li>3 cue-card topics in every category</li><li>4 Writing samples per task</li><li>100 vocabulary words</li><li>1 grammar test per topic</li><li>2 chapters of every ebook</li><li>The whole study journal</li></ul></div>
   <div><h3>With a plan</h3><ul><li>All {c.cue} cue cards with Part 3 answers</li><li>All {c.t1+c.t2} Writing samples</li><li>Every vocabulary word</li><li>All {c.questions} grammar questions</li><li>Full ebooks, with notes and bookmarks</li></ul><Link href="/pricing" className={styles.primary} style={{marginTop:10}}>See plans</Link></div>
  </section>
  <section className={styles.how}>
   <div className={styles.step}><span>1</span><h3>Learn the pattern</h3><p>Cue card, Writing sample বা ebook chapter পড়ে কাঠামোটা বুঝে নাও।</p></div>
   <div className={styles.step}><span>2</span><h3>Fix the gaps</h3><p>Grammar test আর Vocabulary flashcard দিয়ে নিজের দুর্বল জায়গা ঠিক করো।</p></div>
   <div className={styles.step}><span>3</span><h3>Test yourself</h3><p>তারপর Speaking বা Writing evaluation দিয়ে আসল practice করো।</p></div>
  </section>
  <div className={styles.upsell}><div><h3>Ready to practise a full test?</h3><p>Listening, Reading, Writing আর Speaking practice এখানে।</p></div><div className={styles.row}><Link href="/recent-tests" className={styles.primary}>Recent tests</Link><Link href="/writing-evaluation" className={styles.ghost}>Writing evaluation</Link><Link href="/speaking-evaluation" className={styles.ghost}>Speaking evaluation</Link></div></div>
 </div>;
}
