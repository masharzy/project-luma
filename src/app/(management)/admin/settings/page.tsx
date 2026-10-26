import { requireAdmin } from "@/lib/auth/guards";
import { WorkspaceHeading } from "@/components/page-parts";
export const metadata = { title: "Platform settings" };
export default async function Page() {
  const user = await requireAdmin();
  return (
    <>
      <WorkspaceHeading
        eyebrow="PLATFORM / SETTINGS"
        title="A few things, kept in order."
        description="বর্তমান access policy আর platform connection-এর অবস্থা।"
      />
      <p><a href="/admin/ai-lab">Open AI evaluation lab — keys, Writing, Speaking and latency benchmarks</a></p>
      <div className="settings-grid">
        <section className="workspace-panel settings-panel">
          <span className="eyebrow">ACCESS CONTROL</span>
          <h2>Administrator</h2>
          <dl className="settings-list">
            <div>
              <dt>Signed in as</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Role source</dt>
              <dd>Luma PostgreSQL</dd>
            </div>
            <div>
              <dt>Role validation</dt>
              <dd>Server-side, uncached</dd>
            </div>
            <div>
              <dt>Public admin signup</dt>
              <dd>Disabled</dd>
            </div>
          </dl>
        </section>
        <section className="workspace-panel settings-panel">
          <span className="eyebrow">CURRENT CONNECTIONS</span>
          <h2>Platform services</h2>
          <dl className="settings-list">
            {[
              ["Authentication", "Connected"],
              ["Content storage API", "Not connected"],
              ["Mock scheduler", "Not connected"],
              ["Evaluation worker", "Not connected"],
              ["Payments", "Not configured"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="security-note">
            AI benchmark credentials can be saved in the AI evaluation lab. Stored credentials are never returned to the browser.
          </p>
        </section>
      </div>
    </>
  );
}
