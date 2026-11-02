import {requireUser} from '@/lib/auth/guards';
import {learnerData,evaluationHistory} from '@/lib/learner/data';
import {LearnerOverview} from '@/components/learner-overview';
export const metadata={title:'Your dashboard'};
export default async function Page(){const user=await requireUser();const[data,history]=await Promise.all([learnerData(user.id),evaluationHistory(user.id)]);return <LearnerOverview firstName={user.name.split(' ')[0]||'learner'} data={data} history={history}/>;}
