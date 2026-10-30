import { headers } from "next/headers";
import type { Metadata } from "next";
import { site } from "@/config/site";
import { SiteFrame } from "@/components/site-frame";

import "@/styles/marketing.css";
import "@/styles/foundation.css";
import "@/styles/workspace.css";
import "@/styles/cambridge-question-practice.css";
import "@/styles/other-books.css";
import "@/styles/resources-hub.css";
import "@/styles/practice-guides.css";
export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  metadataBase: new URL("https://jumptonine.com"),
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
