import { PageIntro,PageWrap } from '@/components/page-parts';
import { MockCatalog } from '@/components/mock-catalog';
import { mockCatalog } from '@/lib/exam/mock-events';
import { readSession } from '@/lib/auth/session';
export const dynamic='force-dynamic';
export const metadata={title:'Scheduled mock tests'};
export default async function Page(){const s=await readSession();return <PageWrap><PageIntro eyebrow="THE MOCK EXPERIENCE" title="Your next IELTS mock." description="আগে রেজিস্টার করো। সবাই একই সময়ে Listening, Reading ও Writing দেবে। Speaking নিজের গতিতে শেষ করবে। ফল প্রকাশিত হলে এখানেই দেখবে।"/><MockCatalog items={await mockCatalog(s?.user.id??null)}/></PageWrap>;}
