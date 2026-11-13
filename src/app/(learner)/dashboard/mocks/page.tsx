import Link from 'next/link';
import {StudentHeading} from '@/components/learner-panels';
import {LearnerMockHub,type LearnerMock} from '@/components/learner-mock-hub';
import {mockCatalog} from '@/lib/exam/mock-events';
import {requireUser} from '@/lib/auth/guards';
export const metadata={title:'Mock exams'};
export default async function Page(){const u=await requireUser();const rows=await mockCatalog(u.id);return <><StudentHeading title="Mock exams" description="Register for scheduled, timed mock exams."><Link className="student-button secondary" href="/dashboard/results">Mock results ↗</Link></StudentHeading><LearnerMockHub now={Date.now()} items={rows as LearnerMock[]}/></>}
