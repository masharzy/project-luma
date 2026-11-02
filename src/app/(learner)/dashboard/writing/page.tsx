import {requireUser} from '@/lib/auth/guards';
import {StudentHeading} from '@/components/learner-panels';
import {EvaluationAllowance} from '@/components/evaluation-allowance';
import {WritingProduct} from '@/components/writing-product';
import '@/styles/memberships.css';
import '@/styles/evaluation-products.css';
import '@/styles/exam-session.css';
export const metadata={title:'Writing evaluation'};
export default async function Page(){const u=await requireUser();return <><StudentHeading title="Writing evaluation"/><EvaluationAllowance userId={u.id} product="writing_product"/><WritingProduct userId={u.id}/></>}
