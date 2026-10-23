import { requireAdmin } from "@/lib/auth/guards";
import { WorkspaceShell } from "@/components/workspace-shell";
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  return (
    <WorkspaceShell
      name={user.name || "Administrator"}
      email={user.email}
      isAdmin
    >
      {children}
    </WorkspaceShell>
  );
}
