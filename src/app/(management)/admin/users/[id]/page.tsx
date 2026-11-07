import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { adminAccessCatalog, adminUserDetail } from '@/lib/admin/user-detail';
import { UserActions } from '@/components/admin/user-actions';
import { AccessPanel } from '@/components/admin/access-panel';
import { DevicesPanel } from '@/components/admin/devices-panel';
import { Avatar } from '@/components/admin/account-menu';
import { Badge, Card, CardTitle, Stat, ago, dhaka, taka } from '@/components/admin/ui';
export const dynamic = 'force-dynamic';
const tabs = [['overview', 'Overview'], ['access', 'Access'], ['devices', 'Devices'], ['activity', 'Activity'], ['history', 'Learning history']] as const;
type Tab = typeof tabs[number][0];

function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return <dl className="m-0 grid gap-x-8 gap-y-4 sm:grid-cols-2">{items.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-[12px] text-muted">{k}</dt><dd className="m-0 mt-0.5 break-words text-[13px] text-ink">{v}</dd></div>)}</dl>;
}
function Records({ title, rows, describe, empty }: { title: string; rows: Record<string, any>[]; describe: (r: Record<string, any>) => { title: string; meta: string }; empty: string }) {
  return (
    <Card>
      <CardTitle title={title} />
      <ul className="m-0 grid list-none gap-2 p-0">
        {rows.map((r, i) => { const d = describe(r); return (
          <li key={String(r.id ?? i)} className="rounded-xl border border-line bg-bg">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3"><span className="min-w-0 truncate text-[13px] font-medium text-ink">{d.title}</span><span className="text-[12px] text-muted">{d.meta}</span></summary>
              <pre className="m-0 max-h-72 overflow-auto border-t border-line px-4 py-3 text-[11px] leading-relaxed text-muted">{JSON.stringify(r, null, 2)}</pre>
            </details>
          </li>); })}
        {!rows.length && <li className="rounded-xl border border-dashed border-line p-5 text-center text-[13px] text-muted">{empty}</li>}
      </ul>
    </Card>
  );
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; tab?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params, q = await searchParams;
  const page = typeof q.page === 'string' && /^\d{1,5}$/.test(q.page) ? Math.max(1, Number(q.page)) : 1;
  const tab: Tab = tabs.some(([k]) => k === q.tab) ? (q.tab as Tab) : 'overview';
  const d = await adminUserDetail(id, page);
  if (!d) notFound();
  const u = d.user as Record<string, any>, c = d.counts as Record<string, any>;
  const catalog = tab === 'access' ? await adminAccessCatalog() : null;
  const href = (t: string, p = 1) => `/admin/users/${id}?tab=${t}${p > 1 ? '&page=' + p : ''}`;
  const methods = [u.has_password ? 'Password' : null, ...d.providers.map((p: any) => p.provider === 'google' ? 'Google' : p.provider)].filter(Boolean).join(', ') || 'None';
  const goal = (d.goals as any[])[0];
  const historyFull = [d.attempts, d.writing, d.speaking, d.speakingAttempts, d.registrations].some(r => (r as any[]).length === 25);
  return (
    <div>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted no-underline hover:text-ink"><ArrowLeft size={14} aria-hidden="true" />All users</Link>
      <Card className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={u.name} email={u.email} size={60} />
            <div className="min-w-0">
              <h1 className="m-0 truncate text-[24px] font-semibold tracking-tight text-ink">{u.name}</h1>
              <p className="m-0 truncate text-[13px] text-muted">{u.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {u.banned ? <Badge tone="warn">Blocked</Badge> : u.email_verified ? <Badge tone="good">Verified</Badge> : <Badge tone="info">Email not verified</Badge>}
                {u.role === 'admin' && <Badge tone="accent">Admin</Badge>}
                {d.active ? <Badge tone="good">{String((d.active as any).plan_name)}</Badge> : <Badge>Free</Badge>}
              </div>
            </div>
          </div>
          <UserActions id={id} role={String(u.role)} banned={Boolean(u.banned)} isSelf={id === admin.id} />
        </div>
      </Card>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Plan" value={d.active ? String((d.active as any).plan_name) : 'Free'} sub={d.active ? 'Until ' + dhaka((d.active as any).expires_at) : 'No active plan'} />
        <Stat label="Last seen" value={ago(c.last_seen)} sub={`Joined ${dhaka(u.created_at)}`} />
        <Stat label="Tests taken" value={c.tests} />
        <Stat label="AI evaluations" value={c.writing + c.speaking} sub={`${c.writing} Writing · ${c.speaking} Speaking`} />
        <Stat label="Paid so far" value={taka(c.spent)} />
      </div>
      <nav aria-label="Profile sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map(([k, label]) => (
          <Link key={k} href={href(k)} aria-current={tab === k ? 'page' : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] no-underline ${tab === k ? 'border-ink font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'}`}>{label}</Link>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card><CardTitle title="Account" />
            <Facts items={[['Account ID', <span key="i" className="font-mono text-[12px]">{u.id}</span>], ['Sign-in methods', methods], ['Joined', dhaka(u.created_at, true)], ['Last updated', dhaka(u.updated_at, true)], ['Role', u.role === 'admin' ? 'Administrator' : 'Learner'], ['Devices signed in', d.deviceSchemaReady ? String(d.devices.length) : '—']]} />
          </Card>
          <Card><CardTitle title="Learning goal" />
            {goal ? <Facts items={[['Target band', goal.target_band], ['Weekly target', goal.weekly_target], ['Exam date', goal.exam_date ? dhaka(goal.exam_date) : 'Not set'], ['Saved resources', String((d.saved as any[]).length)]]} /> : <p className="m-0 text-[13px] text-muted">No goal saved yet.</p>}
          </Card>
          <Card className="lg:col-span-2"><CardTitle title="Plan history" hint="Newest first." />
            <ul className="m-0 grid list-none gap-2 p-0">
              {(d.subscriptions as any[]).map(s => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bg px-4 py-3 text-[13px]">
                  <span className="font-medium text-ink">{s.plan_name} <span className="font-normal text-muted">· {taka(s.price_bdt)}</span></span>
                  <span className="flex items-center gap-3 text-[12px] text-muted">{s.starts_at ? `${dhaka(s.starts_at)} to ${dhaka(s.expires_at)}` : 'Requested ' + dhaka(s.created_at)}<Badge tone={s.status === 'active' ? 'good' : s.status === 'pending' ? 'info' : 'neutral'}>{s.status}</Badge></span>
                </li>))}
              {!(d.subscriptions as any[]).length && <li className="rounded-xl border border-dashed border-line p-5 text-center text-[13px] text-muted">This account has never had a plan.</li>}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'access' && catalog && (
        <AccessPanel userId={id} ready={d.deviceSchemaReady} plans={catalog.plans} active={d.active as any} allowances={d.allowances as any} grants={d.contentGrants as any} options={catalog.options} />
      )}

      {tab === 'devices' && (
        <DevicesPanel userId={id} devices={d.devices as any} limit={(d.deviceLimit as any)?.device_limit ?? null} defaultLimit={(d.deviceLimit as any)?.default_device_limit ?? null} ready={d.deviceSchemaReady} />
      )}

      {tab === 'activity' && (
        <Card><CardTitle title="Account activity" hint="Sign-ins, security and admin actions on this account." />
          <ul className="m-0 grid list-none gap-1 p-0">
            {(d.activity as any[]).map((a, i) => <li key={i} className="flex flex-wrap justify-between gap-2 border-b border-line py-2.5 text-[13px] last:border-0"><span className="min-w-0 break-words text-ink">{String(a.action).replaceAll(':', ' · ').replaceAll('_', ' ')}</span><span className="text-[12px] text-muted">{dhaka(a.created_at, true)}</span></li>)}
            {!(d.activity as any[]).length && <li className="py-6 text-center text-[13px] text-muted">No activity on this page.</li>}
          </ul>
        </Card>
      )}

      {tab === 'history' && (
        <div className="grid gap-5">
          <Records title="Tests and answers" rows={d.attempts as any} empty="No tests taken." describe={r => ({ title: r.title || 'Test', meta: `${r.kind} · ${r.modules} modules · ${dhaka(r.created_at, true)}` })} />
          <Records title="Writing evaluations" rows={d.writing as any} empty="No Writing evaluations." describe={r => ({ title: String(r.product).replaceAll('_', ' '), meta: `${r.status} · ${dhaka(r.created_at, true)}` })} />
          <Records title="Speaking sessions" rows={d.speakingAttempts as any} empty="No Speaking sessions." describe={r => ({ title: r.title, meta: `${r.status} · ${r.recorded_answers} answers recorded · ${dhaka(r.created_at, true)}` })} />
          <Records title="Speaking evaluations" rows={d.speaking as any} empty="No Speaking evaluations." describe={r => ({ title: r.title, meta: `${r.status} · ${dhaka(r.created_at, true)}` })} />
          <Records title="Mock registrations" rows={d.registrations as any} empty="No mock registrations." describe={r => ({ title: r.title, meta: dhaka(r.registered_at, true) })} />
        </div>
      )}

      {(tab === 'history' || tab === 'activity') && (page > 1 || historyFull || (d.activity as any[]).length === 25) && (
        <div className="mt-5 flex justify-end gap-2 text-[12px]">
          {page > 1 && <Link href={href(tab, page - 1)} className="rounded-full border border-line px-3 py-1.5 text-ink no-underline hover:bg-soft">Previous</Link>}
          <Link href={href(tab, page + 1)} className="rounded-full border border-line px-3 py-1.5 text-ink no-underline hover:bg-soft">Next</Link>
        </div>
      )}
    </div>
  );
}
