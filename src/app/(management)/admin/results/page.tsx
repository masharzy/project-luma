import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
import { Icon } from "@/components/ui/icon";
export const metadata = { title: "Review & publish results" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        eyebrow="EXAMS / RESULT RELEASE"
        title="Review first. Publish together."
        description="Evaluation শেষ হলে result review করবে। নির্দিষ্ট mock-এর সব result একসঙ্গে publish হবে—শুধু admin-এর action-এ।"
      />
      <div className="release-workflow">
        {[
          ["01", "Submitted", "Learner finishes Writing"],
          ["02", "Evaluating", "Background work completes"],
          ["03", "Ready for review", "Results remain private"],
          ["04", "Published", "Admin releases the full mock"],
        ].map(([n, title, desc]) => (
          <div key={n}>
            <span>{n}</span>
            <h2>{title}</h2>
            <p>{desc}</p>
          </div>
        ))}
      </div>
      <section className="workspace-panel">
        <div className="panel-heading">
          <h2>Unpublished results</h2>
          <button type="button" className="button" disabled>
            <Icon name="lock" size={15} />
            Publish all results
          </button>
        </div>
        <EmptyState
          title="Nothing is waiting for release."
          description="Mock attempt ও evaluation backend connect হলে unpublished result এখানে দেখা যাবে। কোনো score এখন তৈরি বা publish করা হচ্ছে না।"
          icon="chart"
        />
        <div className="admin-integration-note">
          Publishing is unavailable until real mock records and server-side
          authorization are connected. The button never simulates a release.
        </div>
      </section>
    </>
  );
}
