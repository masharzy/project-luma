"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <section className="status-section">
      <div className="status-sheet">
        <h1>Something didn’t load.</h1>
        <p>Please try again in a moment.</p>
        <button className="button" onClick={reset}>
          Try again ↗
        </button>
      </div>
    </section>
  );
}
