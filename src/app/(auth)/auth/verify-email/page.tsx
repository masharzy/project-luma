import { VerifyEmailForm } from "@/components/verify-email-form";
import { readAccountSession } from "@/lib/auth/session";
import { verificationResendAt } from "@/lib/auth/verification";
import { redirect } from "next/navigation";
export const metadata = { title: "Verify email", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const session = await readAccountSession();
  if (!token && !session) redirect("/auth/sign-in");
  return <VerifyEmailForm token={token} email={token && session?.user.emailVerified ? undefined : session?.user.email}
    initialVerified={!token && session?.user.emailVerified === true}
    initialResendAt={session && !session.user.emailVerified ? await verificationResendAt(session.user.id) : 0} />;
}
