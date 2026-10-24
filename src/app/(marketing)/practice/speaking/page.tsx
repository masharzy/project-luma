import Link from 'next/link';
import { PageIntro,PageWrap } from '@/components/page-parts';
import { speakingCatalog } from '@/lib/speaking/store';
export const dynamic='force-dynamic';
export default async function Page(){const tests=await speakingCatalog('practice');return <PageWrap><PageIntro eyebrow="SPEAKING PRACTICE" title="Find your voice." description="প্রশ্ন শোনো, নিজের উত্তর record করো। নিজের গতিতে practice করো।"/><div className="admin-item-grid">{tests.map(t=><article key={String(t.id)} className="workspace-panel"><h2>{String(t.title)}</h2><Link className="button" href={`/speaking/practice?test=${t.id}`}>Start speaking practice ↗</Link></article>)}</div>{!tests.length&&<p>Speaking tests will appear here when published.</p>}</PageWrap>}
