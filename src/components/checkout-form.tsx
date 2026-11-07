'use client';
import { useState } from 'react';
import type { PaymentMethod } from '@/lib/payment-methods';

type Quote = { listPrice: number; discount: number; total: number; coupon: { code: string; kind: 'percent' | 'fixed'; value: number } | null };
const taka = (n: number) => '৳' + n.toLocaleString('en-US');
async function call(body: Record<string, unknown>) {
  const res = await fetch('/api/membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

// Right-hand side of checkout: price, coupon, payment and the final button.
export function CheckoutForm({ planId, planName, duration, listPrice, methods, gateway }: { planId: string; planName: string; duration: string; listPrice: number; methods: PaymentMethod[]; gateway?: boolean }) {
  const [quote, setQuote] = useState<Quote>({ listPrice, discount: 0, total: listPrice, coupon: null });
  const [code, setCode] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const [method, setMethod] = useState(methods[0]?.name ?? '');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState<'' | 'coupon' | 'order'>('');
  const [error, setError] = useState('');
  const chosen = methods.find(m => m.name === method);

  async function applyCoupon() {
    if (!code.trim()) return;
    setBusy('coupon'); setCouponMsg('');
    try { setQuote(await call({ action: 'quote', planId, coupon: code })); setCouponMsg(''); }
    catch (e) { setCouponMsg(e instanceof Error ? e.message : 'Could not check this code.'); }
    finally { setBusy(''); }
  }
  function removeCoupon() { setQuote({ listPrice, discount: 0, total: listPrice, coupon: null }); setCode(''); setCouponMsg(''); }
  async function place() {
    setBusy('order'); setError('');
    try {
      await call({ action: 'request', planId, coupon: quote.coupon?.code, paymentMethod: method || undefined, paymentRef: ref || undefined });
      window.location.assign('/dashboard/subscription');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not place your request.'); setBusy(''); }
  }

  async function payOnline() {
    setBusy('order'); setError('');
    try {
      const r = await call({ action: 'pay', planId, coupon: quote.coupon?.code });
      window.location.assign(r.checkoutUrl);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start payment.'); setBusy(''); }
  }

  return (
    <div className="ck-pay">
      <dl className="ck-rows">
        <div><dt>{planName} · {duration}</dt><dd>{taka(quote.listPrice)}</dd></div>
        {quote.coupon && <div className="ck-disc"><dt>Coupon {quote.coupon.code}<button type="button" onClick={removeCoupon}>Remove</button></dt><dd>−{taka(quote.discount)}</dd></div>}
      </dl>
      {!quote.coupon && (
        <div className="ck-coupon">
          <label htmlFor="ck-code">Have a coupon?</label>
          <div>
            <input id="ck-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Enter code" autoComplete="off" maxLength={40} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void applyCoupon(); } }} />
            <button type="button" onClick={applyCoupon} disabled={busy !== '' || !code.trim()}>{busy === 'coupon' ? 'Checking…' : 'Apply'}</button>
          </div>
          {couponMsg && <p role="alert" className="ck-err">{couponMsg}</p>}
        </div>
      )}
      <div className="ck-total"><span>Total</span><strong>{taka(quote.total)}</strong></div>

      {gateway && quote.total > 0 ? (
        <>
          <button type="button" className="ck-go" onClick={payOnline} disabled={busy !== ''}>{busy === 'order' ? 'Opening payment…' : 'Pay ' + taka(quote.total)}</button>
          {error && <p role="alert" className="ck-err">{error}</p>}
          <p className="ck-fine">Secure online payment. Starts automatically after confirmation. No auto-renewal.</p>
        </>
      ) : methods.length ? (
        <>
          <h3 className="ck-h">Payment</h3>
          <div className="ck-methods" role="radiogroup" aria-label="Payment method">
            {methods.map(m => <label key={m.name} className={m.name === method ? 'on' : ''}><input type="radio" name="method" checked={m.name === method} onChange={() => setMethod(m.name)} />{m.name}</label>)}
          </div>
          {chosen && (
            <div className="ck-how">
              <p>Send <b>{taka(quote.total)}</b> to <b>{chosen.account}</b></p>
              <ol>{chosen.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              <label htmlFor="ck-ref">Transaction ID</label>
              <input id="ck-ref" value={ref} onChange={e => setRef(e.target.value)} maxLength={80} placeholder="Paste it after you pay" autoComplete="off" />
            </div>
          )}
        </>
      ) : (
        <p className="ck-soft">Payment details are shared right after you place the request. Your plan starts once payment is confirmed.</p>
      )}
      {!(gateway && quote.total > 0) && <button type="button" className="ck-go" onClick={place} disabled={busy !== '' || (methods.length > 0 && !ref.trim())}>{busy === 'order' ? 'Placing request…' : quote.total === 0 ? 'Request ' + planName : 'Request ' + planName + ' · ' + taka(quote.total)}</button>}
      {!(gateway && quote.total > 0) && error && <p role="alert" className="ck-err">{error}</p>}
      {!(gateway && quote.total > 0) && <p className="ck-fine">No automatic renewal. You can cancel a pending request any time.</p>}
    </div>
  );
}
