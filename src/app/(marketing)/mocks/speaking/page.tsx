import Link from 'next/link';
import { PageIntro,PageWrap } from '@/components/page-parts';
import { speakingCatalog } from '@/lib/speaking/store';
export const dynamic='force-dynamic';
export default async function Page(){const tests=await speakingCatalog('mock');return <PageWrap><PageIntro eyebrow="LIVE SPEAKING MOCK" title="A conversation. Your next step." description="AI examiner-এর সঙ্গে সরাসরি কথা বলো। Microphone ও verified account প্রয়োজন।"/><div className="admin-item-grid">{tests.map(t=><article key={String(t.id)} className="workspace-panel"><h2>{String(t.title)}</h2><Link className="button" href={`/speaking/mock?test=${t.id}`}>Join live speaking ↗</Link></article>)}</div>{!tests.length&&<p>Live speaking mocks will appear here when published.</p>}</PageWrap>}
