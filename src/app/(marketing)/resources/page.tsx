import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ResourceDeck } from '@/components/resource-deck';
import { resourcesMarkup, resourcesStructuredData, resourceAvailability } from '@/lib/resources-reference';

const title = 'IELTS Learning Resources: Speaking Cue Cards, Vocabulary, Grammar and Ebooks | JumpToNine';
const description = 'Free IELTS learning resources in one place: Speaking cue cards, Writing samples, Vocabulary, Grammar, an ebook shelf and a study journal. Start with what is ready.';
export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: 'https://jumptonine.com/resources' },
  openGraph: { type: 'website', siteName: 'JumpToNine', title: 'IELTS learning resources | JumpToNine', description, url: 'https://jumptonine.com/resources', images: [{url:'/images/og-jumptonine.png',width:1200,height:630,alt:'JumpToNine — IELTS practice'}] },
  twitter: { card: 'summary', title, description },
};
export default async function ResourcesPage() {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  let markup = resourcesMarkup;
  for (const [key, ready] of Object.entries(resourceAvailability)) {
    markup = markup.replace('__STATUS_' + key.toUpperCase() + '__', `<span class="r-st" data-ready="${ready}"><i aria-hidden="true"></i>${ready ? 'Available now' : 'Collection in progress'}</span>`);
  }
  return <div className="jtn-design jtn-resources" lang="en">
    <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(resourcesStructuredData).replace(/</g, '\\u003c') }} />
    <div dangerouslySetInnerHTML={{ __html: markup }} />
    <ResourceDeck />
  </div>;
}
