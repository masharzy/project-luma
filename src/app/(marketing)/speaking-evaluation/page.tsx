import { requireUser } from '@/lib/auth/guards';
import { db } from '@/lib/auth/db';
import { PageIntro,PageWrap } from '@/components/page-parts';
import { SpeakingStart } from '@/components/speaking-start';
import '@/styles/evaluation-products.css';
export default async function Page(){await requireUser();const tests=await db().query('SELECT id,title,minutes FROM public.speaking_sets WHERE published=true AND document IS NOT NULL ORDER BY id DESC LIMIT 100');return <PageWrap><PageIntro eyebrow="SPEAKING EVALUATION" title="Take a seat. Find your voice." description="Animated examiner-এর সঙ্গে তিনটি part অনুশীলন করো। প্রতিটি প্রশ্ন শুনে উত্তর record করো, শেষে feedback নাও।"/><div className="speaking-set-grid">{tests.map(t=><article className="workspace-panel" key={String(t.id)}><span className="eyebrow">PARTS 1 / 2 / 3</span><h2>{String(t.title)}</h2><p>{String(t.minutes)} minutes · Cue card, preparation and discussion</p><SpeakingStart testId={String(t.id)}/></article>)}{!tests.length&&<p className="workspace-panel">Speaking tests are being prepared. Published tests will appear here.</p>}</div></PageWrap>}
