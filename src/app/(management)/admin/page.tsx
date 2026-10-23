import Link from "next/link";
import { WorkspaceHeading } from "@/components/page-parts";
import { db } from "@/lib/auth/db";
import { listCambridgeTests } from "@/lib/cambridge";
export const dynamic="force-dynamic";
export default async function Page(){
 const cambridge=await listCambridgeTests(false);
 const [users,content]=await Promise.all([
 db().query("SELECT count(*)::int AS total, count(*) FILTER(WHERE created_at >= date_trunc('day',now()))::int AS today FROM app_auth.users"),
 db().query("SELECT kind,count(*)::int AS total FROM public.admin_content GROUP BY kind")
 ]);
 const count=(kind:string)=>Number(content.find(x=>x.kind===kind)?.total||0);
 const cards=[
 ["Total users",Number(users[0]?.total||0),"/admin/users"],
 ["New users today",Number(users[0]?.today||0),"/admin/users"],
 ["Cambridge tests",cambridge.length,"/admin/cambridge"],
 ["Cambridge books",new Set(cambridge.map(x=>x.bookNumber)).size,"/admin/cambridge"],
 ["Practice tests",count("practice"),"/admin/practice"],
 ["Mock exams",count("mock"),"/admin/mocks"],
 ["Vocabulary entries",count("vocabulary"),"/admin/vocabulary"]
 ] as const;
 return <div className="admin-refactor"><WorkspaceHeading eyebrow="BUSINESS DASHBOARD" title="Platform overview" description="A live snapshot of your learners, content inventory and publishing activity."><Link href="/admin/cambridge" className="button">Manage Cambridge ↗</Link></WorkspaceHeading>
 <div className="admin-kpi-grid">{cards.map(([label,value,href])=><Link href={href} className="admin-kpi" key={label}><span>{label}</span><strong>{value.toLocaleString()}</strong><small>View details ↗</small></Link>)}</div>
 <section className="workspace-panel admin-business-note"><h2>Revenue & purchases</h2><p>Today's purchases, revenue and payment conversion will appear when a verified payment/orders data source is connected. No fabricated sales figures are shown.</p></section>
 <section className="workspace-panel admin-business-note"><h2>Question inventory</h2><p>Standalone question-bank management is removed from the navigation. Module-level questions will be counted once the exam content model is connected.</p></section></div>;
}
