import { requireUser } from '@/lib/auth/guards';
import { PageIntro,PageWrap } from '@/components/page-parts';
import { WritingProduct } from '@/components/writing-product';
import '@/styles/evaluation-products.css';
import '@/styles/exam-session.css';
export const metadata={title:'Writing Evaluation'};
export default async function Page(){const u=await requireUser();return <PageWrap><PageIntro eyebrow="WRITING EVALUATION" title="Your ideas. A clearer next draft." description="নিজের প্রশ্ন যোগ করো, AI দিয়ে task তৈরি করো, অথবা Cambridge থেকে বেছে নাও। তারপর নিজের উত্তর লিখে feedback নাও।"/><WritingProduct userId={u.id}/></PageWrap>}
