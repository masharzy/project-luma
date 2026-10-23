import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { readAccountSession } from "./session";
import { hasAdminRole } from "./policy";
export const requireUser = cache(async () => {
  const session = await readAccountSession();
  if (!session?.user) redirect("/auth/sign-in");
  if (!session.user.emailVerified) redirect("/auth/verify-email");
  return session.user;
});
export const requireAdmin = cache(async () => {
  const session = await readAccountSession();
  if (!session?.user) redirect("/auth/sign-in");
  if (!session.user.emailVerified) redirect("/auth/verify-email");
  if (!hasAdminRole(session.user)) notFound();
  return session.user;
});
