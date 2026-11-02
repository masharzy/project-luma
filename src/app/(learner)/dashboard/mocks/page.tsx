import Link from 'next/link';import {StudentHeading} from '@/components/learner-panels';import {MockCatalog} from '@/components/mock-catalog';import {mockCatalog} from '@/lib/exam/mock-events';import {requireUser} from '@/lib/auth/guards';
export const metadata={title:'Mock exams'};
export default async function Page(){const u=await requireUser();return <><StudentHeading title="Mock exams" description="তোমার registrations, schedule ও published results।"><Link className="student-button" href="/mocks">Browse mocks ↗</Link></StudentHeading><MockCatalog items={await mockCatalog(u.id,true)}/></>}
