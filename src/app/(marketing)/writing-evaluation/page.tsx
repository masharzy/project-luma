import { EvaluationAllowance } from '@/components/evaluation-allowance';
import '@/styles/memberships.css';
import { requireUser } from '@/lib/auth/guards';
import { PageIntro,PageWrap } from '@/components/page-parts';
import { WritingProduct } from '@/components/writing-product';
import '@/styles/evaluation-products.css';
import '@/styles/exam-session.css';
export const metadata={title:'Writing Evaluation'};
export default async function Page(){const u=await requireUser();return <PageWrap><PageIntro eyebrow="Writing Evaluation" title="Writing Evaluation" crumbs={[{label:"AI Feedback"},{label:"Writing Evaluation"}]}/><EvaluationAllowance userId={u.id} product="writing_product"/><WritingProduct userId={u.id}/></PageWrap>}
