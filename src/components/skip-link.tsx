"use client";

// Moves focus to the main content without adding "#content" to the URL.
export function SkipLink() {
  return (
    <a
      className="skip-link"
      href="#content"
      onClick={(event) => {
        const main = document.getElementById("content");
        if (!main) return;
        event.preventDefault();
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
        main.scrollIntoView();
      }}
    >
      Skip to content
    </a>
  );
}
