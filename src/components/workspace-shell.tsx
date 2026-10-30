"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOut } from "./sign-out";
import { Icon } from "./ui/icon";
const learner = [
  ["/writing-evaluation", "Writing Evaluation", "pen"],
  ["/speaking-evaluation", "Speaking Evaluation", "headphones"],
  ["/dashboard", "Overview", "grid"],
  ["/dashboard/practice", "My practice", "book"],
  ["/dashboard/mocks", "My mocks", "clock"],
  ["/dashboard/results", "Results", "chart"],
  ["/dashboard/saved", "Saved resources", "heart"],
  ["/dashboard/subscription", "My subscription", "chart"],
  ["/settings", "Settings", "settings"],
];
const admin = [
  ["/admin", "Overview", "grid"],
  ["/admin/cambridge", "Cambridge", "book"],
  ["/admin/other-books", "More Books", "book"],
  ["/admin/practice", "Practice tests", "file"],
  ["/admin/import", "Import tests", "file"],
  ["/admin/mocks", "Mock exams", "clock"],
  ["/admin/results", "Results review", "chart"],
  ["/admin/vocabulary", "Vocabulary", "book"],
  ["/admin/resources", "Learning resources", "pen"],
  ["/admin/speaking-tests", "Speaking question bank", "file"],
  ["/admin/subscriptions", "Plans & subscriptions", "chart"],
  ["/admin/evaluations", "Account overrides", "chart"],
  ["/admin/ai-operations", "AI operations", "chart"],
  ["/admin/users", "Users & access", "users"],
  ["/admin/activity", "Activity log", "clock"],
  ["/admin/ai-lab", "AI evaluation lab", "chart"],
  ["/admin/settings", "Settings", "settings"],
];
export function WorkspaceShell({
  children,
  name,
  email,
  isAdmin = false,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
  isAdmin?: boolean;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const links = isAdmin ? admin : learner;
  return (
    <div className={`workspace ${isAdmin ? "admin-workspace" : ""}`}>
      <aside className={`workspace-sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Link className="brand" href="/">
            JumpToNine
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>
        <span className="sidebar-label">
          {isAdmin ? "MANAGE YOUR PLATFORM" : "YOUR PRACTICE SPACE"}
        </span>
        <nav aria-label={isAdmin ? "Administration" : "Dashboard"}>
          {links.map(([href, label, icon]) => {
            const active =
              path === href ||
              (href !== "/admin" &&
                href !== "/dashboard" &&
                path.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={active ? "selected" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon
                  name={icon as React.ComponentProps<typeof Icon>["name"]}
                />
                <span>{label}</span>
                {active && <span className="sidebar-current">↗</span>}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {!isAdmin ? (
            <div className="sidebar-note">
              <span className="eyebrow">A LITTLE MORE ROOM</span>
              <h3>Keep moving forward.</h3>
              <Link href="/pricing">Explore Premium ↗</Link>
            </div>
          ) : null}
          <Link className="sidebar-home" href={isAdmin ? "/dashboard" : "/"}>
            ← {isAdmin ? "Learner dashboard" : "Back to website"}
          </Link>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <div className="workspace-main">
        <header className="workspace-topbar">
          <button
            type="button"
            className="workspace-menu"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            ☰ <span>Menu</span>
          </button>
          <span className="workspace-context">
            {isAdmin ? "PLATFORM / ADMINISTRATION" : "JUMPTONINE / YOUR NEXT CHAPTER"}
          </span>
          <div className="workspace-identity">
            <span className="avatar">
              {name.slice(0, 1).toUpperCase() || "L"}
            </span>
            <span>
              <b>{name}</b>
              <small>{isAdmin ? "Administrator" : email}</small>
            </span>
            <Link href="/account" aria-label="Account settings">
              <Icon name="settings" size={17} />
            </Link>
          </div>
        </header>
        <div className="workspace-content">{children}</div>
        <footer className="workspace-footer">
          <span>One step at a time.</span>
          <SignOut />
        </footer>
      </div>
    </div>
  );
}
