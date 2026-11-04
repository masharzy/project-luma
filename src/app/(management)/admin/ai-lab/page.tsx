import { requireAdmin } from '@/lib/auth/guards';
import { AiLab } from '@/components/ai-lab';
import { SpeakingQaOneClick } from '@/components/speaking-qa-one-click';
import { SpeakingComparisonLab } from '@/components/speaking-comparison-lab';
export const metadata={title:'AI evaluation lab'};
export default async function Page(){await requireAdmin();return <><SpeakingComparisonLab/><SpeakingQaOneClick/><AiLab/></>;}
