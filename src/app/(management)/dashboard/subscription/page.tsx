import { requireUser } from '@/lib/auth/guards';
import { WorkspaceHeading } from '@/components/page-parts';
import { MembershipAccount } from '@/components/membership-account';
import '@/styles/memberships.css';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{plan?:string}>}){await requireUser();const {plan}=await searchParams;const selectedPlanId=typeof plan==='string'&&/^[a-f0-9-]{36}$/i.test(plan)?plan:undefined;return <><WorkspaceHeading eyebrow="YOUR MEMBERSHIP" title="Room for your next step." description="Writing ও Speaking-এর আলাদা allowance, subscription ও মেয়াদ দেখো।"/><MembershipAccount selectedPlanId={selectedPlanId}/></>}
