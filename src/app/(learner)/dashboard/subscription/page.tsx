import { requireUser } from '@/lib/auth/guards';
import { StudentHeading } from '@/components/learner-panels';
import {membership,publicPlans} from '@/lib/products/plans';
import type {MembershipData} from '@/components/membership-account';
import {LearnerSubscription} from '@/components/learner-subscription';
import '@/styles/memberships.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{plan?:string}>}){const u=await requireUser();const [{plan},account,plans]=await Promise.all([searchParams,membership(u.id),publicPlans()]);const selectedPlanId=typeof plan==='string'&&/^[a-f0-9-]{36}$/i.test(plan)?plan:undefined;return <><StudentHeading title="Subscription" description="Your plan, expiry date and remaining evaluation credits."/><LearnerSubscription selectedPlanId={selectedPlanId} initial={{...account,plans} as MembershipData}/></>}
