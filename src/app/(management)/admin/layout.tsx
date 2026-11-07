import "@/styles/admin-refactor.css";
import { requireAdmin } from "@/lib/auth/guards";
import { cookies } from "next/headers";
import { AdminShell } from "@/components/admin-shell";
import { adminTheme } from "@/lib/admin/navigation";
import "@/styles/admin-theme-bridge.css";
import "@/styles/admin-compact.css";
import "@/styles/admin-workflows.css";
import "@/styles/admin-tw.css";
import "@/styles/admin-polish.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
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
    <div className={GeistSans.variable + " " + GeistMono.variable} style={{ display: "contents" }}>
    <AdminShell
      name={user.name || "Administrator"}
      email={user.email}
      initialTheme={theme}
    >
      {children}
    </AdminShell>
    </div>
  );
}
