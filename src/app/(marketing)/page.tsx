import type { Metadata } from "next";
import Link from "next/link";
import "@/styles/homepage.css";

export const metadata: Metadata = {
  title: "IELTS Practice, Question Types & AI Feedback",
  description:
    "JumpToNine-এ IELTS Listening, Reading, Writing ও Speaking practice করো। Test, question type, বই আর AI feedback—নিজের মতো শুরু করো।",
};

export default function HomePage() {
  return (
    <div className="jt-home">
      <section className="jt-hero" aria-labelledby="jt-home-title">
        <div className="jt-shell jt-hero-inner">
          <p className="jt-eyebrow jt-hero-eyebrow"><span className="jt-eyebrow-mark" aria-hidden="true" /> JUMPTONINE / IELTS PRACTICE</p>
          <h1 id="jt-home-title" lang="bn">IELTS প্রস্তুতি,<br /><span>তোমার গতিতে।</span></h1>
          <p className="jt-hero-description" lang="bn">
            পুরো test, নির্দিষ্ট question type, অথবা Writing ও Speaking feedback—যেটা প্রয়োজন, সেখান থেকেই শুরু করো।
          </p>
          <div className="jt-hero-actions">
            <Link href="/practice" className="jt-primary-link">Practice শুরু করো <span aria-hidden="true">↗</span></Link>
            <Link href="/cambridge" className="jt-secondary-link">বই থেকে শুরু করো <span aria-hidden="true">↗</span></Link>
          </div>
          <p className="jt-hero-skills">LISTENING <span aria-hidden="true">/</span> READING <span aria-hidden="true">/</span> WRITING <span aria-hidden="true">/</span> SPEAKING</p>
        </div>
        <span className="jt-hero-dash jt-hero-dash-left" aria-hidden="true">+</span>
        <span className="jt-hero-dash jt-hero-dash-right" aria-hidden="true">✳</span>
      </section>

      <section className="jt-choices" aria-labelledby="jt-choices-title">
        <div className="jt-shell">
          <div className="jt-section-heading">
            <div>
              <p className="jt-eyebrow">CHOOSE YOUR PATH</p>
              <h2 id="jt-choices-title" lang="bn">শুরু করার তিনটি পথ।</h2>
            </div>
            <p lang="bn">একসঙ্গে সবকিছু নয়। আজ তোমার যেটা দরকার, সেটাই বেছে নাও।</p>
          </div>

          <div className="jt-choices-grid">
            <article className="jt-choice jt-choice-books">
              <p className="jt-choice-index">01 <span>/ BOOK COLLECTION</span></p>
              <div className="jt-book-scene" aria-hidden="true">
                <div className="jt-book jt-book-back"><span>IELTS LIBRARY</span><strong>01</strong><small>PRACTICE COLLECTION</small></div>
                <div className="jt-book jt-book-front"><span>IELTS</span><strong>02</strong><small>BOOK COLLECTION</small></div>
                <span className="jt-book-spark">✳</span>
              </div>
              <div className="jt-choice-body">
                <h3 lang="bn">বই ধরে অনুশীলন।</h3>
                <p lang="bn">Cambridge কিংবা অন্য IELTS বইয়ের collection থেকে বই ও test বেছে practice করো।</p>
                <div className="jt-choice-links">
                  <Link href="/cambridge">Cambridge <span aria-hidden="true">↗</span></Link>
                  <Link href="/other-books">Other Books <span aria-hidden="true">↗</span></Link>
                </div>
              </div>
            </article>

            <div className="jt-choice-stack">
              <article className="jt-choice jt-choice-practice">
                <p className="jt-choice-index">02 <span>/ PRACTICE</span></p>
                <div className="jt-choice-body">
                  <h3 lang="bn">পুরো test, অথবা শুধু একটি question type।</h3>
                  <p lang="bn">Test Practice-এ একটি test বেছে নাও। Question Practice-এ Listening বা Reading-এর নির্দিষ্ট ধরনের প্রশ্ন অনুশীলন করো।</p>
                </div>
                <div className="jt-choice-links">
                  <Link href="/practice">Test Practice <span aria-hidden="true">↗</span></Link>
                  <Link href="/practice?view=questions">Question Practice <span aria-hidden="true">↗</span></Link>
                </div>
              </article>
              <article className="jt-choice jt-choice-feedback">
                <p className="jt-choice-index">03 <span>/ AI FEEDBACK</span></p>
                <div className="jt-choice-body">
                  <h3 lang="bn">Writing ও Speaking-এর feedback।</h3>
                  <p lang="bn">লিখে বা বলে অনুশীলন করো, তারপর উন্নতির জায়গাগুলো বুঝে নাও। AI evaluation-এর জন্য verified account ও allowance প্রয়োজন।</p>
                </div>
                <div className="jt-choice-links">
                  <Link href="/writing-evaluation">Writing <span aria-hidden="true">↗</span></Link>
                  <Link href="/speaking-evaluation">Speaking <span aria-hidden="true">↗</span></Link>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="jt-starting" aria-labelledby="jt-starting-title">
        <div className="jt-shell">
          <div className="jt-starting-panel">
            <div>
              <p className="jt-eyebrow">GOOD TO KNOW</p>
              <h2 id="jt-starting-title" lang="bn">ফ্রিতে শুরু করো। নিজের মতো এগোও।</h2>
              <p lang="bn">Free Listening ও Reading practice করতে account লাগে না। Practice history সংরক্ষণ ও AI feedback-এর জন্য account প্রয়োজন। AI evaluation-এর সীমা ও Premium plan সম্পর্কে বিস্তারিত দেখো।</p>
            </div>
            <Link href="/pricing" className="jt-pricing-link">Free & Premium <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="jt-resource-line">
            <p lang="bn">Vocabulary, grammar, writing guides আর study materials খুঁজছো?</p>
            <Link href="/resources">Learning Resources <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
