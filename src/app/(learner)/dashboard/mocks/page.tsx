import { WorkspaceHeading } from '@/components/page-parts';
import { MockCatalog } from '@/components/mock-catalog';
import { mockCatalog } from '@/lib/exam/mock-events';
import { readSession } from '@/lib/auth/session';
export const dynamic='force-dynamic';
export default async function Page(){const s=await readSession();return <><WorkspaceHeading eyebrow="YOUR SPACE / MOCKS" title="Your registered mocks"/><MockCatalog items={s?await mockCatalog(s.user.id,true):[]}/></>;}
