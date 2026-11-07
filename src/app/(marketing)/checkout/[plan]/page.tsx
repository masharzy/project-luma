import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { readAccountSession } from '@/lib/auth/session';
import { db } from '@/lib/auth/db';
import { uuid } from '@/lib/products/access';
import { briofoldConfig } from '@/lib/briofold';
import { paymentMethods } from '@/lib/payment-methods';
import { creditText } from '@/lib/plan-presentation';
import { accessLines, durationLabel } from '@/lib/plan-access';
import { CheckoutForm } from '@/components/checkout-form';
import '@/styles/checkout.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Checkout | JumpToNine', robots: { index: false, follow: false } };
const date = (v: unknown) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Dhaka' }).format(new Date(String(v)));

export default async function Page({ params }: { params: Promise<{ plan: string }> }) {
  const { plan: id } = await params;
  if (!uuid(id)) notFound();
  const session = await readAccountSession();
  if (!session?.user) redirect('/auth/sign-in?next=' + encodeURIComponent('/checkout/' + id));
  if (!session.user.emailVerified) redirect('/auth/verify-email');
  const user = session.user;
  const [plan] = await db().query('SELECT id,name,description,price_bdt,writing_limit,speaking_limit,duration_days,access FROM public.evaluation_plans WHERE id=$1 AND published=true', [id]);
  if (!plan) notFound();
  const subs = await db().query(`SELECT plan_name,status,expires_at FROM public.evaluation_subscriptions WHERE user_id=$1 AND ((status='pending') OR (status='active' AND expires_at>now())) ORDER BY created_at DESC`, [user.id]);
  const pending = subs.find(s => s.status === 'pending');
  const active = subs.find(s => s.status === 'active');
  const duration = durationLabel(Number(plan.duration_days) || 30);
  const lines = [
    { label: 'Writing evaluations', value: creditText(plan.writing_limit) + ' / month', on: plan.writing_limit !== 0 },
    { label: 'Speaking evaluations', value: creditText(plan.speaking_limit) + ' / month', on: plan.speaking_limit !== 0 },
    ...accessLines(plan.access).map(l => ({ ...l, value: l.value })),
  ];
  return (
    <main className="jtn-design ck">
      <div className="ck-wrap">
        <nav className="ck-crumb" aria-label="Breadcrumb"><Link href="/pricing">Plans</Link><span aria-hidden="true">/</span><span aria-current="page">Checkout</span></nav>
        <div className="ck-grid">
          <div className="ck-card" role="region" aria-labelledby="ck-plan">
            <p className="ck-kicker">Your plan</p>
            <h1 id="ck-plan">{String(plan.name)}</h1>
            {plan.description && <p className="ck-desc">{String(plan.description)}</p>}
            <p className="ck-big"><b>৳{Number(plan.price_bdt).toLocaleString('en-US')}</b><span>for {duration}</span></p>
            <ul className="ck-list">
              {lines.map(l => <li key={l.label} className={l.on ? 'on' : 'off'}><span aria-hidden="true">{l.on ? '✓' : '–'}</span><em>{l.label}</em>{l.on ? <b>{l.value}</b> : <u>Not included</u>}</li>)}
            </ul>
            <p className="ck-fine">Evaluations reset on the first day of each month (UTC).</p>
          </div>
          <div className="ck-card ck-side" role="region" aria-labelledby="ck-sum">
            <p className="ck-kicker" id="ck-sum">Order</p>
            <p className="ck-who">{user.email}</p>
            {pending ? (
              <div className="ck-state">
                <strong>Request received for {String(pending.plan_name)}</strong>
                <p>It is waiting for payment confirmation. <Link href="/dashboard/subscription">View your subscription</Link></p>
              </div>
            ) : (
              <CheckoutForm planId={String(plan.id)} planName={String(plan.name)} duration={duration} listPrice={Number(plan.price_bdt)} methods={paymentMethods} gateway={briofoldConfig() !== null} replacing={active ? `${String(active.plan_name)} (until ${date(active.expires_at)})` : undefined} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
