import 'server-only';
import { enqueue as send } from '@/lib/jobs/queue';
export const writingTopic='luma-writing-evaluation';
export async function enqueueWriting(id:string){
 await send(writingTopic,{id},{idempotencyKey:'writing:'+id,retentionSeconds:86400});
}
