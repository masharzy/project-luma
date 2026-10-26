import { requireAdmin } from '@/lib/auth/guards';
import { AiLab } from '@/components/ai-lab';
export const metadata={title:'AI evaluation lab'};
export default async function Page(){await requireAdmin();return <AiLab/>;}
