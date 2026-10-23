import { requireUser } from "@/lib/auth/guards";
import { WorkspaceShell } from "@/components/workspace-shell";
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <WorkspaceShell name={user.name || "Learner"} email={user.email}>
      {children}
    </WorkspaceShell>
  );
}
