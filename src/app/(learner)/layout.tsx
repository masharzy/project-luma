import { requireUser } from "@/lib/auth/guards";
import { LearnerShell } from "@/components/learner-shell";
import "@/styles/student-dashboard.css";
import "@/styles/student-redesign.css";
import "@/styles/dashboard.css";
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <LearnerShell name={user.name || "Learner"}>
      {children}
    </LearnerShell>
  );
}
