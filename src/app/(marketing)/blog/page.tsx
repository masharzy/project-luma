import Link from "next/link";
import {journalArticles} from "@/lib/journal";
import {readMinutes} from "@/lib/mdlite";
import styles from "@/components/cue-cards/cue-cards.module.css";
import js from "@/components/resources.module.css";
export const metadata={title:"IELTS Study Journal: Strategies, Habits and Test-Day Advice",description:"Practical IELTS articles on study habits, Writing and Speaking strategy, Reading and Listening technique, and test-day preparation for learners in Bangladesh."};
export default function Page(){
 const cats=[...new Set(journalArticles.map(a=>a.category))];
 return <div className={styles.page}>
  <section className={styles.hero}>
   <span className={styles.eyebrow}>THE JUMPTONINE JOURNAL</span>
   <h1>Study Journal: <em>how to prepare better</em></h1>
   <p>IELTS প্রস্তুতির কৌশল, পড়ার অভ্যাস আর পরীক্ষার দিনের কাজের পরামর্শ। প্রতিটা লেখা ৩-৪ মিনিটে পড়া যায়।</p>
   <ul className={styles.stats}><li><b>{journalArticles.length}</b>articles</li><li><b>{cats.length}</b>topics</li></ul>
  </section>
  <div className={js.jGrid}>{journalArticles.map(a=><Link key={a.slug} href={`/blog/${a.slug}`} className={js.jCard}><span className={styles.tag}>{a.category}</span><h3>{a.title}</h3><p>{a.excerpt}</p><span className={js.jMeta}>{readMinutes(a.body)} min read</span></Link>)}</div>
 </div>;
}
