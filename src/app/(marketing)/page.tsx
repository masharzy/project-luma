import { headers } from "next/headers";
import { publicPageMetadata } from "@/lib/seo";
import { site } from "@/config/site";
import Link from 'next/link';
import { publicPlans, freePolicy } from '@/lib/products/plans';

const homeTitle = "JumpToNine | IELTS Practice Tests ও AI Feedback";
export const metadata = {
 ...publicPageMetadata("IELTS Practice Tests ও AI Feedback", site.description, "/"),
 title: { absolute: homeTitle },
 openGraph: { type: "website" as const, siteName: site.name, locale: "bn_BD", title: homeTitle, description: site.description, url: "https://jumptonine.com/" },
 twitter: { card: "summary" as const, title: homeTitle, description: site.description },
};
const brandData = {
 "@context": "https://schema.org",
 "@graph": [
  { "@type": "WebSite", "@id": "https://jumptonine.com/#website", name: "JumpToNine", alternateName: ["Jump To Nine", "jumptonine.com"], url: "https://jumptonine.com/", description: site.description, inLanguage: ["bn", "en"], publisher: { "@id": "https://jumptonine.com/#organization" } },
  { "@type": "Organization", "@id": "https://jumptonine.com/#organization", name: "JumpToNine", url: "https://jumptonine.com/" },
 ],
};

export const dynamic = 'force-dynamic';
const limit = (value: number | null) => value === null ? 'সীমাহীন' : String(value);

