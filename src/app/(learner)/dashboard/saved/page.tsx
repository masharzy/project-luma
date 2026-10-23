import Link from "next/link";
import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
export const metadata = { title: "Saved" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        eyebrow="YOUR SPACE / SAVED"
        title="Keep the good pages close."
      />
      <section className="workspace-panel">
        <div className="panel-heading">
          <h2>Saved</h2>
          <Link href="/resources">Explore resources ↗</Link>
        </div>
        <EmptyState
          title="Nothing here just yet."
          description="এখনো কোনো resource save করা নেই। Resource library চালু হলে প্রয়োজনের লেখা আর ebook এখানে রাখতে পারবে।"
          icon="heart"
          href="/resources"
          action="Explore resources"
        />
      </section>
    </>
  );
}
