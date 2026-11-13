import {requireUser} from '@/lib/auth/guards';
import {learnerData} from '@/lib/learner/data';
import {learnerCatalog} from '@/lib/learner/catalog';
import {StudentHeading} from '@/components/learner-panels';
import {LearnerTestLibrary} from '@/components/learner-test-library';
export const metadata={title:'My tests'};
export default async function Page({searchParams}:{searchParams:Promise<{tab?:string}>}){const u=await requireUser();const[data,catalog,q]=await Promise.all([learnerData(u.id),learnerCatalog(u.id),searchParams]);return <><StudentHeading title="My tests" description="Your collections, tests in progress and scores."/><LearnerTestLibrary {...catalog} attempts={data.attempts} initialTab={q.tab}/></>}
