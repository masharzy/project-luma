import { PageIntro,PageWrap } from '@/components/page-parts';
import { MockCatalog } from '@/components/mock-catalog';
import { mockCatalog } from '@/lib/exam/mock-events';
import { readSession } from '@/lib/auth/session';
export const dynamic='force-dynamic';
export const metadata={title:'Scheduled mock tests'};
export default async function Page(){const s=await readSession();return <PageWrap><PageIntro eyebrow="Mock Exams" title="Mock Exams" crumbs={[{label:"Mock Exams"}]}/><MockCatalog items={await mockCatalog(s?.user.id??null)}/></PageWrap>;}
