import { headers } from 'next/headers';
import { AttemptRunner } from '@/components/exam/attempt-runner';
import '@/styles/exam-session.css';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        id: string;
    }>;
}) { return <AttemptRunner id={(await params).id} nonce={(await headers()).get('x-nonce') || undefined}/>; }
