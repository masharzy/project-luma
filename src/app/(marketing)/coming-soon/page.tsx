import Link from "next/link";
export const metadata = {
  title: "Coming soon",
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <section className="status-section">
      <div className="status-sheet">
        <span className="eyebrow">A LITTLE MORE PREPARATION</span>
        <h1>Good things take practice.</h1>
        <p lang="bn">
          Practice test, Cambridge library আর learning resources নিয়ে কাজ হবে
          পরের ধাপে। আপাতত নিজের account খুলে রাখতে পারো।
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
