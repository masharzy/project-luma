import '@/styles/speaking-editor.css';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/auth/db';
import { examParent } from '@/lib/exam/store';
import { SpeakingEditor } from '@/components/speaking-editor';
import { normalizeSpeakingSet } from '@/lib/speaking/schema';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{kind:string;id:string}>}){await requireAdmin();const {kind,id}=await params;if(!['practice','cambridge','mock'].includes(kind)||!/^\d{1,16}$/.test(id))notFound();const p=await examParent(kind as 'practice',id);if(!p)notFound();const rows=await db().query('SELECT document,published FROM public.speaking_tests WHERE kind=$1 AND parent_id=$2',[kind,id]);return <section><h1>Speaking · {p.title}</h1><p>Practice and Cambridge start with questions. Mock tests use a live examiner and introductory identification.</p><SpeakingEditor kind={kind} id={id} initial={rows[0]?normalizeSpeakingSet(rows[0].document):null} published={rows[0]?.published===true}/><a href={`/speaking/${kind}?test=${id}`} target="_blank" rel="noreferrer">Open speaking room</a></section>}
