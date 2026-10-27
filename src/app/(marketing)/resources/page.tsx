import Link from "next/link";
import { PageIntro, PageWrap } from "@/components/page-parts";

export const metadata = {
  title: "Resources",
  description: "Speaking cue cards, writing guides, vocabulary, grammar, ebooks and study articles for IELTS preparation.",
};

const collections = [
  {
    id: "01",
    category: "SPEAKING",
    title: "Speaking Cue Cards",
    description: "Part 2-এর topic বেছে এক মিনিট প্রস্তুতি নাও, তারপর নিজের উত্তর practice করো।",
    href: "/resources/cue-cards",
    action: "Practice cue cards",
    ready: true,
  },
  {
    id: "02",
    category: "WRITING",
    title: "Writing Samples & Guides",
    description: "Task 1 ও Task 2-এর structure, ideas এবং sample answer এক জায়গায়।",
    href: "/resources/writing",
    action: "Explore writing",
    ready: false,
  },
  {
    id: "03",
    category: "VOCABULARY",
    title: "Vocabulary",
    description: "Topic অনুযায়ী দরকারি শব্দ আর সঠিক ব্যবহার শেখার collection।",
    href: "/vocabulary",
    action: "Explore vocabulary",
    ready: false,
  },
  {
    id: "04",
    category: "GRAMMAR",
    title: "Grammar",
    description: "Grammar-এর সাধারণ ভুল আর আরও পরিষ্কার বাক্য তৈরির practice।",
    href: "/grammar",
    action: "Explore grammar",
    ready: false,
  },
  {
    id: "05",
    category: "READING",
    title: "Ebook Shelf",
    description: "IELTS প্রস্তুতির জন্য বই আর workbook রাখার আলাদা জায়গা।",
    href: "/resources/ebooks",
    action: "Browse ebooks",
    ready: false,
  },
  {
    id: "06",
    category: "ARTICLES",
    title: "Study Journal",
    description: "প্রস্তুতির কৌশল, পড়াশোনার অভ্যাস আর ছোট ছোট learning notes।",
    href: "/blog",
    action: "Read journal",
    ready: false,
  },
] as const;

export default function ResourcesPage() {
  return (
    <PageWrap tone="resources-hub-page">
      <PageIntro
        eyebrow="RESOURCES"
        title="Your learning toolkit."
        description="এক জায়গায় Speaking, Writing, Vocabulary ও Grammar-এর সহায়ক উপকরণ। যা প্রস্তুত আছে, সেখান থেকেই শুরু করো।"
      />
      <section className="resources-hub" aria-labelledby="resources-hub-heading">
        <div className="resources-hub-heading">
          <div>
            <span className="eyebrow">LEARN AT YOUR PACE</span>
            <h2 id="resources-hub-heading">Pick a resource</h2>
          </div>
          <p>ছোট একটি topic দিয়েও আজকের practice শুরু করা যায়।</p>
        </div>
        <div className="resources-hub-grid">
          {collections.map((item) => (
            <Link key={item.id} href={item.href} className={`resources-hub-card ${item.ready ? "is-ready" : ""}`}>
              <div className="resources-hub-card-top">
                <span>{item.id} / {item.category}</span>
                <span className="resources-hub-card-arrow" aria-hidden="true">↗</span>
              </div>
              <div className="resources-hub-card-body">
                <h3>{item.title}</h3>
                <p lang="bn">{item.description}</p>
              </div>
              <div className="resources-hub-card-bottom">
                <span className="resources-hub-status">{item.ready ? "Practice available" : "Collection in progress"}</span>
                <strong>{item.action} <span aria-hidden="true">→</span></strong>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageWrap>
  );
}
