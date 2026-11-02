import Link from 'next/link';
import {Award} from 'lucide-react';
import {requireUser} from '@/lib/auth/guards';
import {mockCatalog} from '@/lib/exam/mock-events';
import type {Attempt} from '@/lib/learner/data';
import {learnerData} from '@/lib/learner/data';
import {StudentHeading} from '@/components/learner-panels';
import {LearnerScoreCard} from '@/components/learner-score-card';
export const metadata={title:'Mock results'};
export default async function Page(){const u=await requireUser();const [d,registrations]=await Promise.all([learnerData(u.id),mockCatalog(u.id,true)]);const mocks:Attempt[]=[...d.attempts.filter(a=>a.kind==='mock'),...registrations.filter(r=>!r.attempt_id).map(r=>({id:'registration-'+r.id,parentId:String(r.id),title:String(r.title),kind:'mock',created_at:String(r.starts_at),complete:false,available:false,published:false,modules:r.modules||[],results:[],notStarted:true}))];return <><StudentHeading title="Mock results" description="প্রতিটা mock, প্রতিটা skill—তোমার ফলাফল।"><Link className="student-button secondary" href="/dashboard/mocks">My mock exams ↗</Link></StudentHeading><div className="study-summary"><div><span>My mock exams</span><strong>{mocks.length}</strong></div><div><span>Published results</span><strong>{mocks.filter(a=>a.complete&&a.published).length}</strong></div><div><span>Awaiting publication</span><strong>{mocks.filter(a=>a.complete&&!a.published).length}</strong></div></div>{mocks.length?<div className="study-results-grid">{mocks.map(a=><LearnerScoreCard attempt={a} key={a.id}/>)}</div>:<section className="study-empty"><Award size={32}/><h2>Your next milestone</h2><p>Mock দিলে তোমার published scores এখানে পাওয়া যাবে।</p><Link className="student-button" href="/dashboard/mocks">Explore mock exams ↗</Link></section>}</>}
