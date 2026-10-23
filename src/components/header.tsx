"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";

const learnLinks = [
  ["/resources", "All resources", "Your learning shelf"],
  ["/resources/writing", "Writing samples", "Learn from a well-written answer"],
  ["/vocabulary", "Vocabulary", "Find the right words"],
  ["/grammar", "Grammar", "Build better sentences"],
  ["/resources/ebooks", "Ebooks", "A little reading, a little progress"],
  ["/blog", "Journal", "Ideas for your preparation"],
];
const mainLinks = [
  ["/practice", "Practice"],
  ["/cambridge", "Cambridge"],
  ["/mocks", "Mock Tests"],
];
export function Header() {
  const [open, setOpen] = useState(false);
  const [learn, setLearn] = useState(false);
  const pathname = usePathname();
  const header = useRef<HTMLElement>(null);
  const learnButton = useRef<HTMLButtonElement>(null);
  const { data: session, isPending } = authClient.useSession();
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (!header.current?.contains(e.target as Node)) {
        setLearn(false);
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  const close = () => {
    setOpen(false);
    setLearn(false);
  };
  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  return (
    <header
      ref={header}
      className="site-header upgraded-header"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          close();
          learnButton.current?.focus();
        }
      }}
    >
      <div className="container header-inner">
        <Link
          className="brand"
          href="/"
          aria-label="Luma IELTS home"
          onClick={close}
        >
          luma<span>/ IELTS</span>
        </Link>
        <nav
          className={`nav ${open ? "open" : ""}`}
          id="main-navigation"
          aria-label="Main navigation"
        >
          <Link
            href="/free"
            className={active("/free") ? "active free-nav" : "free-nav"}
            onClick={close}
          >
            Start free <span>↗</span>
          </Link>
          {mainLinks.map(([href, label]) => (
            <Link
              href={href}
              key={href}
              className={active(href) ? "active" : ""}
              aria-current={active(href) ? "page" : undefined}
              onClick={close}
            >
              {label}
            </Link>
          ))}
          <div className="learn-navigation">
            <button
              ref={learnButton}
              type="button"
              aria-expanded={learn}
              aria-controls="learn-navigation"
              className={
                learnLinks.some(([href]) => active(href))
                  ? "nav-learn active"
                  : "nav-learn"
              }
              onClick={() => setLearn((v) => !v)}
            >
              Learn <span aria-hidden="true">{learn ? "−" : "+"}</span>
            </button>
            <div
              id="learn-navigation"
              className="learn-dropdown"
              hidden={!learn}
            >
              <span className="dropdown-label">MAKE ROOM FOR LEARNING</span>
              {learnLinks.map(([href, label, description]) => (
                <Link href={href} key={href} onClick={close}>
                  <span>
                    <b>{label}</b>
                    <small>{description}</small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </div>
          <Link
            href="/pricing"
            className={active("/pricing") ? "active" : ""}
            onClick={close}
          >
            Premium
          </Link>
        </nav>
        <div className="header-actions">
          <Link
            className="button nav-signin"
            href={session?.user ? "/dashboard" : "/auth/sign-in"}
            onClick={close}
          >
            {isPending ? "Your space" : session?.user ? "Dashboard" : "Sign in"}
            <span aria-hidden="true">↗</span>
          </Link>
          <button
            className="menu-toggle"
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-controls="main-navigation"
            aria-expanded={open}
            onClick={() => {
              setOpen((v) => !v);
              setLearn(false);
            }}
          >
            {open ? "Close ×" : "Menu ☰"}
          </button>
        </div>
      </div>
    </header>
  );
}
