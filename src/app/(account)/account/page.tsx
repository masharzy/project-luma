import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { SignOut } from "@/components/sign-out";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Page() {
  const { data: session, error } = await auth.getSession();
  if (error || !session?.user) redirect("/auth/sign-in");
  return (
    <section className="status-section">
      <div className="status-sheet">
        <span className="eyebrow">YOUR LUMA ACCOUNT</span>
        <h1>You’re in, {session.user.name || "friend"}.</h1>
        <p lang="bn">তোমার account তৈরি। Practice শুরু করার খবর এখানেই পাবে।</p>
        <div className="account-email">{session.user.email}</div>
        <div className="status-actions">
          <Link className="button" href="/">
            Explore Luma <span>↗</span>
          </Link>
          <SignOut />
        </div>
      </div>
    </section>
  );
}
