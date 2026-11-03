import { requireAdmin } from '@/lib/auth/guards';
import { AiLab } from '@/components/ai-lab';
import { SpeakingQaOneClick } from '@/components/speaking-qa-one-click';
export const metadata={title:'AI evaluation lab'};
export default async function Page(){await requireAdmin();return <><SpeakingQaOneClick/><AiLab/></>;}
