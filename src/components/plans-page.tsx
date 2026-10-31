import { PlanCards } from '@/components/plan-cards';
import { creditText, type DisplayPlan } from '@/lib/plan-presentation';

export function PlansPage({ plans, free }: { plans: DisplayPlan[]; free: { writingCredits: number | null; speakingCredits: number | null } }) {
  return <div className="jtn-design jtn-plan-page" lang="en">
    <section className="p-top"><div className="p-wrap">
      <nav className="p-crumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Plans</span></nav>
      <div className="p-th"><div><h1><span>A little practice.</span><span className="p-b">A bigger possibility.</span></h1>
        <p className="p-lead">Prepare at your own pace. Pick the plan that fits your Writing and Speaking feedback.</p></div>
        <svg className="p-sx" viewBox="0 0 300 170" aria-hidden="true" focusable="false">
          <path className="p-fl" d="M10 150H66V124H122V98H178V72H234V46H290V170H10Z" />
          <path className="p-st" d="M10 150H66V124H122V98H178V72H234V46H290" /><circle cx="38" cy="142" r="6" />
        </svg>
      </div>
    </div></section>
    <section className="p-pl" aria-labelledby="plans-title"><div className="p-wrap"><h2 className="p-sr" id="plans-title">Plans</h2><PlanCards plans={plans} /></div></section>
    <section className="p-cr" aria-labelledby="credits-title"><div className="p-wrap"><h2 id="credits-title">How credits work.</h2><div className="p-cg">
      <div><b>Monthly reset</b><p>Limits reset on the first day of each month (UTC).</p></div>
      <div><b>One credit per Writing</b><p>Each Writing submission uses one credit, for either task.</p></div>
      <div><b>Speaking is separate</b><p>Speaking credits are counted on their own.</p></div>
      <div><b>Cambridge Writing</b><p>Cambridge Writing uses the same Writing allowance.</p></div>
    </div></div></section>
    <section className="p-free" aria-labelledby="free-title"><div className="p-wrap p-fr"><div>
      <h2 id="free-title">Or stay on Free.</h2>
      <div className="p-fm"><span><span className="p-cur">৳</span>0</span><span><i aria-hidden="true" />{creditText(free.writingCredits)} Writing / month</span><span><i aria-hidden="true" />{creditText(free.speakingCredits)} Speaking / month</span></div>
      <p className="p-note">A verified account is required for AI evaluation. Free Listening and Reading practice stays open to guests.</p>
    </div><div className="p-fa"><a className="p-btn" href="/dashboard">Continue with Free</a><a className="p-link" href="/dashboard/subscription">View my allowance</a></div></div></section>
  </div>;
}
