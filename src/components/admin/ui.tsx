import Link from 'next/link';
import type { ReactNode } from 'react';
import { Avatar } from './account-menu';

// Small server-safe building blocks shared by the redesigned admin pages.
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card border border-line bg-surface p-5 shadow-card ${className}`}>{children}</section>;
}
export function CardTitle({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="m-0 text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {hint && <p className="m-0 mt-0.5 text-[12px] text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
const tones = {
  neutral: 'border-line text-muted',
  good: 'border-transparent bg-ok-soft text-ok',
  warn: 'border-transparent bg-warn-soft text-warn',
  info: 'border-transparent bg-info-soft text-info',
  accent: 'border-transparent bg-accent-soft text-accent',
} as const;
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}
export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3.5">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1 truncate text-[22px] font-semibold tabular-nums tracking-tight text-ink">{value}</div>
      {sub && <div className="mt-0.5 truncate text-[12px] text-muted">{sub}</div>}
    </div>
  );
}
export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="m-0 text-[26px] font-semibold tracking-tight text-ink">{title}</h1>
        {sub && <p className="m-0 mt-1 text-[13px] text-muted">{sub}</p>}
      </div>
      {actions}
    </div>
  );
}
export function PersonCell({ id, name, email, trailing }: { id: string; name: string; email: string; trailing?: ReactNode }) {
  return (
    <Link href={'/admin/users/' + id} className="flex min-w-0 items-center gap-3 text-ink no-underline">
      <Avatar name={name} email={email} size={36} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{name}</span>
        <span className="block truncate text-[12px] text-muted">{email}</span>
      </span>
      {trailing}
    </Link>
  );
}
export const dhaka = (v: unknown, withTime = false) => {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}), timeZone: 'Asia/Dhaka' }).format(new Date(String(v)));
};
export const ago = (v: unknown) => {
  if (!v) return 'Never';
  const s = Math.max(0, (Date.now() - new Date(String(v)).getTime()) / 1000);
  if (s < 90) return 'Just now';
  if (s < 5400) return Math.round(s / 60) + ' min ago';
  if (s < 129600) return Math.round(s / 3600) + ' h ago';
  if (s < 2592000) return Math.round(s / 86400) + ' days ago';
  return dhaka(v);
};
export const taka = (n: unknown) => '৳' + Number(n || 0).toLocaleString('en-US');
