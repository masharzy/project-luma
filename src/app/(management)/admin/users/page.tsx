import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
export const metadata = { title: "Users & access" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        eyebrow="PLATFORM / PEOPLE"
        title="The people behind the progress."
        description="Learner account আর access management-এর জায়গা।"
      />
      <section className="workspace-panel">
        <div className="panel-heading">
          <h2>User directory</h2>
          <span className="access-pill">PROTECTED DATA</span>
        </div>
        <EmptyState
          title="Identity management stays with Neon Auth."
          description="এই page-এ এখন user directory API সংযুক্ত হয়নি। কোনো email list বা personal data browser-এ পাঠানো হচ্ছে না। Role change-ও এই interface থেকে চালু করা হয়নি।"
          icon="users"
        />
      </section>
      <div className="admin-status-strip">
        <strong>Least privilege, always.</strong>
        <span>
          New accounts do not receive admin access. Roles cannot be changed
          through profile fields or browser storage.
        </span>
      </div>
    </>
  );
}
