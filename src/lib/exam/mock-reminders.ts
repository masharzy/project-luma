import 'server-only';
import { send } from '@vercel/queue';
import { db } from '@/lib/auth/db';
import { appOrigin } from '@/lib/auth/config';
import { sendNotificationMail } from '@/lib/auth/mail';
export const mockReminderTopic='jumptonine-mock-reminders';
export async function queueMockReminder(mockId:string,userId:string){
 const r=(await db().query('SELECT e.starts_at,r.reminder_sent_at FROM public.mock_events e JOIN public.mock_registrations r ON r.mock_id=e.id WHERE e.id=$1 AND r.user_id=$2',[mockId,userId]))[0];
 if(!r||r.reminder_sent_at||new Date(String(r.starts_at)).getTime()<=Date.now())return;
 const delay=Math.max(0,Math.min(6*86400,Math.ceil((new Date(String(r.starts_at)).getTime()-600000-Date.now())/1000)));
 await send(mockReminderTopic,{mockId,userId},{idempotencyKey:`mock-reminder:${mockId}:${userId}:${Math.floor(Date.now()/86400000)}`,delaySeconds:delay,retentionSeconds:604800});
}
export async function deliverMockReminder(mockId:string,userId:string){
 const r=(await db().query(`SELECT e.title,e.starts_at,u.email,r.reminder_sent_at FROM public.mock_registrations r JOIN public.mock_events e ON e.id=r.mock_id JOIN public.admin_content c ON c.id=e.id JOIN app_auth.users u ON u.id=r.user_id WHERE r.mock_id=$1 AND r.user_id=$2 AND c.status='published' AND u.banned=false AND u.email_verified=true`,[mockId,userId]))[0];
 if(!r||r.reminder_sent_at)return;
 const remaining=new Date(String(r.starts_at)).getTime()-Date.now();if(remaining<=0)return;
 if(remaining>600000){await queueMockReminder(mockId,userId);return;}
 const claimed=await db().query(`UPDATE public.mock_registrations SET reminder_lease_until=now()+interval '2 minutes' WHERE mock_id=$1 AND user_id=$2 AND reminder_sent_at IS NULL AND (reminder_lease_until IS NULL OR reminder_lease_until<now()) RETURNING mock_id`,[mockId,userId]);
 if(!claimed.length)throw Error('Reminder lease active');
 try{await sendNotificationMail(String(r.email),'Your JumpToNine mock starts soon',`${r.title}\nStarts: ${new Date(String(r.starts_at)).toLocaleString('en-GB',{timeZone:'Asia/Dhaka'})} (Bangladesh time).\n\nOpen your waiting room: ${appOrigin()}/mocks/${mockId}\n\nYou received this reminder because you registered for this mock.`, `mock-${mockId}-${userId}`);
 await db().query('UPDATE public.mock_registrations SET reminder_sent_at=now(),reminder_lease_until=NULL WHERE mock_id=$1 AND user_id=$2',[mockId,userId]);}catch{await db().query('UPDATE public.mock_registrations SET reminder_lease_until=NULL WHERE mock_id=$1 AND user_id=$2',[mockId,userId]);throw Error('Mock reminder delivery failed');}
}
