import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/auth/db';
import { SpeakingEditor } from '@/components/speaking-editor';
import { WorkspaceHeading } from '@/components/page-parts';
import '@/styles/speaking-editor.css';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdmin();const {id}=await params;if(!/^\d{1,16}$/.test(id))notFound();const t=(await db().query('SELECT title,minutes,document,published FROM public.speaking_sets WHERE id=$1',[id]))[0];if(!t)notFound();return <><WorkspaceHeading eyebrow="SPEAKING / SOURCE PARTS" title={String(t.title)} description={t.minutes+' minutes · Edit the exact questions and source parts, then publish.'}/><SpeakingEditor kind="evaluation" id={id} initial={t.document||null} published={t.published===true}/></>}
