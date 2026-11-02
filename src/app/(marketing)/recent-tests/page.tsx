import Link from 'next/link';
import {permanentRedirect} from 'next/navigation';
import {publicPageMetadata} from '@/lib/seo';
import {PageIntro,PageWrap} from '@/components/page-parts';
import {PracticeCatalog} from '@/components/practice-catalog';
import {legacyPracticeDestination} from '@/lib/practice-routes';
export const metadata=publicPageMetadata('IELTS Recent Tests','IELTS Listening, Reading ও Writing-এর Recent Tests বেছে প্রস্তুতি নাও।','/recent-tests');
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const p=await searchParams;if(p.view==='questions')permanentRedirect(legacyPracticeDestination(p));return <PageWrap><PageIntro eyebrow="RECENT TESTS" title="Recent Tests" description="Listening, Reading ও Writing—নিজের পরের test বেছে নাও।"/><nav className="practice-view-tabs" aria-label="Test and question practice"><Link href="/recent-tests" aria-current="page">Recent Tests</Link><Link href="/type-wise-question-practice">Type Wise Question Practice</Link></nav><PracticeCatalog/></PageWrap>}
