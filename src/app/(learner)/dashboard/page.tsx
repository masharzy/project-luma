import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
import { Icon } from "@/components/ui/icon";
export const metadata = { title: "Your dashboard" };
export default async function Page() {
  const user = await requireUser();
  return (
    <>
      <WorkspaceHeading
        eyebrow="YOUR NEXT CHAPTER"
        title={`A fresh page, ${user.name?.split(" ")[0] || "friend"}.`}
        description="আজ একটু এগিয়ে যাও। প্রস্তুতির জায়গাটা তোমার জন্যই।"
      >
        <Link className="button" href="/practice">
          Find your practice <span>↗</span>
        </Link>
      </WorkspaceHeading>
      <div className="dashboard-welcome">
        <div>
          <span className="eyebrow">MAKE A LITTLE ROOM, EVERY DAY</span>
          <h2>
            Small steps.
            <br />
            <em>Real progress.</em>
          </h2>
          <p lang="bn">
            কোন module দিয়ে শুরু করবে? নিজের সময় আর প্রয়োজন অনুযায়ী বেছে নাও।
          </p>
          <Link className="text-link" href="/cambridge">
            Explore Cambridge ↗
          </Link>
        </div>
        <div className="welcome-book" aria-hidden="true">
          <span>LUMA / FIELD NOTES</span>
          <strong>
            YOUR
            <br />
            NEXT
            <br />
            STEP.
          </strong>
          <span>01 — BEGIN WHERE YOU ARE</span>
        </div>
      </div>
      <div className="dashboard-stats">
        {[
          ["Practice history", "No attempts yet", "book"],
          ["Mock registrations", "Nothing scheduled", "clock"],
          ["Published results", "No results yet", "chart"],
        ].map(([label, value, icon]) => (
          <Link
            href={
              icon === "clock"
                ? "/dashboard/mocks"
                : icon === "chart"
                  ? "/dashboard/results"
                  : "/dashboard/practice"
            }
            className="stat-panel"
            key={label}
          >
            <Icon name={icon as "book" | "clock" | "chart"} />
            <span>{label}</span>
            <strong>{value}</strong>
            <span className="stat-arrow">↗</span>
          </Link>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="workspace-panel">
          <div className="panel-heading">
            <h2>Your practice journal</h2>
            <Link href="/dashboard/practice">View history ↗</Link>
          </div>
          <EmptyState
            title="The first entry is yours."
            description="Test শুরু হলে তোমার practice history এখানে জমবে। এখনই পছন্দের module দেখে নিতে পারো।"
            action="Explore practice"
            href="/practice"
          />
        </section>
        <section className="workspace-panel next-steps">
          <span className="eyebrow">WHERE TO NEXT?</span>
          <h2>Find your focus.</h2>
          {[
            ["01", "Cambridge library", "/cambridge"],
            ["02", "Scheduled mock tests", "/mocks"],
            ["03", "Writing & learning resources", "/resources"],
          ].map(([n, title, href]) => (
            <Link href={href} key={href}>
              <span>{n}</span>
              <b>{title}</b>
              <span>↗</span>
            </Link>
          ))}
        </section>
      </div>
    </>
  );
}
