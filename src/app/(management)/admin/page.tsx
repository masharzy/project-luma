import Link from "next/link";
import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
import { Icon } from "@/components/ui/icon";
export const metadata = { title: "Admin overview" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        eyebrow="PLATFORM / OVERVIEW"
        title="Set the next chapter in motion."
        description="Question, practice test, mock schedule আর learning content—এক জায়গা থেকে গোছাও।"
      >
        <Link href="/admin/questions/new" className="button">
          Draft a question <span>+</span>
        </Link>
      </WorkspaceHeading>
      <div className="admin-status-strip">
        <Icon name="shield" />
        <b>Restricted workspace</b>
        <span>
          Admin role verified by Luma Auth. Content services are not connected
          yet.
        </span>
      </div>
      <div className="admin-overview-grid">
        {[
          ["Question bank", "book", "/admin/questions"],
          ["Practice library", "file", "/admin/tests"],
          ["Scheduled mocks", "clock", "/admin/mocks"],
          ["Results & publishing", "chart", "/admin/results"],
        ].map(([label, icon, href]) => (
          <Link href={href} className="admin-overview-card" key={href}>
            <Icon name={icon as "book" | "file" | "clock" | "chart"} />
            <h2>{label}</h2>
            <p>No published content</p>
            <span>Open workspace ↗</span>
          </Link>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="workspace-panel">
          <div className="panel-heading">
            <h2>Ready for your first collection</h2>
          </div>
          <EmptyState
            title="A clean slate."
            description="এখনো কোনো content service connect করা হয়নি। Authoring form-এ draft করে export করা যাবে; published content বা real result দেখানো হচ্ছে না।"
            href="/admin/questions/new"
            action="Open question draft"
          />
        </section>
        <section className="workspace-panel admin-release">
          <span className="eyebrow">RESULT RELEASE POLICY</span>
          <h2>
            Review first.
            <br />
            Publish together.
          </h2>
          <p lang="bn">
            AI evaluation শেষ হলেও result private থাকবে। নির্দিষ্ট mock-এর সব
            result admin publish করলেই learner দেখতে পাবে।
          </p>
          <Link href="/admin/results" className="text-link">
            Results workspace ↗
          </Link>
        </section>
      </div>
    </>
  );
}
