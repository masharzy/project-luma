import Link from "next/link";
export const metadata = {
  title: "Coming soon",
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <section className="status-section">
      <div className="status-sheet">
        <span className="eyebrow">COMING SOON</span>
        <h1>This page is not ready yet.</h1>
        <p>
          Practice tests, the Cambridge library and learning resources are coming next. You can create an account now.
        </p>
        <div className="status-actions">
          <Link href="/auth/sign-up" className="button">
            Create your account <span>↗</span>
          </Link>
          <Link href="/" className="text-link">
            Back to home ↗
          </Link>
        </div>
      </div>
    </section>
  );
}
