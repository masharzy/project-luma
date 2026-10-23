import Link from "next/link";
import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
export const metadata = { title: "Mocks" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        eyebrow="YOUR SPACE / MOCKS"
        title="Make room for exam day."
      />
      <section className="workspace-panel">
        <div className="panel-heading">
          <h2>Mocks</h2>
          <Link href="/mocks">Explore mock tests ↗</Link>
        </div>
        <EmptyState
          title="Nothing here just yet."
          description="কোনো mock-এ registration করা হয়নি। Published mock available হলে নির্দিষ্ট সময় দেখে register করতে পারবে।"
          icon="clock"
          href="/mocks"
          action="Explore mock tests"
        />
      </section>
    </>
  );
}
