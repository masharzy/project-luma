"use client";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";
export function SiteFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const workspace = ["/dashboard", "/admin", "/settings", "/exam"].some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  );
  return workspace ? (
    <main id="content">{children}</main>
  ) : (
    <>
      <Header />
      <main id="content">{children}</main>
      <Footer />
    </>
  );
}
