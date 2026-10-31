import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { PlansPage } from '@/components/plans-page';
import { getPlansPageData } from '@/lib/plans-page-data';
const title = 'IELTS Practice Plans and Pricing | JumpToNine';
const description = 'Choose a JumpToNine plan for AI Writing and Speaking evaluation, or continue with Free. Monthly credits reset on the first day of each month (UTC).';
export const metadata: Metadata = {
  title: { absolute: title }, description,
  alternates: { canonical: 'https://jumptonine.com/pricing' },
  openGraph: { type: 'website', siteName: 'JumpToNine', title, description, url: 'https://jumptonine.com/pricing', images: [{url:'/images/og-jumptonine.png',width:1200,height:630,alt:'JumpToNine — IELTS practice'}] },
  twitter: { card: 'summary', title, description },
};
export default async function Page() {
  const requestHeaders = await headers();
  const data = await getPlansPageData();
  const nonce = requestHeaders.get('x-nonce') ?? undefined;
  const structured = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://jumptonine.com/' },
    { '@type': 'ListItem', position: 2, name: 'Plans', item: 'https://jumptonine.com/pricing' },
  ] };
  return <><script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, '\\u003c') }} /><PlansPage plans={data.paid} free={data.free} /></>;
}
