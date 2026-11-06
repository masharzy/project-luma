import Link from 'next/link';
import {day} from '@/lib/learner/presentation';
type Entry={id:string;status:string;created_at:string;band:number|null};
/** Saved Speaking feedback list, shared by the public entry page and the learner studio. */
export function SpeakingHistory({items}:{items:Entry[]}){
 if(!items.length)return null;
 return <section className="sp-history" aria-labelledby="sp-history-title"><div className="study-section-title"><h2 id="sp-history-title">Your recent feedback</h2><span>{items.length} sessions</span></div><div className="study-feedback-grid">{items.map(e=><Link className="study-feedback-card" href={'/speaking-evaluation/results/'+e.id} key={e.id}><span className="study-kicker">SPEAKING · {day(e.created_at)}</span><strong>{typeof e.band==='number'?e.band.toFixed(1):'—'}</strong><span>{typeof e.band==='number'?'Estimated band':e.status==='completed'?'Not enough scorable evidence':e.status==='failed'?'Evaluation unavailable':'Feedback in progress'}</span><footer>Open feedback <span>↗</span></footer></Link>)}</div></section>;
}
