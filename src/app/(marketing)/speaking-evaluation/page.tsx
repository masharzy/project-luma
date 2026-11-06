import { EvaluationAllowance } from '@/components/evaluation-allowance';
import '@/styles/memberships.css';
import { requireUser } from '@/lib/auth/guards';
import {evaluationHistory} from '@/lib/learner/data';
import {SpeakingHistory} from '@/components/speaking-history';
import {SpeakingCatalog} from '@/components/speaking-catalog';
import { PageIntro,PageWrap } from '@/components/page-parts';
import '@/styles/evaluation-products.css';
import '@/styles/student-redesign.css';
export default async function Page(){const u=await requireUser();return <PageWrap><PageIntro eyebrow="Speaking Evaluation" title="Speaking Evaluation" crumbs={[{label:"AI Feedback"},{label:"Speaking Evaluation"}]}/><EvaluationAllowance userId={u.id} product="speaking_product"/><SpeakingCatalog userId={u.id} dashboard/><SpeakingHistory items={(await evaluationHistory(u.id)).speaking}/></PageWrap>}