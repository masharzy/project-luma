import Link from 'next/link';
import {PageIntro,PageWrap} from '@/components/page-parts';
export const metadata={title:'Resources'};
export default function Page(){return <PageWrap><PageIntro eyebrow="RESOURCES" title="A little help for your practice." description="Speaking-এর একটি topic নিয়ে নিজের উত্তর প্রস্তুত করো।"/><article className="workspace-panel"><h2>Speaking Cue Cards</h2><p>এক মিনিট প্রস্তুতি নাও, তারপর topic ধরে দুই মিনিট বলার চেষ্টা করো।</p><Link className="button outline" href="/resources/cue-cards">Explore cue cards ↗</Link></article></PageWrap>;}
