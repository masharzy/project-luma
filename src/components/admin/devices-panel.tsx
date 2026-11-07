'use client';
import { Laptop, Smartphone, Tablet, Monitor } from 'lucide-react';
import { Badge, Card, CardTitle, ago, dhaka } from './ui';
import { field, labelText, smallGhost } from './form-classes';
import { useAccessAction } from './use-access-action';
import { describeDevice } from '@/lib/admin/device';

type Device = { device_id: string; user_agent: string | null; created_at: string; last_seen_at: string; expires_at: string };
const icons = { phone: Smartphone, tablet: Tablet, desktop: Laptop, unknown: Monitor } as const;

export function DevicesPanel({ userId, devices, limit, defaultLimit, ready }: { userId: string; devices: Device[]; limit: number | null; defaultLimit: number | null; ready: boolean }) {
  const { run, busy, error, done } = useAccessAction(userId);
  const effective = limit ?? defaultLimit;
  return (
    <div className="grid gap-5">
      <Card>
        <CardTitle title="Device limit" hint="How many devices can stay signed in at once. The oldest one is signed out when a new one signs in." />
        <div className="flex flex-wrap items-end gap-3">
          <label><span className={labelText}>Limit for this account</span>
            <select className={field + ' !w-56'} disabled={busy || !ready} value={limit ?? ''} onChange={e => run({ action: 'set_device_limit', deviceLimit: e.target.value === '' ? null : Number(e.target.value) }, 'Device limit saved.', e.target.value !== '' && devices.length > Number(e.target.value) ? 'Devices beyond this limit will be signed out now. Continue?' : undefined)}>
              <option value="">Platform default ({defaultLimit ?? 'unlimited'})</option>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? 'device' : 'devices'}</option>)}
            </select></label>
          <p className="m-0 pb-2 text-[13px] text-muted">{devices.length} signed in{effective ? ` of ${effective} allowed` : ', no limit'}</p>
        </div>
        {error && <p role="alert" className="m-0 mt-3 rounded-xl bg-warn-soft px-3 py-2 text-[12px] text-warn">{error}</p>}
        {done && <p role="status" className="m-0 mt-3 rounded-xl bg-ok-soft px-3 py-2 text-[12px] text-ok">{done}</p>}
      </Card>
      <Card>
        <CardTitle title="Signed-in devices" hint="Browser sessions that have not expired." />
        {ready ? (
          <ul className="m-0 grid list-none gap-2 p-0">
            {devices.map(d => {
              const info = describeDevice(d.user_agent); const Icon = icons[info.kind];
              return (
                <li key={d.device_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-soft text-muted"><Icon size={18} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-ink">{info.label}</div>
                    <div className="text-[12px] text-muted">Last active {ago(d.last_seen_at)} · signed in {dhaka(d.created_at, true)}</div>
                  </div>
                  {!d.user_agent && <Badge>Signed in before device tracking</Badge>}
                  <button type="button" className={smallGhost} disabled={busy} onClick={() => run({ action: 'revoke_device', deviceId: d.device_id }, 'Device signed out.', 'Sign this device out?')}>Sign out</button>
                </li>
              );
            })}
            {!devices.length && <li className="rounded-xl border border-dashed border-line p-6 text-center text-[13px] text-muted">No active sessions.</li>}
          </ul>
        ) : <p className="m-0 text-[13px] text-muted">Device details need migration 036.</p>}
      </Card>
    </div>
  );
}
