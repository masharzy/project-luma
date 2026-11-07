import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ResourcesHub, type Tile } from '@/components/resources-hub';
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
export default async function ResourcesPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const cats = new Set((cue as {category:string}[]).map(c => c.category)).size;
  const chapters = [b1, b2, b3, b4, b5, b6].reduce((t, b) => t + b.chapters.length, 0);
  const qn = (grammar as {tests:{questions:unknown[]}[]}[]).reduce((t, c) => t + c.tests.reduce((u, x) => u + x.questions.length, 0), 0);
  const tiles: Tile[] = [
    { href: '/resources/cue-cards', title: 'Speaking Cue Cards', icon: 'mic', blurb: 'Pick a topic and read a step-by-step sample answer, with Part 3 model answers and useful phrases.', stats: [`${cue.length} topics`, `${cats} categories`, 'Part 3 included'], access: 'First 3 topics per category free', cta: 'Open cue cards' },
    { href: '/resources/writing', title: 'Writing Samples', icon: 'pen', blurb: 'Task 1 charts and Task 2 essays with Band 7 and Band 8-9 answers side by side, plus examiner comments.', stats: [`${t1.length} Task 1`, `${t2.length} Task 2`, 'Band 7 and 8-9'], access: 'First 4 per task free', cta: 'Read samples' },
    { href: '/vocabulary', title: 'Vocabulary', icon: 'words', blurb: 'IELTS words by topic and band, with Bangla meanings, example sentences, flashcards and a quiz.', stats: [`${(vocab as unknown[]).length.toLocaleString('en-US')} words`, 'Flashcards', 'Daily goal'], access: 'First 100 words free', cta: 'Learn words' },
    { href: '/grammar', title: 'Grammar', icon: 'check', blurb: 'Short rules, common mistakes and three levels of tests for each topic, with an explanation for every answer.', stats: [`${grammar.length} topics`, `${qn} questions`, '3 levels'], access: 'Foundation test of each topic free', cta: 'Start a test' },
    { href: '/resources/ebooks', title: 'Ebook Shelf', icon: 'book', blurb: 'Our own IELTS books, read in the browser like a real book: turn pages, highlight, add notes and bookmark.', stats: [`${6} ebooks`, `${chapters} chapters`, 'Resume anywhere'], access: 'First 2 chapters of each book free', cta: 'Browse books' },
    { href: '/blog', title: 'Study Journal', icon: 'note', blurb: 'Practical articles on study habits, strategy for each skill, and what to do in the last days before the test.', stats: [`${journal.length} articles`, '3-4 min each'], access: 'Free for everyone', cta: 'Read journal' },
  ];
  return <>
    <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(resourcesStructuredData).replace(/</g, '\\u003c') }} />
    <ResourcesHub tiles={tiles} />
  </>;
}
