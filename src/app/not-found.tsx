import Link from "next/link";
export default function NotFound() {
  return (
    <section className="status-section">
      <div className="status-sheet">
        <span className="eyebrow">404</span>
        <h1>Page not found</h1>
        <p>This page does not exist or has moved.</p>
        <Link className="button" href="/">
          Back to home <span>↗</span>
        </Link>
      </div>
    </section>
  );
}
