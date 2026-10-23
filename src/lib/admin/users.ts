import "server-only";
import { db } from "@/lib/auth/db";
export const userFilters = ["all", "verified", "unverified", "admins", "blocked"] as const;
export type UserFilter = typeof userFilters[number];
export function directoryInput(input: { q?: string | string[]; status?: string | string[]; page?: string | string[] }) {
  const q = typeof input.q === "string" ? input.q.trim().slice(0, 100) : "";
  const status: UserFilter = userFilters.includes(input.status as UserFilter) ? input.status as UserFilter : "all";
  const page = typeof input.page === "string" && /^\d{1,7}$/.test(input.page) ? Math.max(1, Number(input.page)) : 1;
  return { q, status, page };
}
export type DirectoryUser = { id: string; name: string; email: string; email_verified: boolean; role: string; banned: boolean; created_at: string; has_google: boolean; has_password: boolean };
export async function getUserDirectory(input: ReturnType<typeof directoryInput>) {
  const sql = db();
  const where = `WHERE ($1::text='' OR strpos(lower(u.name),lower($1))>0 OR strpos(u.email,lower($1))>0) AND ($2::text='all' OR ($2='verified' AND u.email_verified=true) OR ($2='unverified' AND u.email_verified=false) OR ($2='admins' AND u.role='admin') OR ($2='blocked' AND u.banned=true))`;
  const counts = await sql.query(`SELECT count(*)::integer AS total FROM app_auth.users u ${where}`, [input.q, input.status]);
  const total = Number(counts[0].total), pageSize = 20;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(input.page, pages);
  const users = await sql.query(`SELECT u.id,u.name,u.email,u.email_verified,u.role,u.banned,u.created_at,(u.password_hash IS NOT NULL) AS has_password,EXISTS(SELECT 1 FROM app_auth.identities i WHERE i.user_id=u.id AND i.provider='google') AS has_google FROM app_auth.users u ${where} ORDER BY u.created_at DESC,u.id DESC LIMIT $3::integer OFFSET $4::integer`, [input.q, input.status, pageSize, (page-1)*pageSize]);
  return { users: users as DirectoryUser[], total, page, pages, pageSize };
}
