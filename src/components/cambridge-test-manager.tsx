"use client";
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { WorkspaceHeading } from './page-parts';
import type { CambridgeBook, CambridgeTest } from '@/lib/cambridge';
import { moduleOrder, defaultDurations, type CambridgeSection } from '@/lib/cambridge-settings';
export function CambridgeTestManager({ initialBooks, initialTests, initialBook }: {
    initialBooks: CambridgeBook[];
    initialTests: CambridgeTest[];
    initialBook?: number;
}) {
    const [books, setBooks] = useState(initialBooks), [tests, setTests] = useState(initialTests);
    const selected = initialBook, current = books.find(b => b.bookNumber === selected);
    const [form, setForm] = useState<'book' | 'test' | null>(null), [editing, setEditing] = useState<string | null>(null);
    const [book, setBook] = useState('1'), [serial, setSerial] = useState('1'), [title, setTitle] = useState('');
    const [access, setAccess] = useState<'free' | 'premium'>('free'), [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
    const [sections, setSections] = useState<CambridgeSection[]>([...moduleOrder]), [durations, setDurations] = useState({ ...defaultDurations });
    const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    const refresh = async () => { const [b, t] = await Promise.all([fetch('/api/admin/cambridge-books'), fetch('/api/admin/cambridge-tests')]); if (!b.ok || !t.ok)
        throw Error('Refresh failed'); setBooks((await b.json()).books); setTests((await t.json()).tests); };
    const openBook = (b?: CambridgeBook) => { setForm('book'); setEditing(b ? String(b.bookNumber) : null); setBook(String(b?.bookNumber ?? Math.max(0, ...books.map(x => x.bookNumber)) + 1)); setTitle(b?.title ?? ''); setAccess(b?.access ?? 'free'); setStatus(b?.status ?? 'draft'); setMessage(''); };
    const openTest = (t?: CambridgeTest) => { setForm('test'); setEditing(t?.id ?? null); setBook(String(selected)); setSerial(String(t?.testNumber ?? Math.max(0, ...tests.filter(x => x.bookNumber === selected).map(x => x.testNumber)) + 1)); setTitle(t?.title ?? ''); setAccess(t?.access ?? current?.access ?? 'free'); setStatus(t?.status ?? 'draft'); setSections(t?.sections ?? [...moduleOrder]); setDurations(t?.durations ?? { ...defaultDurations }); setMessage(''); };
    const request = async (url: string, method: string, data?: object) => { const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined }); const d = await r.json(); if (!r.ok)
        throw Error(d.error || 'Request failed'); await refresh(); };
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        try {
            if (form === 'book')
                await request('/api/admin/cambridge-books', editing ? 'PATCH' : 'POST', { bookNumber: Number(book), title: title.trim() || 'Cambridge ' + book, access, status });
            else
                await request('/api/admin/cambridge-tests' + (editing ? '/' + editing : ''), editing ? 'PATCH' : 'POST', { bookNumber: Number(book), testNumber: Number(serial), title, access, status, sections: moduleOrder.filter(m => sections.includes(m)), durations });
            setForm(null);
            setMessage('Saved successfully.');
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : 'Save failed');
        }
        finally {
            setBusy(false);
        }
    };
    const act = async (t: CambridgeTest, action: string) => { if (action === 'delete' && !confirm('Permanently delete this test and its questions?'))
        return; setBusy(true); try {
        await request('/api/admin/cambridge-tests/' + t.id, action === 'delete' ? 'DELETE' : 'PATCH', action === 'delete' ? undefined : { status: action });
    }
    catch (e) {
        setMessage(e instanceof Error ? e.message : 'Update failed');
    }
    finally {
        setBusy(false);
    } };
    return <div className="admin-refactor"><WorkspaceHeading eyebrow="CAMBRIDGE LIBRARY" title={current?.title ?? 'Manage Cambridge'} description={selected ? 'Create tests, select their modules and set a time limit for each.' : 'Create a book first. Add its tests inside the book.'}>
 {current && <button className="button button-outline" onClick={() => openBook(current)}>Edit book</button>}<button className="button" onClick={() => selected ? openTest() : openBook()}>{selected ? 'Add Test +' : 'Add Cambridge Book +'}</button></WorkspaceHeading>
 {form && <form className="workspace-panel admin-editor" onSubmit={submit}><div className="panel-heading"><h2>{editing ? 'Edit' : 'Add'} {form === 'book' ? 'Cambridge Book' : 'Test'}</h2><button type="button" onClick={() => setForm(null)}>Close</button></div>
 {form === 'book' ? <label>Book number<input type="number" min="1" max="1000" required disabled={!!editing} value={book} onChange={e => setBook(e.target.value)}/></label> : <label>Test number<input type="number" min="1" max="1000" required value={serial} onChange={e => setSerial(e.target.value)}/></label>}
 <label>{form === 'book' ? 'Book title' : 'Test title'}<input maxLength={180} placeholder={form === 'book' ? 'Cambridge ' + book : 'Test ' + serial} value={title} onChange={e => setTitle(e.target.value)}/></label>
 <div className="form-two"><label>Access<select value={access} onChange={e => setAccess(e.target.value as typeof access)}><option value="free">Free</option><option value="premium">Premium</option></select></label><label>Status<select value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label></div>
 {form === 'test' && <fieldset><legend>Modules & time limits</legend><p>Default: Listening 30 · Reading 60 · Writing 60 minutes. Adjust as needed.</p><div className="module-settings">{moduleOrder.map(m => <div key={m}><label><input type="checkbox" checked={sections.includes(m)} onChange={() => setSections(s => s.includes(m) ? s.filter(x => x !== m) : [...s, m])}/>{m[0].toUpperCase() + m.slice(1)}</label><label>Minutes<input type="number" min="1" max="240" disabled={!sections.includes(m)} value={durations[m]} onChange={e => setDurations(d => ({ ...d, [m]: Number(e.target.value) }))}/></label></div>)}</div></fieldset>}
 <button className="button" disabled={busy || (form === 'test' && !sections.length)}>{busy ? 'Saving…' : 'Save ' + form + ' ↗'}</button></form>}
 {message && <p role="status" className="admin-feedback">{message}</p>}
 {selected ? <><Link className="admin-back" href="/admin/cambridge">← All Cambridge books</Link><div className="admin-item-grid">{tests.filter(t => t.bookNumber === selected).map(t => <article key={t.id} className="workspace-panel admin-item-card"><div className="admin-item-top"><span className="access-pill">{t.status} · {t.access}</span><details><summary aria-label={'Actions for ' + t.title}>⋯</summary><div className="admin-item-menu"><button onClick={() => openTest(t)}>Edit test</button>{['draft', 'published', 'archived', 'delete'].map(a => <button key={a} disabled={busy} onClick={() => act(t, a)}>{a === 'published' ? 'Publish' : a === 'archived' ? 'Archive' : a === 'draft' ? 'Unpublish' : 'Delete'}</button>)}</div></details></div><h3>{t.title || 'Test ' + t.testNumber}</h3><div className="admin-item-meta">{moduleOrder.filter(m => t.sections.includes(m)).map(m => <span key={m}>{m} · {t.durations[m]} min<br /></span>)}</div><Link className="button" href={'/admin/engine/cambridge/' + t.id}>Manage modules ↗</Link></article>)}</div>{!tests.some(t => t.bookNumber === selected) && <div className="workspace-panel admin-empty">This book is ready. Add its first test above.</div>}</> : <div className="book-grid admin-book-grid">{books.map(b => <article key={b.bookNumber}><Link href={'/admin/cambridge/' + b.bookNumber} className={'catalog-book ' + (b.access === 'premium' ? 'premium-book' : '')}><div className="book-cover"><span>CAMBRIDGE<br />IELTS</span><strong>{String(b.bookNumber).padStart(2, '0')}</strong><span>TEST COLLECTION</span><span className="book-spine"/></div><div className="book-caption"><div><h2>{b.title}</h2><span>{tests.filter(t => t.bookNumber === b.bookNumber).length} tests · {b.status} · {b.access}</span></div><span>↗</span></div></Link><button className="text-link" onClick={() => openBook(b)}>Edit book</button></article>)}{!books.length && <div className="workspace-panel admin-empty">No books yet. Add Cambridge Book to begin.</div>}</div>}
 </div>;
}
