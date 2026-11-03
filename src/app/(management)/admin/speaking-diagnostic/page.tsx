import { requireAdmin } from '@/lib/auth/guards';
export default async function Page(){
 await requireAdmin();
 return <section className="workspace-panel"><h1>Speaking request diagnostic</h1><p>Test your saved recording with the configured OpenRouter model. Each button submission makes one provider request.</p><form action="/api/admin/speaking-diagnostic" method="post"><label>Attempt ID <input name="attemptId" required pattern="[a-f0-9-]{36}" /></label><label>Test <select name="mode"><option value="plain">One clip · plain transcription</option><option value="json">One clip · JSON transcription</option><option value="full">All clips · original evaluation request</option></select></label><button type="submit">Run diagnostic</button></form></section>;
}
