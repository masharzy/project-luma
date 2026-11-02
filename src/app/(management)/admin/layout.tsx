import "@/styles/admin-refactor.css";
import { requireAdmin } from "@/lib/auth/guards";
import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin-shell";
import { adminTheme } from "@/lib/admin/navigation";
import "@/styles/admin-theme-bridge.css";
import "@/styles/admin-compact.css";
export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const theme = adminTheme((await cookies()).get("jtn_admin_theme")?.value);
  return (
    <AdminShell
      name={user.name || "Administrator"}
      initialTheme={theme}
    >
      {children}
    </AdminShell>
  );
}
