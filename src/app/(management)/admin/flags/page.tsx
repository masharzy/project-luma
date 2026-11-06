import { requireAdmin } from '@/lib/auth/guards';
import { WorkspaceHeading } from '@/components/page-parts';
import { db } from '@/lib/auth/db';
import { saveFlag } from '@/lib/admin/cost-actions';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Feature flags' };
export default async function Page() {
  await requireAdmin();
  const flags = await db().query('SELECT key,description,enabled,updated_at FROM public.feature_flags ORDER BY key');
  return <div className="admin-refactor"><WorkspaceHeading eyebrow="SYSTEM / FLAGS" title="Feature flags" />
    <p className="adm-callout">Flags are stored here. A feature only reacts to a flag once its code reads it, so add the flag key to code before relying on it.</p>
    <section className="workspace-panel"><div className="table-scroll"><table className="adm-data-table"><thead><tr><th>Key</th><th>Description</th><th>State</th></tr></thead><tbody>
      {flags.map((f: any) => <tr key={f.key}><td>{f.key}</td><td>{f.description || '—'}</td><td><form action={saveFlag}><input type="hidden" name="key" value={f.key} /><input type="hidden" name="enabled" value={f.enabled ? 'false' : 'true'} /><button type="submit" aria-pressed={f.enabled}>{f.enabled ? 'On · turn off' : 'Off · turn on'}</button></form></td></tr>)}
      {!flags.length && <tr><td colSpan={3}>No flags yet. Create one below.</td></tr>}</tbody></table></div>
      <form action={saveFlag} className="adm-form-grid"><label>Key<input name="key" required pattern="[a-z][a-z0-9_]{1,59}" placeholder="speaking_audio_grading" /></label><label>Description<input name="description" maxLength={200} /></label><label className="adm-check"><input type="checkbox" name="enabled" /> Start enabled</label><button type="submit" className="button">Create flag</button></form></section></div>;
}