export default async function Page() {
 const nonce = (await headers()).get("x-nonce") ?? undefined;
 const [plans, free] = await Promise.all([publicPlans(), freePolicy()]);
 const premium = plans[0];
 return <>
  <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(brandData).replace(/</g, "\\u003c") }}/>
  <section className="hero home-final-hero">
   <div className="chapter-mark" aria-hidden="true">স্বপ্ন →</div><div className="hero-orbit" aria-hidden="true"/><div className="hero-cross cross-left" aria-hidden="true">+</div><div className="hero-cross cross-right" aria-hidden="true">+</div><div className="doodle lines" aria-hidden="true"/><div className="doodle star" aria-hidden="true">✳</div>
   <div className="hero-content"><div className="hero-kicker">IELTS PRACTICE, MADE SIMPLE</div><h1 lang="bn">IELTS প্রস্তুতিতে<br/><span>প্রতিদিন একটু এগিয়ে যাও।</span></h1><p className="home-hero-poem" lang="en">Every practice brings you closer.<br/>Your next chapter starts here.</p><div className="hero-ctas"><Link className="button home-primary-cta" href="/practice">Take a free test <span aria-hidden="true">↗</span></Link><a className="home-secondary-cta" href="#pricing">View plans <span aria-hidden="true">↓</span></a></div></div>
   <div className="hero-caption"><span>LISTENING / READING / WRITING / SPEAKING</span><span>Free practice tests</span></div>
  </section>
  <section className="section simple-home-features"><div className="container"><div className="section-head"><div><span className="eyebrow">GET STARTED</span><h2>How do you want to practice?</h2></div></div><div className="services">
   <article className="service cambridge"><div className="service-label"><span>BOOKS</span><span className="badge">FREE & PREMIUM</span></div><div className="books" aria-hidden="true"><div className="back-book">IELTS<br/><b>01</b></div><div className="front-book"><span>IELTS PRACTICE</span><strong>02</strong><span>BOOK COLLECTION</span></div></div><h3>Cambridge, Collins, Barron&apos;s &amp; more</h3><p>Cambridge, Collins, Barron&apos;s, Oxford-এর মতো ১০টিরও বেশি জনপ্রিয় বইয়ের টেস্ট এখানে পাবে। বই আর টেস্ট নম্বর বেছে নিলেই শুরু।</p><div className="home-book-links"><Link className="service-bottom" href="/cambridge">Cambridge <span aria-hidden="true">↗</span></Link><Link className="service-bottom" href="/other-books">More Books <span aria-hidden="true">↗</span></Link></div></article>
   <div className="service-stack"><article className="service practice-entry"><div className="service-label"><span>PRACTICE</span></div><h3>Full tests &amp; question types</h3><p>সময় ধরে পুরো টেস্ট দাও, অথবা যে ধরনের প্রশ্নে আটকে যাও সেটাই বারবার অনুশীলন করো।</p><div className="home-book-links"><Link className="service-bottom" href="/practice">Test Practice <span aria-hidden="true">↗</span></Link><Link className="service-bottom" href="/practice?view=questions">Question Practice <span aria-hidden="true">↗</span></Link></div></article>
   <article className="service writing"><div className="service-label"><span>AI FEEDBACK</span></div><h3>Writing &amp; Speaking feedback</h3><p>লিখে বা বলে জমা দাও। আনুমানিক ব্যান্ড আর কোথায় শুধরাতে হবে, দুটোই জানতে পারবে। ভেরিফাইড অ্যাকাউন্ট লাগবে।</p><div className="home-book-links"><Link className="service-bottom" href="/writing-evaluation">Writing <span aria-hidden="true">↗</span></Link><Link className="service-bottom" href="/speaking-evaluation">Speaking <span aria-hidden="true">↗</span></Link></div></article>
  </div></div></div></section>
  <section className="home-final-cta home-mock-entry"><div className="container"><div><span className="eyebrow">SCHEDULED MOCK EXAMS</span><h2>Make your next test feel familiar.</h2><p>নির্ধারিত সময়ে Listening, Reading ও Writing দাও। তারপর নিজের গতিতে Speaking শেষ করো।</p></div><Link className="button" href="/mocks">Explore mock exams <span aria-hidden="true">↗</span></Link></div></section>
  <section className="section home-final-pricing" id="pricing" aria-labelledby="home-pricing-title"><div className="container"><div className="section-head"><div><span className="eyebrow">PRICING</span><h2 id="home-pricing-title">Start free, upgrade when you need more</h2></div></div><div className="home-plan-grid">
   <article className="home-plan"><h3>Free</h3><p>অ্যাকাউন্ট ছাড়াই প্র্যাকটিস শুরু করো।</p><div className="home-plan-price">Free</div><ul><li>Listening আর Reading টেস্ট, অ্যাকাউন্ট ছাড়াই</li><li>ভেরিফাইড অ্যাকাউন্টে প্রতি মাসে Writing-এর {free.free_writing}টি আর Speaking-এর {free.free_speaking}টি AI মূল্যায়ন</li><li>ফ্রি বইয়ের টেস্ট</li></ul><Link className="button outline" href="/practice">Start free <span aria-hidden="true">↗</span></Link></article>
   <article className="home-plan home-plan-premium"><span className="home-plan-label">PREMIUM</span><h3>Premium</h3><p>বেশি টেস্ট আর বেশি ফিডব্যাক দরকার হলে।</p>{premium ? <><div className="home-plan-price">৳{Number(premium.price_bdt).toLocaleString('en-BD')}<small> / 30 days{plans.length > 1 ? ' · From' : ''}</small></div><ul><li>প্রতি মাসে Writing-এর {limit(premium.writing_limit)}টি AI মূল্যায়ন</li><li>প্রতি মাসে Speaking-এর {limit(premium.speaking_limit)}টি AI মূল্যায়ন</li><li>প্ল্যান: {String(premium.name)}</li></ul><Link className="button" href="/dashboard/subscription">Get Premium <span aria-hidden="true">↗</span></Link></> : <><div className="home-plan-price home-plan-unavailable">Not available yet</div><p>প্রিমিয়াম প্ল্যান প্রকাশিত হলে দাম ও বাড়তি মূল্যায়নের সীমা এখানে দেখতে পাবে।</p><Link className="button outline" href="/pricing">View plans <span aria-hidden="true">↗</span></Link></>}</article>
  </div><div className="home-pricing-note"><p>AI মূল্যায়ন একটা আনুমানিক ব্যান্ড দেয়, এটা অফিশিয়াল IELTS স্কোর নয়।</p><Link href="/pricing">Compare all limits →</Link></div></div></section>
  <section className="section answers-section"><div className="container"><div className="answers-head"><div><span className="eyebrow">FAQ</span><h2>Before you begin</h2></div></div><div className="answer-list">
   <details><summary><span className="question-number">01</span><span>Do I need an account?</span><span className="question-toggle" aria-hidden="true"/></summary><p>ফ্রি Listening ও Reading টেস্ট দিতে অ্যাকাউন্ট লাগে না। ফলাফলের ইতিহাস সংরক্ষণ ও AI ফিডব্যাকের জন্য অ্যাকাউন্ট লাগবে। AI মূল্যায়নের জন্য অ্যাকাউন্ট ভেরিফাই করতে হবে।</p></details>
   <details><summary><span className="question-number">02</span><span>Test Practice vs Question Practice?</span><span className="question-toggle" aria-hidden="true"/></summary><p>Test Practice-এ একটি টেস্টের মডিউল বেছে সময় ধরে অনুশীলন করো। Question Practice-এ Listening বা Reading-এর নির্দিষ্ট প্রশ্নের ধরন বেছে ছোট অনুশীলন করো।</p></details>
   <details><summary><span className="question-number">03</span><span>Is AI feedback an official IELTS score?</span><span className="question-toggle" aria-hidden="true"/></summary><p>না। AI ফিডব্যাক তোমার উত্তরের ওপর ভিত্তি করে আনুমানিক ব্যান্ড ও উন্নতির পরামর্শ দেয়। এটা অফিশিয়াল IELTS স্কোর নয়।</p></details>
  </div></div></section>
  <section className="home-final-cta"><div className="container"><div><h2>Ready for your first test?</h2><p>অ্যাকাউন্ট ছাড়াই Listening বা Reading টেস্ট দিয়ে শুরু করো।</p></div><Link className="button" href="/practice">Take a free test <span aria-hidden="true">↗</span></Link></div></section>
 </>;
}
