import { EvaluationAllowance } from '@/components/evaluation-allowance';
import '@/styles/memberships.css';
import { requireUser } from '@/lib/auth/guards';
import {SpeakingCatalog} from '@/components/speaking-catalog';
import { PageIntro,PageWrap } from '@/components/page-parts';
import '@/styles/evaluation-products.css';
export default async function Page(){const u=await requireUser();return <PageWrap><PageIntro eyebrow="SPEAKING EVALUATION" title="Take a seat. Find your voice." description="Animated examiner-এর সঙ্গে source-এর part অনুযায়ী অনুশীলন করো। প্রতিটি প্রশ্ন শুনে উত্তর record করো, শেষে feedback নাও।"/><EvaluationAllowance userId={u.id} product="speaking_product"/><SpeakingCatalog userId={u.id}/></PageWrap>}