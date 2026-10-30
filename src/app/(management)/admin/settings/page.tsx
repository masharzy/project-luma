import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { WorkspaceHeading } from "@/components/page-parts";
import { db } from "@/lib/auth/db";
import { keyStatus } from "@/lib/ai-lab/secrets";
export const dynamic="force-dynamic";
export const metadata = { title: "Platform settings" };
export default async function Page(){
 const user=await requireAdmin();
 const [dbHealth,keys]=await Promise.all([
  db().query("SELECT (SELECT count(*)::int FROM public.mock_events) AS mocks,(SELECT count(*)::int FROM public.writing_evaluations WHERE status IN ('pending','running')) AS writing_pending,(SELECT count(*)::int FROM public.speaking_evaluations WHERE status IN ('pending','running')) AS speaking_pending"),
  keyStatus().catch(()=>null)
 ]);
 const state=dbHealth[0]||{};
 const rows=[
  ["Authentication","Connected (verified sessions)"],
  ["PostgreSQL content","Connected (live query)"],
  ["Mock scheduler",Number(state.mocks||0)+" scheduled events in database"],
  ["Writing queue",Number(state.writing_pending||0)+" active jobs; worker connectivity not confirmed"],
  ["Speaking queue",Number(state.speaking_pending||0)+" active jobs; worker connectivity not confirmed"],
  ["AI OpenRouter",(keys?.openrouter&&keys?.vaultReady)?"Key stored securely":"Not verified/configured"],
  ["AI Google",(keys?.google&&keys?.vaultReady)?"Key stored securely":"Not verified/configured"],
  ["Cloudflare R2","No live media health probe configured"],
  ["Payments","No gateway/transaction records configured"]
 ];
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="PLATFORM / SETTINGS" title="Platform status" description="Database-backed counts. Unknown external integrations are labeled as unverified, not presented as live."/>
  <div className="settings-grid">
   <section className="workspace-panel settings-panel"><span className="eyebrow">ADMINISTRATION</span><h2>Account & security</h2><dl className="settings-list"><div><dt>Signed in</dt><dd>{user.email}</dd></div><div><dt>Role</dt><dd>Server-validated administrator</dd></div><div><dt>Public admin signup</dt><dd>Disabled</dd></div></dl><Link href="/admin/users">Manage users ↗</Link></section>
   <section className="workspace-panel settings-panel"><span className="eyebrow">CONNECTION HEALTH</span><h2>Platform services</h2><dl className="settings-list">{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="security-note">Provider credentials are never returned to the browser. Counts do not prove queue delivery or external media availability.</p><Link href="/admin/ai-lab">Manage AI credentials ↗</Link></section>
  </div></div>;
}
