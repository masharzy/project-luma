import { headers } from "next/headers";
import type { Metadata } from "next";
import { site } from "@/config/site";
import { SiteFrame } from "@/components/site-frame";

import "@/styles/marketing.css";
import "@/styles/foundation.css";
import "@/styles/workspace.css";
export const metadata: Metadata = {
  title: { default: `${site.name} IELTS`, template: `%s · ${site.name} IELTS` },
  description: site.description,
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await headers(); // Opt into per-request rendering for nonce-based CSP.
  return (
    <html lang="bn">
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
