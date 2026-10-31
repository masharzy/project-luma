import { creditText, creditPercent, type DisplayPlan } from '@/lib/plan-presentation';

export function PlanCards({ plans }: { plans: DisplayPlan[] }) {
  const writing = plans.map(p => p.writingCredits), speaking = plans.map(p => p.speakingCredits);
  return <div className="p-plans" data-n={plans.length > 6 ? 'more' : plans.length}>
    {!plans.length && <p className="p-empty">Paid plans are being prepared. Published plans will appear here.</p>}
    {plans.map(plan => <article className={'p-plan' + (plan.recommended ? ' p-f' : '')} key={plan.id}>
      <div className="p-ph"><h3>{plan.name}</h3>{plan.recommended && <span className="p-most">Most chosen</span>}</div>
      {plan.tagline && <p className="p-tg">{plan.tagline}</p>}
      <p className="p-pr"><b><span className="p-cur">৳</span>{plan.price.toLocaleString('en-US')}</b><span>/ {plan.period}</span></p>
      <div className="p-am">{([
        ['Writing', plan.writingCredits, writing], ['Speaking', plan.speakingCredits, speaking],
      ] as const).map(([label, count, values]) => <div key={label}>
        <strong className={count === null ? "p-unlimited" : undefined}>{creditText(count)}</strong><span>{label} / month</span>
        <i aria-hidden="true"><u><svg viewBox="0 0 100 3" preserveAspectRatio="none" focusable="false"><rect width={creditPercent(count, [...values])} height="3" /></svg></u></i>
      </div>)}</div>
      {plan.features.length > 0 && <ul className="p-ft">{plan.features.map((feature, i) => <li key={i}>{feature}</li>)}</ul>}
      <a className="p-btn" href={'/dashboard/subscription?plan=' + encodeURIComponent(plan.id) + '#plan-' + encodeURIComponent(plan.id)}>Choose {plan.name}</a>
    </article>)}
  </div>;
}
