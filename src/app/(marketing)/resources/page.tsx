import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ResourcesHub, type HubData } from '@/components/resources-hub';
import { resourcesStructuredData } from '@/lib/resources-reference';
import cue from '@/data/cue-cards.json';
import t1 from '@/data/writing-task1.json';
import t2 from '@/data/writing-task2.json';
import grammar from '@/data/grammar.json';
import journal from '@/data/journal.json';
import vocab from '@/data/vocabulary.json';
import b1 from '@/data/ebooks/task-2-essay-playbook.json';
import b2 from '@/data/ebooks/task-1-data-description.json';
import b3 from '@/data/ebooks/speaking-fluency-framework.json';
import b4 from '@/data/ebooks/reading-question-types.json';
import b5 from '@/data/ebooks/listening-accuracy.json';
import b6 from '@/data/ebooks/thirty-day-study-plan.json';

const title = 'IELTS Learning Resources: Speaking Cue Cards, Vocabulary, Grammar and Ebooks | JumpToNine';
const description = 'Free IELTS learning resources: Speaking cue cards with sample answers, Writing samples, 1,550 vocabulary words, grammar tests, ebooks and a study journal.';
export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: 'https://jumptonine.com/resources' },
  openGraph: { type: 'website', siteName: 'JumpToNine', title: 'IELTS learning resources | JumpToNine', description, url: 'https://jumptonine.com/resources', images: [{url:'/images/og-jumptonine.png',width:1200,height:630,alt:'JumpToNine — IELTS practice'}] },
  twitter: { card: 'summary', title, description },
};
const first = (t: string) => (t.split(/(?<=[.!?])\s/)[0] || t).trim();
export default async function ResourcesPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const cats = new Set((cue as {category:string}[]).map(c => c.category)).size;
  const books = [b1, b2, b3, b4, b5, b6] as {title:string;skill:string;chapters:unknown[]}[];
  const qn = (grammar as {tests:{questions:unknown[]}[]}[]).reduce((t, c) => t + c.tests.reduce((u, x) => u + x.questions.length, 0), 0);
  const c0 = (cue as {title:string;prompts:string[];steps:{label:string}[]}[])[0];
  const w0 = (t2 as {band7:{essay:string};band8:{essay:string}}[])[0];
  const g0 = (grammar as {title:string;mistakes:{wrong:string;right:string}[]}[])[0];
  const j0 = (journal as {title:string;category:string;excerpt:string}[])[0];
  const d: HubData = {
    counts: { cue: cue.length, cats, t1: t1.length, t2: t2.length, words: (vocab as unknown[]).length, grammarTopics: grammar.length, questions: qn, books: books.length, chapters: books.reduce((t, b) => t + b.chapters.length, 0), articles: journal.length },
    cue: { title: c0.title, prompts: c0.prompts, steps: c0.steps.map(s => s.label) },
    writing: { b7: first(w0.band7.essay), b8: first(w0.band8.essay), prompt: '' },
    words: (vocab as {word:string;pos:string[];meaning_en:string;band:number}[]).slice(0, 3).map(w => ({ word: w.word, pos: w.pos[0] || '', meaning: w.meaning_en, band: w.band })),
    fix: { wrong: g0.mistakes[0].wrong, right: g0.mistakes[0].right, topic: g0.title },
    books: books.map(b => ({ title: b.title, skill: b.skill })),
    article: { title: j0.title, category: j0.category, excerpt: j0.excerpt },
  };
  return <>
    <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(resourcesStructuredData).replace(/</g, '\\u003c') }} />
    <ResourcesHub d={d} />
  </>;
}
