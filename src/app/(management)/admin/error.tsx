'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { reset: () => void }) {
 return <section className="workspace-panel" role="alert"><h1>Unable to load this page</h1><p>Retry to load the latest saved data.</p><div className="adm-quick-actions"><button type="button" className="button" onClick={reset}>Try again</button><Link href="/admin" className="button outline">Admin overview</Link></div></section>;
}
