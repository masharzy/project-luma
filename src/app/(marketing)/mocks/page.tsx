import { PageIntro,PageWrap } from '@/components/page-parts';
import { MockCatalog } from '@/components/mock-catalog';
import { mockCatalog } from '@/lib/exam/mock-events';
import { readSession } from '@/lib/auth/session';
export const dynamic='force-dynamic';
export const metadata={title:'Scheduled mock tests'};
export default async function Page(){const s=await readSession();return <PageWrap><PageIntro eyebrow="THE MOCK EXPERIENCE" title="Make the real day feel familiar." description="আগে রেজিস্টার করো। নির্ধারিত সময়ে Listening → Reading → Writing দাও। অ্যাডমিন ফল প্রকাশ করলে নিজের ফল দেখো।"/><MockCatalog items={await mockCatalog(s?.user.id??null)}/></PageWrap>;}
