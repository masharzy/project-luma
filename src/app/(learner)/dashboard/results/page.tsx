import Link from "next/link";
import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
export const metadata = { title: "Results" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        eyebrow="YOUR SPACE / RESULTS"
        title="A clearer picture of your progress."
      />
      <section className="workspace-panel">
        <div className="panel-heading">
          <h2>Results</h2>
          <Link href="/practice">Explore practice ↗</Link>
        </div>
        <EmptyState
          title="Results stay private until published."
          description="এখনো কোনো result প্রকাশিত হয়নি। Mock শেষ হলেও admin publish করার আগে result এখানে দেখা যাবে না।"
          icon="chart"
          href="/practice"
          action="Explore practice"
        />
      </section>
    </>
  );
}
