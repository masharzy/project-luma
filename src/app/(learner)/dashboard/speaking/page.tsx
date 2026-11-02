import {requireUser} from '@/lib/auth/guards';
import {StudentHeading} from '@/components/learner-panels';
import {EvaluationAllowance} from '@/components/evaluation-allowance';
import {SpeakingCatalog} from '@/components/speaking-catalog';
import '@/styles/memberships.css';
import '@/styles/evaluation-products.css';
import '@/styles/exam-session.css';
export const metadata={title:'Speaking evaluation'};
export default async function Page(){const u=await requireUser();return <><StudentHeading title="Speaking evaluation"/><EvaluationAllowance userId={u.id} product="speaking_product"/><SpeakingCatalog userId={u.id}/></>}
