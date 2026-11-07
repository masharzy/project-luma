import { creditText, type DisplayPlan } from '@/lib/plan-presentation';

// Short and scannable: price, what you get each month, then a tick or a dash for every feature.
export function PlanCards({ plans }: { plans: DisplayPlan[] }) {
  return <div className="pc-grid" data-n={plans.length}>
    {!plans.length && <p className="p-empty">Paid plans are being prepared. Published plans will appear here.</p>}
    {plans.map(plan => <article className={'pc-card' + (plan.recommended ? ' pc-best' : '')} key={plan.id}>
      <header>
        <h3>{plan.name}</h3>
        {plan.recommended && <span className="pc-badge">Most chosen</span>}
      </header>
      {plan.tagline && <p className="pc-tag">{plan.tagline}</p>}
      <p className="pc-price"><b><i>৳</i>{plan.price.toLocaleString('en-US')}</b><span>for {plan.duration}</span></p>
      <ul className="pc-list">
        <li className="pc-on"><span aria-hidden="true">✓</span><em>Writing evaluations</em><b>{creditText(plan.writingCredits)}<small> / month</small></b></li>
        <li className="pc-on"><span aria-hidden="true">✓</span><em>Speaking evaluations</em><b>{creditText(plan.speakingCredits)}<small> / month</small></b></li>
        {plan.lines.map(l => <li key={l.label} className={l.on ? 'pc-on' : 'pc-off'}>
          <span aria-hidden="true">{l.on ? '✓' : '–'}</span><em>{l.label}</em>{l.on && l.value && <b>{l.value}</b>}
          {!l.on && <u className="pc-sr">Not included</u>}
        </li>)}
      </ul>
      <a className="pc-btn" href={'/checkout/' + encodeURIComponent(plan.id)}>Choose {plan.name}</a>
    </article>)}
  </div>;
}
