import Link from 'next/link';
import {requireUser} from '@/lib/auth/guards';
import {db} from '@/lib/auth/db';
import {vocabStats} from '@/lib/vocab-stats';
import {FREE_LIMIT,openLimit} from '@/lib/vocabulary';
import {GoalSetter} from '@/components/vocabulary/goal-setter';
import styles from '@/components/vocabulary/vocabulary.module.css';
export const metadata={title:'Vocabulary progress'};
export const dynamic='force-dynamic';
function Meter({label,done,total,note}:{label:string;done:number;total:number;note?:React.ReactNode}){
 return <div className={styles.dvRow}><div className={styles.dvRowHead}><span>{label}</span><b>{note??`${done} / ${total}`}</b></div><div className={styles.bar}><i style={{width:`${total?Math.min(100,(done/total)*100):0}%`}}/></div></div>;
}
export default async function Page(){
 const user=await requireUser();
 const open=await openLimit(user.id);const cap=Number.isFinite(open)?open:1e9;
 const [stats,[agg],topics]=await Promise.all([
  vocabStats(user.id),
  db().query(`SELECT count(*) FILTER(WHERE p.box>=4)::int AS mastered, count(*) FILTER(WHERE p.box BETWEEN 1 AND 3)::int AS learning, count(*) FILTER(WHERE p.box>0 AND p.due_at<=now())::int AS due,
    count(*) FILTER(WHERE p.box>=4 AND w.position<=$2)::int AS free_done, count(*) FILTER(WHERE p.box>=4 AND w.position>$2 AND w.position<=$3)::int AS prem_done,
    (SELECT count(*)::int FROM public.vocab_words WHERE published AND position>$2 AND position<=$3) AS prem_open, (SELECT count(*)::int FROM public.vocab_words WHERE published) AS total
    FROM public.vocab_progress p JOIN public.vocab_words w ON w.id=p.word_id WHERE p.user_id=$1::uuid`,[user.id,FREE_LIMIT,cap]),
  db().query(`SELECT t.topic, count(*)::int AS total, count(*) FILTER(WHERE p.box>=4)::int AS done FROM public.vocab_words w CROSS JOIN LATERAL unnest(w.topics) AS t(topic) LEFT JOIN public.vocab_progress p ON p.word_id=w.id AND p.user_id=$1::uuid WHERE w.published AND w.position<=$2 GROUP BY t.topic ORDER BY t.topic`,[user.id,cap]),
 ]);
 const a=agg||{mastered:0,learning:0,due:0,free_done:0,prem_done:0,prem_open:0,total:0};
 const streak=stats.streakBase+(stats.todayN>0?1:0);
 return <div className={styles.dvPage}>
  <header className={styles.dvHead}><div><h1>Vocabulary</h1><p>Daily goal সেট করো, কতটা শিখলে দেখো, আর যেখানে থেমেছিলে সেখান থেকে আবার শুরু করো।</p></div>
   <Link href="/vocabulary?mode=cards#study" className={styles.primary}>Continue learning</Link></header>
  <div className={styles.dvGrid}>
   <section className={styles.dvCard}><div className={styles.dvRowHead}><span>Today</span><GoalSetter goal={stats.goal}/></div>
    <div className={styles.dvBig}>{Math.min(stats.todayN,stats.goal)}<small>/ {stats.goal} cards</small></div>
    <div className={styles.bar}><i style={{width:`${Math.min(1,stats.todayN/stats.goal)*100}%`}}/></div>
    <p className={styles.goalSub}>{stats.todayN>=stats.goal?'Goal reached for today.':`${stats.goal-stats.todayN} more to reach today's goal.`}</p></section>
   <section className={styles.dvCard}><span>Streak</span><div className={styles.dvBig}>{streak}<small>{streak===1?'day':'days'}</small></div><p className={styles.goalSub}>Study at least one card each day to keep it.</p></section>
   <section className={styles.dvCard}><span>Mastered</span><div className={styles.dvBig}>{a.mastered}<small>words</small></div><p className={styles.goalSub}>{a.learning} in progress, {a.due} due to review.</p></section>
  </div>
  <section className={styles.dvCard}>
   <Meter label="Free words learned" done={a.free_done} total={FREE_LIMIT}/>
   <Meter label="Premium words learned" done={a.prem_done} total={a.prem_open} note={a.prem_open?undefined:<Link href="/pricing" className={styles.dashLink}>Unlock with a plan</Link>}/>
  </section>
  <section className={styles.dvCard}><h2>By topic</h2>
   {topics.map(t=><Meter key={String(t.topic)} label={String(t.topic)} done={Number(t.done)} total={Number(t.total)}/>)}
  </section>
 </div>;
}
