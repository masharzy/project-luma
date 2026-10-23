import Link from "next/link";
import { WorkspaceHeading, EmptyState } from "@/components/page-parts";
import { requireAdmin } from "@/lib/auth/guards";
import { directoryInput, getUserDirectory, userFilters } from "@/lib/admin/users";
export const metadata = { title: "Users & access" };
export const dynamic = "force-dynamic";
const labels = { all: "All users", verified: "Verified", unverified: "Unverified", admins: "Admins", blocked: "Blocked" };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireAdmin();
  const input = directoryInput(await searchParams);
  let directory;
  try { directory = await getUserDirectory(input); }
  catch {
    return <><WorkspaceHeading eyebrow="PLATFORM / PEOPLE" title="Users & access" description="Learner account এবং verification status এক জায়গায়।" />
      <section className="workspace-panel"><EmptyState title="User directory is unavailable." description="এই মুহূর্তে account list load করা যাচ্ছে না। আবার চেষ্টা করো।" action="Try again" href="/admin/users" icon="users" /></section></>;
  }
  const href = (page: number) => "/admin/users?" + new URLSearchParams({ q: input.q, status: input.status, page: String(page) });
  return <>
    <WorkspaceHeading eyebrow="PLATFORM / PEOPLE" title="Users & access" description="Account, verification এবং access status দেখো ও প্রয়োজনীয় user খুঁজে নাও।" />
    <section className="workspace-panel admin-table-panel">
      <div className="panel-heading"><h2>User directory</h2><span className="access-pill">{directory.total} {directory.total === 1 ? "USER" : "USERS"}</span></div>
      <form className="catalog-toolbar" action="/admin/users" method="get">
        <label className="search-field"><span className="sr-only">Search name or email</span><input type="search" name="q" defaultValue={input.q} maxLength={100} placeholder="Search name or email…" /></label>
        <label className="search-field"><span className="sr-only">Account filter</span><select name="status" defaultValue={input.status} aria-label="Account filter">{userFilters.map(status => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
        <button className="button" type="submit">Search <span>↗</span></button>
        {(input.q || input.status !== "all") && <Link className="text-link" href="/admin/users">Clear filters</Link>}
      </form>
      <div className="table-scroll"><table><thead><tr><th scope="col">NAME / EMAIL</th><th scope="col">ROLE</th><th scope="col">VERIFICATION</th><th scope="col">ACCESS</th><th scope="col">SIGN-IN</th><th scope="col">JOINED</th></tr></thead>
        <tbody>{directory.users.length ? directory.users.map(user => <tr key={user.id}>
          <td><strong>{user.name}</strong><br /><span>{user.email}</span></td>
          <td><span className="access-pill">{user.role === "admin" ? "Admin" : "Learner"}</span></td>
          <td>{user.email_verified ? "Verified" : "Unverified"}</td>
          <td>{user.banned ? "Blocked" : user.email_verified ? "Active" : "Verification required"}</td>
          <td>{[user.has_google && "Google", user.has_password && "Password"].filter(Boolean).join(" + ") || "Not linked"}</td>
          <td>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "Asia/Dhaka" }).format(new Date(user.created_at))}</td>
        </tr>) : <tr><td colSpan={6}><EmptyState title="No matching users." description="অন্য নাম, email বা filter দিয়ে খুঁজে দেখো।" icon="users" /></td></tr>}</tbody>
      </table></div>
      <div className="catalog-toolbar" aria-label="User directory pagination">
        <span>{directory.total ? (directory.page-1)*directory.pageSize+1 : 0}–{Math.min(directory.page*directory.pageSize,directory.total)} of {directory.total}</span>
        <span>Page {directory.page} of {directory.pages}</span>
        {directory.page > 1 && <Link className="text-link" href={href(directory.page-1)}>← Previous</Link>}
        {directory.page < directory.pages && <Link className="text-link" href={href(directory.page+1)}>Next →</Link>}
      </div>
    </section>
  </>;
}
