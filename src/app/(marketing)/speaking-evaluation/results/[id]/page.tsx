import Link from 'next/link';
import { requireUser } from '@/lib/auth/guards';
import { speakingAttempt } from '@/lib/products/speaking';
import { SpeakingFeedback } from '@/components/speaking-feedback';
import { PageIntro,PageWrap } from '@/components/page-parts';
import '@/styles/evaluation-products.css';
export default async function Page({params}:{params:Promise<{id:string}>}){const u=await requireUser(),{id}=await params,a=await speakingAttempt(id,u.id);return <PageWrap><PageIntro eyebrow="SPEAKING / FEEDBACK" title={String(a.title)} description="তোমার কথার ভিত্তিতে feedback, transcript ও পরের practice-এর লক্ষ্য।"/><SpeakingFeedback id={id}/><Link className="text-link" href="/speaking-evaluation">Choose another test ↗</Link></PageWrap>}
