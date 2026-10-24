import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/auth/db';
import { WorkspaceHeading } from '@/components/page-parts';
import { SpeakingBankManager } from '@/components/speaking-bank-manager';
export const dynamic='force-dynamic';
export default async function Page(){await requireAdmin();const rows=await db().query('SELECT id,title,minutes,published FROM public.speaking_sets ORDER BY id DESC');return <><WorkspaceHeading eyebrow="SPEAKING / QUESTION BANK" title="Speaking Evaluation tests" description="Each test contains Parts 1, 2 and 3. The animated examiner reads these exact questions."/><SpeakingBankManager/><div className="admin-item-grid">{rows.map(t=><article className="workspace-panel" key={String(t.id)}><span className="access-pill">{t.published?'Published':'Draft'}</span><h2>{String(t.title)}</h2><p>{String(t.minutes)} minutes</p><Link className="button" href={'/admin/speaking-tests/'+t.id}>Edit all three parts ↗</Link></article>)}</div></>}
