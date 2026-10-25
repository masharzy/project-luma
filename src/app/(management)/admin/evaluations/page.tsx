import { requireAdmin } from '@/lib/auth/guards';
import { WorkspaceHeading } from '@/components/page-parts';
import { EvaluationAccessManager } from '@/components/evaluation-access-manager';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdmin();return <><WorkspaceHeading eyebrow="AI / ACCESS" title="Evaluation access" description="Per-account overrides. Set default free limits and Premium plans in Plans & subscriptions."/><EvaluationAccessManager/></>}
