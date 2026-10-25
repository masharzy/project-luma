import { requireAdmin } from '@/lib/auth/guards';
import { WorkspaceHeading } from '@/components/page-parts';
import { MembershipManager } from '@/components/membership-manager';
import '@/styles/memberships.css';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdmin();return <><WorkspaceHeading eyebrow="PLANS / SUBSCRIPTIONS" title="Access, on your terms." description="Free evaluation limits, Premium plans, account subscriptions—সব এক জায়গায়।"/><MembershipManager/></>}
