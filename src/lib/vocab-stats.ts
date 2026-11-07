import 'server-only';
import {db} from '@/lib/auth/db';
const DHAKA="(now() AT TIME ZONE 'Asia/Dhaka')::date";
// Goal, today's count and the streak up to yesterday (today is added by the caller when it has activity).
export async function vocabStats(userId:string){
 const [s]=await db().query('SELECT daily_goal FROM public.vocab_settings WHERE user_id=$1::uuid',[userId]);
 const days=await db().query(`SELECT to_char(day,'YYYY-MM-DD') AS d,n FROM public.vocab_daily WHERE user_id=$1::uuid AND n>0 AND day>=${DHAKA}-400 ORDER BY day DESC`,[userId]);
 const [t]=await db().query(`SELECT to_char(${DHAKA},'YYYY-MM-DD') AS today`);
 const set=new Set(days.map(r=>String(r.d)));
 const today=String(t.today);
 const todayN=Number(days.find(r=>r.d===today)?.n??0);
 let streak=0;const cur=new Date(today+'T00:00:00Z');cur.setUTCDate(cur.getUTCDate()-1);
 while(set.has(cur.toISOString().slice(0,10))){streak++;cur.setUTCDate(cur.getUTCDate()-1);}
 return{goal:Number(s?.daily_goal??10),todayN,streakBase:streak};
}
export async function addDaily(userId:string,count:number){
 await db().query(`INSERT INTO public.vocab_daily(user_id,day,n) VALUES($1::uuid,${DHAKA},$2) ON CONFLICT(user_id,day) DO UPDATE SET n=public.vocab_daily.n+EXCLUDED.n`,[userId,count]);
}
