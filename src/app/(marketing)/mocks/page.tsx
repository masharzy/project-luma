import { PageIntro,PageWrap } from '@/components/page-parts';
import { MockCatalog } from '@/components/mock-catalog';
import { mockCatalog } from '@/lib/exam/mock-events';
import { readSession } from '@/lib/auth/session';
export const dynamic='force-dynamic';
export const metadata={title:'Scheduled mock tests'};
const steps=[['Register','Pick an exam below and register before it starts.'],['Wait','The waiting room opens 10 minutes before the start.'],['Join','Join in time. The exam opens in full screen and starts for everyone together.'],['Result','Your result appears here once it is published.']];
export default async function Page(){const s=await readSession();return <PageWrap><PageIntro eyebrow="Mock Exams" title="Mock Exams" crumbs={[{label:"Mock Exams"}]}/><ol className="mk-steps" aria-label="How a mock exam works">{steps.map(([t,d])=><li key={t}><b>{t}</b><span>{d}</span></li>)}</ol><MockCatalog items={await mockCatalog(s?.user.id??null)}/></PageWrap>;}
