import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { readAccountSession } from '@/lib/auth/session';
import { db } from '@/lib/auth/db';
import { uuid } from '@/lib/products/access';
import { paymentMethods } from '@/lib/payment-methods';
import { creditText } from '@/lib/plan-presentation';
import { CheckoutButton } from '@/components/checkout-button';
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
  const [plan] = await db().query('SELECT id,name,description,price_bdt,writing_limit,speaking_limit FROM public.evaluation_plans WHERE id=$1 AND published=true', [id]);
  if (!plan) notFound();
  const subs = await db().query(`SELECT id,plan_id,plan_name,status,expires_at FROM public.evaluation_subscriptions WHERE user_id=$1 AND ((status='pending') OR (status='active' AND expires_at>now())) ORDER BY created_at DESC`, [user.id]);
  const pending = subs.find(s => s.status === 'pending');
  const active = subs.find(s => s.status === 'active');
  const total = Number(plan.price_bdt);
  const lines: [string, string][] = [
    ['Writing evaluations', `${creditText(plan.writing_limit)} a month`],
    ['Speaking evaluations', `${creditText(plan.speaking_limit)} a month`],
    ['Premium tests', 'All unlocked'],
    ['Access period', '30 days from approval'],
  ];
  return (
    <main className="jtn-design co">
      <div className="co-wrap">
        <nav className="co-crumb" aria-label="Breadcrumb"><Link href="/pricing">Plans</Link><span aria-hidden="true">/</span><span aria-current="page">Checkout</span></nav>
        <h1 className="co-title">Checkout</h1>
        <div className="co-grid">
          <section className="co-card" aria-labelledby="co-order">
            <h2 id="co-order">Order summary</h2>
            <div className="co-plan"><div><strong>{plan.name}</strong>{plan.description && <p>{plan.description}</p>}</div><span className="co-price">৳{total.toLocaleString('en-US')}</span></div>
            <dl className="co-lines">{lines.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            <div className="co-total"><span>Total today</span><strong>৳{total.toLocaleString('en-US')}</strong></div>
            <p className="co-fine">Credits reset on the first day of each month (UTC). The plan does not renew by itself.</p>
          </section>
          <section className="co-card" aria-labelledby="co-pay">
            <h2 id="co-pay">Payment</h2>
            <p className="co-who">Signed in as <b>{user.email}</b></p>
            {paymentMethods.length ? (
              <div className="co-methods">
                {paymentMethods.map(m => (
                  <div className="co-method" key={m.name}>
                    <div><strong>{m.name}</strong><span>{m.account}</span></div>
                    <ol>{m.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  </div>
                ))}
                <p className="co-fine">Send ৳{total.toLocaleString('en-US')} first, then place your request. We match the payment to your account email.</p>
              </div>
            ) : (
              <p className="co-fine">Place your request and we confirm the payment with you by email. Your plan starts once the payment is confirmed.</p>
            )}
            {pending ? (
              <div className="co-state">
                <strong>Request received for {String(pending.plan_name)}</strong>
                <p>It is waiting for payment confirmation. <Link href="/dashboard/subscription">View your subscription</Link></p>
              </div>
            ) : (
              <>
                {active && <p className="co-note">You are on {String(active.plan_name)} until {date(active.expires_at)}. Approving this request replaces that plan.</p>}
                <CheckoutButton planId={String(plan.id)} planName={String(plan.name)} />
              </>
            )}
            <p className="co-help">Need help? <Link href="/about">Contact us</Link></p>
          </section>
        </div>
      </div>
    </main>
  );
}
