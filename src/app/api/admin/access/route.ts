import { auth } from "@/lib/auth/server";
import { hasAdminRole } from "@/lib/auth/policy";
export async function GET() {
  const { data: session, error } = await auth.getSession({
    query: { disableCookieCache: "true" },
  });
  const headers = { "Cache-Control": "private, no-store" };
  if (error || !session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (!hasAdminRole(session.user))
    return Response.json({ error: "Forbidden" }, { status: 403, headers });
  return Response.json({ authorized: true }, { headers });
}
