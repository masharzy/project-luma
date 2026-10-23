import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "./server";
import { hasAdminRole } from "./policy";
export const requireUser = cache(async () => {
  const { data: session, error } = await auth.getSession();
  if (error || !session?.user) redirect("/auth/sign-in");
  return session.user;
});
export const requireAdmin = cache(async () => {
  const { data: session, error } = await auth.getSession({
    query: { disableCookieCache: "true" },
  });
  if (error || !session?.user) redirect("/auth/sign-in");
  if (!hasAdminRole(session.user)) notFound();
  return session.user;
});
