import Link from "next/link";
import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
export const metadata = { title: "Practice" };
export default function Page() {
  return (
    <>
      <WorkspaceHeading
        eyebrow="YOUR SPACE / PRACTICE"
        title="Your practice journal."
      />
      <section className="workspace-panel">
        <div className="panel-heading">
          <h2>Practice</h2>
          <Link href="/practice">Browse practice ↗</Link>
        </div>
        <EmptyState
          title="Nothing here just yet."
          description="এখনো কোনো practice attempt নেই। Test available হলে এখান থেকে history, module আর progress দেখতে পাবে।"
          icon="book"
          href="/practice"
          action="Browse practice"
        />
      </section>
    </>
  );
}
