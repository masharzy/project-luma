import Link from "next/link";
export default function Page() {
  return (
    <>
      <section className="hero">
        <div className="chapter-mark" aria-hidden="true">
          স্বপ্ন →
        </div>
        <div className="hero-orbit" aria-hidden="true"></div>
        <div className="hero-cross cross-left" aria-hidden="true">
          +
        </div>
        <div className="hero-cross cross-right" aria-hidden="true">
          +
        </div>
        <div className="doodle lines" aria-hidden="true"></div>
        <div className="doodle star" aria-hidden="true">
          ✳
        </div>
        <div className="hero-content">
          <div className="hero-kicker">IELTS PRACTICE, MADE FOR YOU</div>
          <h1 lang="bn">
            স্কোরের ওপারে
            <br />
            <span>অপেক্ষায় তোমার পৃথিবী।</span>
          </h1>
          <p className="hero-description">
            সেই পথে এগোতে, প্রতিদিন একটু প্রস্তুতি।
          </p>
          <div className="hero-ctas">
            <Link className="button" href="/auth/sign-up">
              ফ্রিতে শুরু করো <span>↗</span>
            </Link>
          </div>
        </div>
        <div className="hero-caption">
          <span>LISTENING / READING / WRITING</span>
          <Link href="/cambridge">Explore the library ↓</Link>
        </div>
      </section>
      <section className="section" id="practice">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">YOUR PRACTICE SPACE</span>
              <h2 lang="en">Here for every step.</h2>
              <p className="section-explainer" lang="bn">
                Cambridge practice, নিজের সময়ে test আর Writing
                resources—প্রস্তুতির সবটা এক জায়গায়।
              </p>
            </div>
            <Link className="text-link" href="/practice">
              Find your practice ↗
            </Link>
          </div>
          <div className="services">
            <article className="service cambridge">
              <div className="service-label">
                <span>CAMBRIDGE LIBRARY</span>
                <span className="badge">01–10 FREE</span>
              </div>
              <div className="books" aria-hidden="true">
                <div className="back-book">
                  IELTS
                  <br />
                  <b>09</b>
                </div>
                <div className="front-book">
                  <span>CAMBRIDGE</span>
                  <strong>10</strong>
                  <span>ACADEMIC · PRACTICE</span>
                </div>
              </div>
              <h3>
                চেনা বই।
                <br />
                নতুন করে প্রস্তুতি।
              </h3>
              <p>
                Cambridge-এর Listening ও Reading, প্রশ্নের ধরন অনুযায়ী
                প্র্যাকটিস করো। বই ১–১০ ফ্রি।
              </p>
              <Link className="service-bottom" href="/cambridge">
                Explore Cambridge <span>↗</span>
              </Link>
            </article>
            <div className="service-stack">
              <article className="service practice-entry">
                <div className="service-label">
                  <span>ON YOUR SCHEDULE</span>
                  <span className="service-symbol" aria-hidden="true">
                    ◉
                  </span>
                </div>
                <h3>
                  সময় যখন তোমার,
                  <br />
                  প্র্যাকটিসও তোমার মতো।
                </h3>
                <p>
                  Listening, Reading বা Writing—যখন সময় পাবে, পছন্দের test দিয়ে
                  প্রস্তুতি যাচাই করো।
                </p>
                <Link href="/practice" className="service-bottom">
                  Browse practice tests <span>↗</span>
                </Link>
              </article>
              <article className="service writing">
                <div className="service-label">
                  <span>WRITING & RESOURCES</span>
                  <span className="service-symbol" aria-hidden="true">
                    ✎
                  </span>
                </div>
                <h3>
                  ভাবনাগুলো হোক
                  <br />
                  আরও গোছানো।
                </h3>
                <p>
                  Sample answer দেখে শেখো। Writing guide আর ebook দিয়ে নিজের
                  উত্তর আরও গোছাও।
                </p>
                <Link href="/resources" className="service-bottom">
                  Explore the shelf <span>↗</span>
                </Link>
              </article>
            </div>
          </div>
        </div>
      </section>
      <section className="mock-feature" id="mocks">
        <div className="container">
          <div className="mock-ticket">
            <div className="ticket-copy">
              <span className="eyebrow">THE FULL MOCK EXPERIENCE</span>
              <h2 lang="bn">
                পরীক্ষার দিনের আগে,
                <br />
                একবার নিজেকে যাচাই করো।
              </h2>
              <p>তিনটি module। নির্দিষ্ট সময়। একসঙ্গে শুরু।</p>
              <Link href="/mocks" className="button outline">
                মক টেস্ট দেখো <span>↗</span>
              </Link>
            </div>
            <div className="ticket-stub">
              <span className="eyebrow">YOUR EXAM ROUTE</span>
              <ol>
                <li>
                  <span>01</span>
                  <b>Listening</b>
                  <span>→</span>
                </li>
                <li>
                  <span>02</span>
                  <b>Reading</b>
                  <span>→</span>
                </li>
                <li>
                  <span>03</span>
                  <b>Writing</b>
                  <span>✓</span>
                </li>
              </ol>
              <div className="stub-foot">REGISTER / JOIN / BEGIN</div>
            </div>
          </div>
        </div>
      </section>
      <section className="section featured-section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">FIND YOUR FOCUS</span>
              <h2 lang="en">What will you practice today?</h2>
            </div>
            <Link href="/practice" className="text-link">
              View all practice ↗
            </Link>
          </div>
          <div className="module-rows">
            <Link className="module-row" href="/practice">
              <span className="module-number">01</span>
              <div>
                <span className="eyebrow">Reading</span>
                <h3>Read, understand, answer.</h3>
              </div>
              <span className="module-meta">Reading practice</span>
              <span className="row-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
            <Link className="module-row" href="/practice">
              <span className="module-number">02</span>
              <div>
                <span className="eyebrow">Writing</span>
                <h3>Find the words for your ideas.</h3>
              </div>
              <span className="module-meta">Writing practice</span>
              <span className="row-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
            <Link className="module-row" href="/practice">
              <span className="module-number">03</span>
              <div>
                <span className="eyebrow">Listening</span>
                <h3>Listen for the little details.</h3>
              </div>
              <span className="module-meta">Listening practice</span>
              <span className="row-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          </div>
          <div className="quiet-note">
            Practice modules are coming soon. You can create your account today.
          </div>
        </div>
      </section>
      <section className="section learning-section" id="resources">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">OFF THE CLOCK</span>
              <h2 lang="en">More ways to learn.</h2>
            </div>
            <Link className="text-link" href="/resources">
              All resources ↗
            </Link>
          </div>
          <div className="learning-grid">
            <Link
              href="/resources/writing"
              className="learning-card sample-card"
            >
              <span className="eyebrow">WRITING SAMPLES</span>
              <div className="sample-art" aria-hidden="true">
                <span>AN IDEA,</span>
                <em>well written.</em>
                <div className="sample-rule"></div>
                <div className="sample-rule short"></div>
              </div>
              <div className="learning-bottom">
                <h3>ভালো উত্তর কেমন হয়, দেখে নাও।</h3>
                <span>↗</span>
              </div>
            </Link>
            <Link href="/vocabulary" className="learning-card vocab-card">
              <span className="eyebrow">VOCABULARY & GRAMMAR</span>
              <div className="word-art" aria-hidden="true">
                <span>good</span>
                <b>precise.</b>
              </div>
              <div className="learning-bottom">
                <h3>সঠিক শব্দ, সঠিক জায়গায়।</h3>
                <span>↗</span>
              </div>
            </Link>
            <Link href="/resources/ebooks" className="learning-card ebook-card">
              <span className="eyebrow">THE EBOOK SHELF</span>
              <div className="mini-books" aria-hidden="true">
                <span>
                  THE
                  <br />
                  WRITING
                  <br />
                  WORKBOOK
                  <br />
                  <b>01</b>
                </span>
                <span>
                  NOTES
                  <br />
                  FOR YOUR
                  <br />
                  NEXT STEP
                  <br />
                  <b>02</b>
                </span>
              </div>
              <div className="learning-bottom">
                <h3>প্রয়োজনের বই, হাতের কাছেই।</h3>
                <span>↗</span>
              </div>
            </Link>
          </div>
        </div>
      </section>
      <section className="section access-redesign" id="access">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">ROOM TO GROW</span>
              <h2>Start where you are.</h2>
              <p className="section-explainer" lang="bn">
                প্রস্তুতি শুরু হবে ফ্রিতে। আরও প্র্যাকটিসের জন্য থাকবে Premium।
              </p>
            </div>
            <Link href="/pricing" className="text-link">
              Compare access ↗
            </Link>
          </div>
          <div className="plan-pair">
            <article className="plan-sheet free-sheet">
              <div className="plan-top">
                <span className="eyebrow">THE EVERYDAY START</span>
                <span className="plan-icon" aria-hidden="true">
                  01 /
                </span>
              </div>
              <h3>Free to begin.</h3>
              <p lang="bn">শুরু করার জন্য যা প্রয়োজন।</p>
              <ul>
                <li>
                  <b>Cambridge 1–10</b>
                  <span lang="bn">Listening ও Reading practice</span>
                </li>
                <li>
                  <b>Practice & resources</b>
                  <span lang="bn">নির্বাচিত test, sample answer ও ebook</span>
                </li>
                <li>
                  <b>No account needed</b>
                  <span lang="bn">Guest হিসেবেও free practice</span>
                </li>
              </ul>
              <Link className="button outline" href="/practice">
                Start free <span>↗</span>
              </Link>
            </article>
            <article className="plan-sheet paid-sheet">
              <div className="plan-top">
                <span className="eyebrow">THE NEXT STEP</span>
                <span className="plan-icon" aria-hidden="true">
                  02 /
                </span>
              </div>
              <h3>More with Premium.</h3>
              <p lang="bn">আরও প্রশ্ন, আরও শেখার সুযোগ।</p>
              <ul>
                <li>
                  <b>Cambridge 11–21</b>
                  <span lang="bn">পরের বইগুলোর practice access</span>
                </li>
                <li>
                  <b>A bigger practice library</b>
                  <span lang="bn">অতিরিক্ত test ও Writing resources</span>
                </li>
                <li>
                  <b>Keep building your skills</b>
                  <span lang="bn">Vocabulary ও Grammar-এ পূর্ণ access</span>
                </li>
              </ul>
              <Link className="button" href="/pricing">
                Explore Premium <span>↗</span>
              </Link>
            </article>
          </div>
        </div>
      </section>
      <section className="section answers-section">
        <div className="container">
          <div className="answers-head">
            <div>
              <span className="eyebrow">BEFORE YOU BEGIN</span>
              <h2>A few quick answers.</h2>
            </div>
            <span className="answer-sketch" aria-hidden="true">
              ?
            </span>
          </div>
          <div className="answer-list">
            <details open>
              <summary>
                <span className="question-number">01</span>
                <span>Do I need an account?</span>
                <span className="question-toggle" aria-hidden="true"></span>
              </summary>
              <p lang="bn">
                Practice চালু হলে free test অ্যাকাউন্ট ছাড়াই করতে পারবে। তবে
                guest হিসেবে দেওয়া test-এর result তোমার account history-তে save
                হবে না।
              </p>
            </details>
            <details>
              <summary>
                <span className="question-number">02</span>
                <span>Practice test or scheduled mock?</span>
                <span className="question-toggle" aria-hidden="true"></span>
              </summary>
              <p lang="bn">
                এই সুবিধাগুলো চালু হলে practice test যখন ইচ্ছা শুরু করতে পারবে।
                Mock-এর জন্য আগে register করতে হবে—নির্ধারিত সময়ে সবাই একসঙ্গে
                Listening, Reading ও Writing দেবে।
              </p>
            </details>
            <details>
              <summary>
                <span className="question-number">03</span>
                <span>When will I get my mock results?</span>
                <span className="question-toggle" aria-hidden="true"></span>
              </summary>
              <p lang="bn">
                পরীক্ষা শেষ হলেই result প্রকাশ হবে না। Admin ওই mock-এর result
                publish করলে তোমার dashboard-এ দেখতে পাবে।
              </p>
            </details>
          </div>
        </div>
      </section>
      <section className="closing">
        <div className="container">
          <span className="eyebrow">YOUR NEXT STEP IS HERE</span>
          <h2 lang="bn">
            পরের গল্পটা তোমার।
            <br />
            <em>প্রথম পাতাটা আজই লিখো।</em>
          </h2>
          <Link className="button" href="/auth/sign-up">
            প্রস্তুতি শুরু করো <span>↗</span>
          </Link>
        </div>
        <span className="closing-star" aria-hidden="true">
          ✳
        </span>
      </section>
    </>
  );
}
