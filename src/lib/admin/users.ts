import "server-only";
import { db } from "@/lib/auth/db";
export const userFilters = ["all", "subscribed", "verified", "unverified", "admins", "blocked"] as const;
export type UserFilter = typeof userFilters[number];
export function directoryInput(input: { q?: string | string[]; status?: string | string[]; page?: string | string[] }) {
  const q = typeof input.q === "string" ? input.q.trim().slice(0, 100) : "";
  const status: UserFilter = userFilters.includes(input.status as UserFilter) ? input.status as UserFilter : "all";
  const page = typeof input.page === "string" && /^\d{1,7}$/.test(input.page) ? Math.max(1, Number(input.page)) : 1;
  return { q, status, page };
}
export type DirectoryUser = { id: string; name: string; email: string; email_verified: boolean; role: string; banned: boolean; created_at: string; has_google: boolean; has_password: boolean; plan_name: string | null; plan_expires_at: string | null; last_seen: string | null };
const activePlan = "EXISTS(SELECT 1 FROM public.evaluation_subscriptions s WHERE s.user_id=u.id AND s.status='active' AND s.starts_at<=now() AND s.expires_at>now())";
export async function getUserDirectory(input: ReturnType<typeof directoryInput>) {
  const sql = db();
  const where = `WHERE ($1::text='' OR strpos(lower(u.name),lower($1))>0 OR strpos(u.email,lower($1))>0) AND ($2::text='all' OR ($2='verified' AND u.email_verified=true) OR ($2='unverified' AND u.email_verified=false) OR ($2='admins' AND u.role='admin') OR ($2='blocked' AND u.banned=true) OR ($2='subscribed' AND ${activePlan}))`;
  const counts = await sql.query(`SELECT count(*)::integer AS total FROM app_auth.users u ${where}`, [input.q, input.status]);
  const total = Number(counts[0].total), pageSize = 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(input.page, pages);
  const users = await sql.query(`SELECT u.id,u.name,u.email,u.email_verified,u.role,u.banned,u.created_at,(u.password_hash IS NOT NULL) AS has_password,EXISTS(SELECT 1 FROM app_auth.identities i WHERE i.user_id=u.id AND i.provider='google') AS has_google,(SELECT s.plan_name FROM public.evaluation_subscriptions s WHERE s.user_id=u.id AND s.status='active' AND s.starts_at<=now() AND s.expires_at>now() LIMIT 1) AS plan_name,(SELECT s.expires_at FROM public.evaluation_subscriptions s WHERE s.user_id=u.id AND s.status='active' AND s.starts_at<=now() AND s.expires_at>now() LIMIT 1) AS plan_expires_at,(SELECT max(x.last_seen_at) FROM app_auth.sessions x WHERE x.user_id=u.id) AS last_seen FROM app_auth.users u ${where} ORDER BY u.created_at DESC,u.id DESC LIMIT $3::integer OFFSET $4::integer`, [input.q, input.status, pageSize, (page-1)*pageSize]);
  return { users: users as DirectoryUser[], total, page, pages, pageSize };
}

export async function getUserSummary() {
  const r = (await db().query(`SELECT count(*)::int total,count(*) FILTER(WHERE u.email_verified)::int verified,count(*) FILTER(WHERE u.banned)::int blocked,count(*) FILTER(WHERE ${activePlan})::int subscribed,count(*) FILTER(WHERE u.created_at>=now()-interval '7 days')::int joined_week FROM app_auth.users u`))[0];
  return r as { total: number; verified: number; blocked: number; subscribed: number; joined_week: number };
}
