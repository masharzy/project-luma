import {requireUser} from '@/lib/auth/guards';
import {StudentHeading} from '@/components/learner-panels';
import {EvaluationAllowance} from '@/components/evaluation-allowance';
import {LearnerWritingStudio} from '@/components/learner-writing-studio';
import {evaluationHistory} from '@/lib/learner/data';
import '@/styles/memberships.css';
import '@/styles/evaluation-products.css';
import '@/styles/exam-session.css';
export const metadata={title:'Writing evaluation'};
export default async function Page({searchParams}:{searchParams:Promise<{view?:string}>}){const u=await requireUser();const [h,q]=await Promise.all([evaluationHistory(u.id),searchParams]);return <><StudentHeading title="Writing studio" description="Write, get AI feedback and review past evaluations."/><EvaluationAllowance userId={u.id} product="writing_product"/><LearnerWritingStudio userId={u.id} history={h.writing} initialView={q.view}/></>}
