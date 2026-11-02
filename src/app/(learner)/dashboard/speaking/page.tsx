import Link from 'next/link';
import {evaluationHistory} from '@/lib/learner/data';
import {day} from '@/lib/learner/presentation';
import {requireUser} from '@/lib/auth/guards';
import {StudentHeading} from '@/components/learner-panels';
import {EvaluationAllowance} from '@/components/evaluation-allowance';
import {SpeakingCatalog} from '@/components/speaking-catalog';
import '@/styles/memberships.css';
import '@/styles/evaluation-products.css';
import '@/styles/exam-session.css';
export const metadata={title:'Speaking evaluation'};
export default async function Page(){const u=await requireUser();const h=await evaluationHistory(u.id);return <><StudentHeading title="Speaking studio" description="একটা collection বেছে নাও। নিজের কণ্ঠে শুরু করো।"/><EvaluationAllowance userId={u.id} product="speaking_product"/><SpeakingCatalog userId={u.id} dashboard/>{h.speaking.length>0&&<section><div className="study-section-title"><h2>Your recent feedback</h2><span>{h.speaking.length} sessions</span></div><div className="study-feedback-grid">{h.speaking.map(e=><Link className="study-feedback-card" href={'/speaking-evaluation/results/'+e.id} key={e.id}><span className="study-kicker">SPEAKING · {day(e.created_at)}</span><strong>{typeof e.band==='number'?e.band.toFixed(1):'—'}</strong><span>{typeof e.band==='number'?'Estimated band':e.status==='completed'?'Not enough scorable evidence':e.status==='failed'?'Evaluation unavailable':'Feedback in progress'}</span><footer>Open feedback <span>↗</span></footer></Link>)}</div></section>}</>}
