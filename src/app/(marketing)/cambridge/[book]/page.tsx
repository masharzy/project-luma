import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageIntro, PageWrap } from '@/components/page-parts';
import { db } from '@/lib/auth/db';
import { listCambridgeBooks, listCambridgeTests } from '@/lib/cambridge';
import { moduleOrder } from '@/lib/cambridge-settings';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        book: string;
    }>;
}) {
    const { book } = await params;
    if (!/^\d{1,4}$/.test(book))
        notFound();
    const current = (await listCambridgeBooks()).find(b => b.bookNumber === Number(book));
    if (!current)
        notFound();
    const tests = (await listCambridgeTests()).filter(t => t.bookNumber === current.bookNumber);
    const saved = tests.length ? await db().query("SELECT parent_id,module FROM public.exam_modules WHERE kind='cambridge' AND parent_id=ANY($1::bigint[]) AND jsonb_array_length(document->'parts')>0 AND (module='writing' OR jsonb_array_length(document->'questions')>0)", [tests.map(t => t.id)]) : [];
    const available = new Set(saved.map(r => String(r.parent_id) + ':' + r.module));
    return <PageWrap tone="library-page"><PageIntro eyebrow="CAMBRIDGE LIBRARY" title={current.title} description="একটি module অনুশীলন করো, অথবা একসঙ্গে পুরো test দাও।"><Link className="text-link" href="/cambridge">← All books</Link></PageIntro>
 <div className="cambridge-tests">{tests.map(t => { const locked = current.access === 'premium' || t.access === 'premium'; const ready = t.sections.every(m => available.has(t.id + ':' + m)); return <article className="cambridge-test-row" key={t.id}><div className="test-row-heading"><div><span className="eyebrow">TEST {String(t.testNumber).padStart(2, '0')}</span><h2>{t.title || 'Test ' + t.testNumber}</h2></div><span className="access-pill">{locked ? 'Premium' : 'Free access'}</span></div><div className="test-row-body"><div className="test-module-area"><p className="module-caption">Take the test by module</p><div className="test-module-grid">{moduleOrder.filter(m => t.sections.includes(m)).map(m => { const enabled = !locked && available.has(t.id + ':' + m); const contents = <><span className="module-letter">{m[0].toUpperCase()}</span><span><strong>{m[0].toUpperCase() + m.slice(1)}</strong><small>{t.durations[m]} minutes{!available.has(t.id + ':' + m) ? ' · Coming soon' : ''}</small></span><span aria-hidden>↗</span></>; return enabled ? <Link className="test-module-card" key={m} href={'/exam/cambridge/' + t.id + '/' + m}>{contents}</Link> : <div className="test-module-card unavailable" aria-disabled key={m}>{contents}</div>; })}</div></div><div className="full-test-action"><span>{t.sections.reduce((n, m) => n + t.durations[m], 0)} min · {t.sections.length} modules</span>{!locked && ready ? <Link className="button" href={'/exam/cambridge/' + t.id + '/full'}>Start Full Test ↗</Link> : <button className="button" disabled>{locked ? 'Premium access' : 'Full test coming soon'}</button>}</div></div></article>; })}</div>{!tests.length && <div className="workspace-panel admin-empty">Tests are being prepared for this book.</div>}
 </PageWrap>;
}
