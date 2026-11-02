import { requireUser } from '@/lib/auth/guards';
import { StudentHeading } from '@/components/learner-panels';
import { MembershipAccount } from '@/components/membership-account';
import '@/styles/memberships.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{plan?:string}>}){await requireUser();const {plan}=await searchParams;const selectedPlanId=typeof plan==='string'&&/^[a-f0-9-]{36}$/i.test(plan)?plan:undefined;return <><StudentHeading title="Subscription" description="তোমার plan, মেয়াদ ও বাকি evaluation credits।"/><MembershipAccount selectedPlanId={selectedPlanId}/></>}
