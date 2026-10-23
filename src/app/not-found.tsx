import Link from "next/link";
export default function NotFound() {
  return (
    <section className="status-section">
      <div className="status-sheet">
        <span className="eyebrow">404 / A DIFFERENT PAGE</span>
        <h1>Let’s find your way back.</h1>
        <p>This page isn’t here. Your next step is.</p>
        <Link className="button" href="/">
          Back to home <span>↗</span>
        </Link>
      </div>
    </section>
  );
}
