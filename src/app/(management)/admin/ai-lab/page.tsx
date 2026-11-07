import { requireAdmin } from '@/lib/auth/guards';
import { AiLabTabs } from '@/components/ai-lab-tabs';
export const metadata={title:'AI evaluation lab'};
export default async function Page(){await requireAdmin();return <AiLabTabs/>;}
