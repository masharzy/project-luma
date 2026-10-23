"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/client";
export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const links = [
    ["/#practice", "Practice"],
    ["/#mocks", "Mock Tests"],
    ["/#resources", "Resources"],
    ["/#access", "Free & Premium"],
  ];
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/" aria-label="Luma IELTS home">
          luma<span>/ IELTS</span>
        </Link>
        <nav
          className={`nav ${open ? "open" : ""}`}
          id="main-navigation"
          aria-label="Main navigation"
        >
          {links.map(([href, label]) => (
            <Link href={href} key={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            href={session?.user ? "/account" : "/auth/sign-in"}
            aria-current={pathname === "/auth/sign-in" ? "page" : undefined}
          >
            {isPending
              ? "Your space ↗"
              : session?.user
                ? "My account ↗"
                : "Sign in ↗"}
          </Link>
          <button
            className="menu-toggle"
            type="button"
            aria-controls="main-navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? "Close ×" : "Menu ☰"}
          </button>
        </div>
      </div>
    </header>
  );
}
