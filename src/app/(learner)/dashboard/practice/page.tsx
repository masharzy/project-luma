import {requireUser} from '@/lib/auth/guards';
import {learnerData} from '@/lib/learner/data';
import {learnerCatalog} from '@/lib/learner/catalog';
import {StudentHeading,AttemptsList} from '@/components/learner-panels';
import {LearnerTestLibrary} from '@/components/learner-test-library';
export const metadata={title:'My tests'};
export default async function Page(){
 const u=await requireUser();const [data,catalog]=await Promise.all([learnerData(u.id),learnerCatalog(u.id)]);
 return <><StudentHeading title="My tests"/>
 <LearnerTestLibrary {...catalog}/>
 <section className="student-panel"><div className="student-panel-title"><h2>Continue a test</h2><span>{data.attempts.filter(a=>!a.complete&&a.available).length} in progress</span></div><AttemptsList items={data.attempts.filter(a=>!a.complete&&a.available)} empty="No unfinished tests"/></section>
 <details className="student-panel student-free-tests"><summary><strong>Test history</strong><span>{data.attempts.filter(a=>a.complete).length} completed</span></summary><AttemptsList items={data.attempts.filter(a=>a.complete)} empty="No completed tests"/></details></>;
}
