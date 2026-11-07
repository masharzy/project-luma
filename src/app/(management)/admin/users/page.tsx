import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { directoryInput, getUserDirectory, getUserSummary, userFilters } from "@/lib/admin/users";
import { Badge, Card, PageHeader, PersonCell, Stat, ago, dhaka } from "@/components/admin/ui";
export const dynamic = "force-dynamic";
const labels = { all: "All", subscribed: "Subscribed", verified: "Verified", unverified: "Unverified", admins: "Admins", blocked: "Blocked" } as const;
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  await requireAdmin();
  const input = directoryInput(await searchParams);
  let directory, summary;
  try { [directory, summary] = await Promise.all([getUserDirectory(input), getUserSummary()]); }
  catch { return <Card><p className="m-0 text-ink">Users could not be loaded. Refresh in a moment.</p></Card>; }
  const href = (page: number, status = input.status) => "/admin/users?" + new URLSearchParams({ q: input.q, status, page: String(page) });
  const th = "px-4 py-3 text-left text-[12px] font-medium text-muted";
  return (
    <div>
      <PageHeader title="Users" sub={`${summary.total.toLocaleString("en-US")} accounts`} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Accounts" value={summary.total.toLocaleString("en-US")} sub={`${summary.joined_week} joined this week`} />
        <Stat label="Subscribed" value={summary.subscribed.toLocaleString("en-US")} sub="Active plan right now" />
        <Stat label="Verified" value={summary.verified.toLocaleString("en-US")} sub={`${summary.total - summary.verified} unverified`} />
        <Stat label="Blocked" value={summary.blocked.toLocaleString("en-US")} />
      </div>
      <Card className="!p-0 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <form action="/admin/users" method="get" className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-bg px-3">
            <Search size={15} aria-hidden="true" className="text-muted" />
            <input type="search" name="q" defaultValue={input.q} maxLength={100} placeholder="Search name or email" aria-label="Search users"
              className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none" />
            <input type="hidden" name="status" value={input.status} />
          </form>
          <nav aria-label="Filter users" className="flex flex-wrap gap-1.5">
            {userFilters.map(s => (
              <Link key={s} href={href(1, s)} aria-current={input.status === s ? "true" : undefined}
                className={`rounded-full border px-3 py-1.5 text-[12px] no-underline ${input.status === s ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink"}`}>
                {labels[s]}
              </Link>
            ))}
          </nav>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead><tr className="border-b border-line"><th className={th}>Learner</th><th className={th}>Plan</th><th className={th}>Status</th><th className={th}>Last seen</th><th className={th}>Joined</th><th className={th}><span className="sr-only">Open</span></th></tr></thead>
            <tbody>
              {directory.users.map(u => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-soft/60">
                  <td className="px-4 py-3"><PersonCell id={u.id} name={u.name} email={u.email} /></td>
                  <td className="px-4 py-3 text-[13px]">{u.plan_name ? <><span className="font-medium text-ink">{u.plan_name}</span><span className="block text-[12px] text-muted">until {dhaka(u.plan_expires_at)}</span></> : <span className="text-muted">Free</span>}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">
                    {u.banned ? <Badge tone="warn">Blocked</Badge> : u.email_verified ? <Badge tone="good">Verified</Badge> : <Badge tone="info">Unverified</Badge>}
                    {u.role === "admin" && <Badge tone="accent">Admin</Badge>}
                  </div></td>
                  <td className="px-4 py-3 text-[13px] text-muted">{ago(u.last_seen)}</td>
                  <td className="px-4 py-3 text-[13px] text-muted">{dhaka(u.created_at)}</td>
                  <td className="px-4 py-3 text-right"><Link href={"/admin/users/" + u.id} aria-label={"Open " + u.name} className="inline-grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-soft hover:text-ink"><ChevronRight size={16} aria-hidden="true" /></Link></td>
                </tr>
              ))}
              {!directory.users.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-[13px] text-muted">No account matches this search.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[12px] text-muted">
          <span>{directory.total ? (directory.page - 1) * directory.pageSize + 1 : 0}–{Math.min(directory.page * directory.pageSize, directory.total)} of {directory.total}</span>
          <div className="flex gap-2">
            {directory.page > 1 && <Link href={href(directory.page - 1)} className="rounded-full border border-line px-3 py-1.5 text-ink no-underline hover:bg-soft">Previous</Link>}
            {directory.page < directory.pages && <Link href={href(directory.page + 1)} className="rounded-full border border-line px-3 py-1.5 text-ink no-underline hover:bg-soft">Next</Link>}
          </div>
        </div>
      </Card>
    </div>
  );
}
