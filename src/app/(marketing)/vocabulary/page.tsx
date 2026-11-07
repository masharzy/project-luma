import Link from "next/link";
import {readSession} from "@/lib/auth/session";
import {parseFilters,vocabularyIndex} from "@/lib/vocabulary";
import {FREE_LIMIT} from "@/lib/vocab-constants";
import {VocabApp} from "@/components/vocabulary/vocab-app";
import styles from "@/components/vocabulary/vocabulary.module.css";
export const metadata={title:"IELTS Vocabulary by Topic and Band | JumpToNine",description:"1,500+ IELTS words by topic and band with Bangla meanings, Writing and Speaking examples, collocations, flashcards and quizzes. First 100 words free."};
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const sp=await searchParams;
 const f=parseFilters(sp);
 const mode=sp.mode==="cards"||sp.mode==="quiz"?sp.mode:"explore";
 const session=await readSession().catch(()=>null);
 const userId=session?.user?.id??null;
 const {items,open}=await vocabularyIndex(userId);
 const total=items.length;
 return <div className={styles.page}>
  <VocabApp items={items} open={open} authed={!!userId} initial={{topic:f.topic,band:f.band,use:f.use,q:f.q,mode}}/>
  <section className={styles.section}>
   <div className={styles.sectionHead}><h2>কীভাবে কাজ করে</h2><p>তিনটা ধাপে শব্দ মনে থাকে, শুধু পড়ে গেলে নয়।</p></div>
   <div className={styles.how}>
    <div className={styles.step}><span>1</span><h3>বেছে নাও</h3><p>তোমার target band আর যেটা দুর্বল (Writing বা Speaking), সেই অনুযায়ী topic ও band filter করো। Result সঙ্গে সঙ্গে বদলে যায়।</p></div>
    <div className={styles.step}><span>2</span><h3>Flashcard-এ শেখো</h3><p>শব্দ, উচ্চারণ, বাংলা মানে আর দুইটা example। যেটা ভুলবে সেটা তাড়াতাড়ি ফিরে আসবে, যেটা জানো সেটা পরে।</p></div>
    <div className={styles.step}><span>3</span><h3>Quiz দিয়ে যাচাই করো</h3><p>Sentence-এ ঠিক শব্দ বসাও। ভুলগুলো আলাদা করে আবার পড়া যায়।</p></div>
   </div>
  </section>
  <section className={styles.section}>
   <div className={styles.sectionHead}><h2>Band আর “Best used in” মানে কী?</h2><p>প্রতিটা word card-এ এই দুইটা লেখা থাকে।</p></div>
   <div className={styles.explainGrid}>
    <div className={styles.panel}><h3>Band 6 / 7 / 8+</h3><ul>
     <li><b>Band 6</b>: সহজ, পরিচিত শব্দ। Band 6 পেতে এগুলো ভুল ছাড়া ব্যবহার করা দরকার।</li>
     <li><b>Band 7</b>: IELTS-এ সবচেয়ে কাজের শব্দ। Essay আর Speaking-এ এগুলো ব্যবহার করলে lexical resource বাড়ে।</li>
     <li><b>Band 8+</b>: কম ব্যবহৃত, সুনির্দিষ্ট শব্দ। ঠিক জায়গায় ২-৩টা ব্যবহার করলেই যথেষ্ট।</li></ul></div>
    <div className={styles.panel}><h3>Best used in</h3><ul>
     <li><b>Writing Task 1</b>: chart বা process বর্ণনায় কাজে লাগে (যেমন increase, proportion)।</li>
     <li><b>Writing Task 2</b>: essay-র যুক্তি আর মতামতে কাজে লাগে।</li>
     <li><b>Speaking</b>: কথায় স্বাভাবিকভাবে বলা যায়।</li>
     <li><b>Reading</b>: passage-এ প্রায়ই আসে, তাই চিনে রাখা দরকার।</li></ul></div>
   </div>
  </section>
  <section className={styles.section}>
   <div className={styles.sectionHead}><h2>Free আর Premium</h2><p>প্রথম {FREE_LIMIT} টা word সবার জন্য খোলা। কোনো card লাগে না।</p></div>
   <div className={styles.compare}>
    <div className={styles.plan}><h3>Free</h3><div className="big"><span className={styles.big}>{FREE_LIMIT}</span> words</div><ul><li>বাংলা মানে ও দুইটা example</li><li>Flashcard ও quiz</li><li>Progress আর streak</li></ul><Link href="#study" className={styles.ghost}>Start free</Link></div>
    <div className={`${styles.plan} ${styles.planPro}`}><h3>Premium</h3><p>{total.toLocaleString()} words, সব topic ও band।</p><ul><li>সব word, example ও quiz</li><li>Writing ও Speaking evaluation-এর সঙ্গে একই plan</li><li>Plan অনুযায়ী পুরো library বা নির্দিষ্ট সংখ্যা</li></ul><Link href="/pricing" className={styles.primary}>See plans ↗</Link></div>
   </div>
  </section>
  <section className={styles.section}>
   <div className={styles.sectionHead}><h2>প্রশ্ন আছে?</h2></div>
   <div className={styles.faq}>
    <details><summary>Listen button-এ কীভাবে উচ্চারণ শোনায়?</summary><p>তোমার browser-এর নিজের English voice ব্যবহার হয়। আলাদা audio file ডাউনলোড হয় না, তাই data কম লাগে। Voice ফোন বা browser অনুযায়ী একটু আলাদা হতে পারে।</p></details>
    <details><summary>আমার progress কোথায় থাকে?</summary><p>Log in না করলে এই browser-এ। Log in করলে account-এ জমা হয়, তাই ফোন আর কম্পিউটারে একই progress দেখা যায়।</p></details>
    <details><summary>“Mastered” কখন হয়?</summary><p>Flashcard-এ একটা word কয়েকবার ঠিক মনে রাখলে সেটা mastered হয়। না মনে থাকলে আবার শেখার তালিকায় ফেরে। তুমি নিজেও ✓ চেপে চিহ্নিত করতে পারো।</p></details>
   </div>
  </section>
 </div>;
}
